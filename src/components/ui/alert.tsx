import { Alert as ChakraAlert, Icon, Stack } from '@chakra-ui/react';
import * as React from 'react';

import { CloseButton } from './close-button';

export interface AlertProps extends Omit<ChakraAlert.RootProps, 'title'> {
  startElement?: React.ReactNode;
  endElement?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactElement;
  closable?: boolean;
  onClose?: () => void;
  alertBg?: string;
  alertIconColor?: string;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  const {
    title,
    description,
    icon,
    closable,
    onClose,
    startElement,
    endElement,
    alertBg,
    alertIconColor,
    status,
    ...rest
  } = props;
  return (
    <ChakraAlert.Root ref={ref} status={status} alignItems="stretch" {...rest}>
      {startElement}
      {icon && (
        <ChakraAlert.Indicator alignSelf="stretch" display="flex" alignItems="center">
          <Icon h={4} w={4} color={alertIconColor}>
            {icon}
          </Icon>
        </ChakraAlert.Indicator>
      )}
      <ChakraAlert.Content bg={alertBg} alignSelf="stretch" flex={1}>
        <Stack justifyContent="center">
          {title && <ChakraAlert.Title>{title}</ChakraAlert.Title>}
          {description && <ChakraAlert.Description>{description}</ChakraAlert.Description>}
        </Stack>
      </ChakraAlert.Content>
      {endElement}
      {closable && (
        <CloseButton
          size="sm"
          pos="relative"
          top="-2"
          insetEnd="-2"
          alignSelf="flex-start"
          onClick={onClose}
        />
      )}
    </ChakraAlert.Root>
  );
});
