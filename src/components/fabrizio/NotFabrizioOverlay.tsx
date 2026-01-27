'use client';

import { FABRIZIO_ADDRESSES, FABRIZIO_POLL_INTERVAL } from '@/common/constants/constants';
import { useFabrizio } from '@/common/context/FabrizioContext';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useConfirmedTransactions } from '@/common/queries/useConfirmedTransactionsInfinite';
import { buildUrl } from '@/common/utils/buildUrl';
import { Box } from '@chakra-ui/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { Transaction } from '@stacks/stacks-blockchain-api-types';

interface FloatingNotFabrizio {
  id: string;
  txId: string;
  top: number; // percentage (5-90)
  left: number; // percentage (5-90)
  size: number; // random size in pixels (60-140)
}

export function NotFabrizioOverlay() {
  const { isEnabled, showNotFabrizio } = useFabrizio();
  const { activeNetwork } = useGlobalContext();
  const [floatingNotFabrizios, setFloatingNotFabrizios] = useState<FloatingNotFabrizio[]>([]);
  const seenTxIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);

  // Fetch all recent transactions (limit 10 to catch new ones)
  const {
    data: transactionsData,
    isLoading,
    isError,
  } = useConfirmedTransactions(
    10,
    0,
    {},
    {
      enabled: isEnabled && showNotFabrizio,
      refetchInterval: isEnabled && showNotFabrizio ? FABRIZIO_POLL_INTERVAL : false,
      retry: false,
      staleTime: 0, // Always consider stale to allow refetching
    }
  );

  useEffect(() => {
    if (!isEnabled || !showNotFabrizio) {
      isInitialLoad.current = true;
      return;
    }

    // If query is still loading, errored, or has no data, don't process
    if (isLoading || isError || !transactionsData?.results) {
      return;
    }

    const transactions = transactionsData.results || [];

    // Filter out Fabrizio's transactions (from both addresses) and find new ones
    const newTransactions = transactions.filter((tx: Transaction) => {
      // Skip transactions from either of Fabrizio's addresses
      if (
        tx.sender_address === FABRIZIO_ADDRESSES[0] ||
        tx.sender_address === FABRIZIO_ADDRESSES[1]
      ) {
        return false;
      }

      const txId = tx?.tx_id;
      return txId && !seenTxIds.current.has(txId);
    });

    // On initial load, just record the transaction IDs without spawning bubbles
    if (isInitialLoad.current) {
      newTransactions.forEach((tx: Transaction) => {
        if (tx.tx_id) {
          seenTxIds.current.add(tx.tx_id);
        }
      });
      isInitialLoad.current = false;
      return;
    }

    // For subsequent polls, spawn bubbles for new transactions
    newTransactions.forEach((tx: Transaction) => {
      if (tx.tx_id) {
        seenTxIds.current.add(tx.tx_id);

        // Spawn a bubble at a random position (5% to 90% for both top and left)
        const randomTop = 5 + Math.random() * 85; // 5% to 90%
        const randomLeft = 5 + Math.random() * 85; // 5% to 90%
        // Random size between 60px and 140px
        const randomSize = 60 + Math.random() * 80; // 60px to 140px

        const newNotFabrizio: FloatingNotFabrizio = {
          id: `${tx.tx_id}-${Date.now()}`,
          txId: tx.tx_id,
          top: randomTop,
          left: randomLeft,
          size: randomSize,
        };

        // Add to state and keep it forever (accumulate)
        setFloatingNotFabrizios(prev => [...prev, newNotFabrizio]);
      }
    });
  }, [isEnabled, showNotFabrizio, transactionsData, isLoading, isError]);

  if (!isEnabled || !showNotFabrizio) {
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
      zIndex={9998}
      pointerEvents="none"
      overflow="hidden"
    >
      {floatingNotFabrizios.map(notFabrizio => (
        <motion.img
          key={notFabrizio.id}
          src="/notfabrizio.jpg"
          alt="Not Fabrizio"
          onClick={() => handleBubbleClick(notFabrizio.txId)}
          style={{
            position: 'absolute',
            top: `${notFabrizio.top}%`,
            left: `${notFabrizio.left}%`,
            width: `${notFabrizio.size}px`,
            height: `${notFabrizio.size}px`,
            borderRadius: '50%',
            border: '1px solid #6B7280',
            boxShadow: '0 0 5px rgba(107, 114, 128, 0.3)',
            objectFit: 'cover',
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{
            scale: 1.2,
            boxShadow: '0 0 30px rgba(107, 114, 128, 0.8), 0 0 60px rgba(107, 114, 128, 0.4)',
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
