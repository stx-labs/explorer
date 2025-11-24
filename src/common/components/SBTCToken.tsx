import { SBTCTokenIcon } from '@/ui/icons/sBTCTokenIcon';
import { Icon, IconProps } from '@chakra-ui/react';

export const SBTCToken = (iconProps: IconProps) => {
  return (
    <Icon className="sbtc-token" {...iconProps}>
      <SBTCTokenIcon stopColor="var(--stacks-colors-sbtc-token-stop-color)" />
    </Icon>
  );
};
