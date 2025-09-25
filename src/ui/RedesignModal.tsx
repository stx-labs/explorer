'use client';

import { Dialog, DialogRootProps, Flex, Icon, Stack } from '@chakra-ui/react';
import { X } from '@phosphor-icons/react';
import { FC } from 'react';

import { closeModal } from '../common/components/modals/modal-slice';
import { useAppDispatch } from '../common/state/hooks';
import { DialogContent, DialogContentProps } from '../components/ui/dialog';

export type ModalProps = Omit<DialogRootProps, 'children'> & {
  title?: React.ReactNode;
  body: React.ReactNode;
  trigger?: React.ReactNode;
  dialogContentProps?: DialogContentProps;
};

export const RedesignModal: FC<ModalProps> = ({
  open,
  title,
  body,
  trigger,
  dialogContentProps,
  ...rest
}) => {
  const dispatch = useAppDispatch();
  const onClose = () => {
    dispatch(closeModal());
  };
  return (
    <Dialog.Root
      open={open}
      closeOnInteractOutside={true}
      {...rest}
      placement="center"
      variant="redesignPrimary"
    >
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}
      <Dialog.Backdrop />
      <DialogContent pb={12} px={6} {...dialogContentProps}>
        <Flex justifyContent="flex-end" alignItems="center">
          <Dialog.CloseTrigger position="unset" onClick={onClose} cursor="pointer">
            <Icon h={5} w={5} color="iconPrimary">
              <X />
            </Icon>
          </Dialog.CloseTrigger>
        </Flex>
        <Stack gap={6}>
          {title && (
            <Dialog.Header p={0} mb={0}>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
          )}
          <Dialog.Body>{body}</Dialog.Body>
        </Stack>
      </DialogContent>
    </Dialog.Root>
  );
};
