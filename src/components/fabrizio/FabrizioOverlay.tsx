'use client';

import { FABRIZIO_ADDRESSES, FABRIZIO_POLL_INTERVAL } from '@/common/constants/constants';
import { useFabrizio } from '@/common/context/FabrizioContext';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useAddressTxs } from '@/common/queries/useAddressConfirmedTxsWithTransfersInfinite';
import { buildUrl } from '@/common/utils/buildUrl';
import { Box } from '@chakra-ui/react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MempoolTransaction, Transaction } from '@stacks/stacks-blockchain-api-types';

interface FloatingFabrizio {
  id: string;
  txId: string;
  top: number; // percentage (5-90)
  left: number; // percentage (5-90)
  size: number; // random size in pixels (60-140)
}

export function FabrizioOverlay() {
  const { isEnabled } = useFabrizio();
  const { activeNetwork } = useGlobalContext();
  const { resolvedTheme } = useTheme();
  const [floatingFabrizios, setFloatingFabrizios] = useState<FloatingFabrizio[]>([]);
  const seenTxIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);

  // Select image based on theme (resolvedTheme is 'light' or 'dark', defaults to 'light' if undefined)
  const fabrizioImage = resolvedTheme === 'dark' ? '/fabrizio-night.jpg' : '/fabrizio.jpg';

  // Query both Fabrizio addresses
  // Use a separate query with limit 5 to catch multiple new transactions
  // Smaller limit reduces timeout risk while still catching new transactions
  const {
    data: transactionsData1,
    isLoading: isLoading1,
    isError: isError1,
  } = useAddressTxs(FABRIZIO_ADDRESSES[0], 5, 0, {
    enabled: isEnabled,
    refetchInterval: isEnabled ? FABRIZIO_POLL_INTERVAL : false,
    retry: false,
    staleTime: 0, // Always consider stale to allow refetching
  });

  const {
    data: transactionsData2,
    isLoading: isLoading2,
    isError: isError2,
  } = useAddressTxs(FABRIZIO_ADDRESSES[1], 5, 0, {
    enabled: isEnabled,
    refetchInterval: isEnabled ? FABRIZIO_POLL_INTERVAL : false,
    retry: false,
    staleTime: 0, // Always consider stale to allow refetching
  });

  // Merge results from both addresses
  const transactionsData = useMemo(() => {
    if (transactionsData1?.results || transactionsData2?.results) {
      return {
        results: [...(transactionsData1?.results || []), ...(transactionsData2?.results || [])],
        total: (transactionsData1?.total || 0) + (transactionsData2?.total || 0),
      };
    }
    return undefined;
  }, [transactionsData1, transactionsData2]);
  const isLoading = isLoading1 || isLoading2;
  const isError = isError1 || isError2;

  useEffect(() => {
    if (!isEnabled) {
      isInitialLoad.current = true;
      return;
    }

    // If query is still loading, errored, or has no data, don't process
    if (isLoading || isError || !transactionsData?.results) {
      return;
    }

    const transactions = transactionsData.results || [];

    // useAddressTxs maps v2Response.results.map(item => item.tx)
    // So each transaction should be a Transaction or MempoolTransaction object with tx_id directly on it
    // Find new transactions (deduplicate by tx_id since both addresses might have the same tx)
    const uniqueTransactions = Array.from(
      new Map(transactions.map(tx => [tx?.tx_id, tx])).values()
    );
    const newTransactions = uniqueTransactions.filter(tx => {
      const txId = tx?.tx_id;
      return txId && !seenTxIds.current.has(txId);
    });

    // On initial load, just record the transaction IDs without spawning bubbles
    if (isInitialLoad.current) {
      newTransactions.forEach(tx => {
        if (tx.tx_id) {
          seenTxIds.current.add(tx.tx_id);
        }
      });
      isInitialLoad.current = false;
      return;
    }

    // For subsequent polls, spawn bubbles for new transactions
    newTransactions.forEach(tx => {
      if (tx.tx_id) {
        seenTxIds.current.add(tx.tx_id);

        // Spawn a bubble at a random position (5% to 90% for both top and left)
        const randomTop = 5 + Math.random() * 85; // 5% to 90%
        const randomLeft = 5 + Math.random() * 85; // 5% to 90%
        // Random size between 60px and 140px
        const randomSize = 60 + Math.random() * 80; // 60px to 140px

        const newFabrizio: FloatingFabrizio = {
          id: `${tx.tx_id}-${Date.now()}`,
          txId: tx.tx_id,
          top: randomTop,
          left: randomLeft,
          size: randomSize,
        };

        // Add to state and keep it forever (accumulate)
        setFloatingFabrizios(prev => [...prev, newFabrizio]);
      }
    });
  }, [isEnabled, transactionsData, isLoading, isError]);

  if (!isEnabled) {
    return null;
  }

  const handleBubbleClick = (txId: string) => {
    const url = buildUrl(`/txid/${txId}`, activeNetwork);
    window.open(url, '_blank');
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={9999}
      pointerEvents="none"
      overflow="hidden"
    >
      {floatingFabrizios.map(fabrizio => (
        <motion.img
          key={fabrizio.id}
          src={fabrizioImage}
          alt="Fabrizio"
          onClick={() => handleBubbleClick(fabrizio.txId)}
          style={{
            position: 'absolute',
            top: `${fabrizio.top}%`,
            left: `${fabrizio.left}%`,
            width: `${fabrizio.size}px`,
            height: `${fabrizio.size}px`,
            borderRadius: '50%',
            border: '1px solid #F97316',
            boxShadow: '0 0 5px rgba(249, 115, 22, 0.3)',
            objectFit: 'cover',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{
            scale: 1.2,
            boxShadow: '0 0 30px rgba(249, 115, 22, 0.8), 0 0 60px rgba(249, 115, 22, 0.4)',
          }}
          transition={{
            duration: 0.3,
            ease: 'easeOut',
          }}
        />
      ))}
    </Box>
  );
}
