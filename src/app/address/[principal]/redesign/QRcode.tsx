import { useColorMode } from '@/components/ui/color-mode';
import { Box, BoxProps, ClientOnly } from '@chakra-ui/react';
import vkQr from '@vkontakte/vk-qr';
import * as React from 'react';

export const QRcode = ({
  address,
  size,
  showLogo,
  ...rest
}: { address: string; size?: number; showLogo?: boolean } & BoxProps) => {
  const { colorMode } = useColorMode();

  const qrSvg = React.useMemo(
    () =>
      vkQr.createQR(address, {
        qrSize: size || 256,
        isShowLogo: showLogo ? true : false,
        logoData: '/stx-square.svg',
        foregroundColor: colorMode === 'light' ? 'black' : 'white',
      }),
    [address, colorMode, size, showLogo]
  );

  const qr = <Box dangerouslySetInnerHTML={{ __html: qrSvg }} />;

  return (
    <ClientOnly>
      <Box position="relative" mx="auto" {...rest}>
        {qr}
      </Box>
    </ClientOnly>
  );
};
