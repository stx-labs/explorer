'use client';

import { useBtcStacking } from '@/common/context/BtcStackingContext';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'motion/react';

export function BtcStackingOverlay() {
  const { isEnabled, currentAnswer, randomizeAnswer, toggle } = useBtcStacking();

  if (!isEnabled || !currentAnswer) {
    return null;
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={10000}
      pointerEvents="auto"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="rgba(0, 0, 0, 0.7)"
    >
      <Stack
        alignItems="center"
        justifyContent="center"
        gap={6}
        maxW="90%"
        textAlign="center"
        onClick={e => e.stopPropagation()}
        cursor="default"
      >
        {/* Quote text with quotation marks - only this animates */}
        <Box
          minHeight={{ base: '6rem', md: '8rem', lg: '10rem' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="100%"
          px={4}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAnswer}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ width: '100%' }}
            >
              <Text
                fontSize="clamp(1.5rem, 8vw, 8rem)"
                fontWeight="bold"
                color="orange.500"
                textShadow="0 0 40px rgba(249, 115, 22, 0.8), 0 0 80px rgba(249, 115, 22, 0.6)"
                fontFamily="var(--font-instrument-sans)"
                letterSpacing="0.05em"
                lineHeight="1.2"
                wordBreak="break-word"
                maxWidth="100%"
              >
                "{currentAnswer}"
              </Text>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Muneeb's image and attribution */}
        <Flex direction="column" alignItems="center" gap={3}>
          <Box
            position="relative"
            width={{ base: '120px', md: '150px', lg: '180px' }}
            height={{ base: '120px', md: '150px', lg: '180px' }}
            borderRadius="full"
            border="2px solid"
            borderColor="orange.500"
            boxShadow="0 0 20px rgba(249, 115, 22, 0.6)"
            overflow="hidden"
          >
            <img
              src="/muneeb.jpg"
              alt="Muneeb Ali"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          </Box>
          <Text
            fontSize={{ base: '1.25rem', md: '1.5rem', lg: '1.75rem' }}
            fontWeight="medium"
            color="orange.400"
            fontFamily="var(--font-instrument-sans)"
          >
            — Muneeb Ali
          </Text>
        </Flex>

        {/* Action buttons */}
        <Flex direction="column" alignItems="center" gap={4} mt={4}>
          <Text
            as="button"
            onClick={randomizeAnswer}
            fontSize={{ base: '1rem', md: '1.25rem', lg: '1.5rem' }}
            fontWeight="medium"
            color="orange.300"
            fontFamily="var(--font-instrument-sans)"
            cursor="pointer"
            _hover={{
              color: 'orange.400',
              textShadow: '0 0 10px rgba(249, 115, 22, 0.6)',
            }}
            transition="all 0.2s"
          >
            🤔 Are you sure Muneeb?
          </Text>
          <Text
            as="button"
            onClick={toggle}
            fontSize={{ base: '1.25rem', md: '1.5rem', lg: '1.75rem' }}
            fontWeight="bold"
            color="orange.400"
            fontFamily="var(--font-instrument-sans)"
            cursor="pointer"
            _hover={{
              color: 'orange.300',
              textShadow: '0 0 15px rgba(249, 115, 22, 0.8)',
            }}
            transition="all 0.2s"
          >
            🚀🌕 OK! I am a believer!
          </Text>
        </Flex>
      </Stack>
    </Box>
  );
}
