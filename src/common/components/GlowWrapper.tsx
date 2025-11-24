'use client';

import { Box } from '@chakra-ui/react';

export const GlowWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box position="relative">
      <Box
        style={{
          filter: 'blur(9px)',
          borderRadius: '16px',
          objectFit: 'cover', // ensures the image maintains its aspect ratio while covering the entire container, cropping if necessary to maintain the 1:1 ratio
        }}
      >
        {children}
      </Box>
      <Box position="absolute" top={0} left={0} right={0} bottom={0} borderRadius="16px" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
};
