import {
  PageChangeDetails,
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from '@/components/ui/pagination';
import { Text } from '@/ui/Text';
import { Button, Flex, Grid, HStack, Input, Separator } from '@chakra-ui/react';
import { PaginationState } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

export interface TablePaginationControlsProps {
  pageIndex: number; // the current page index
  pageSize: number; // the current page size, how many rows per page
  totalRows: number; // the total number of rows
  onPageChange: (page: PaginationState) => void; // the callback to handle page indexchange
  onPageSizeChange?: (page: PaginationState) => void; // the callback to handle page size change
}

export function TablePaginationControls({
  pageIndex,
  pageSize,
  totalRows,
  onPageChange,
}: TablePaginationControlsProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const pageCount = Math.ceil(totalRows / pageSize);

  const handlePageChange = useCallback(
    (pageChangeDetails: PageChangeDetails) => {
      if (pageChangeDetails.page > pageCount) {
        return;
      }
      onPageChange({ pageIndex: pageChangeDetails.page - 1, pageSize: pageChangeDetails.pageSize }); // Convert from 1-based to 0-based
    },
    [onPageChange, pageCount]
  );

  const goToPageEventHandler = useCallback(
    (inputValue: string) => {
      handlePageChange({ page: Number(inputValue), pageSize });
      setInputValue('');
    },
    [handlePageChange, pageSize]
  );

  const numPages = useMemo(() => Math.ceil(totalRows / pageSize), [totalRows, pageSize]);

  return (
    <Grid
      alignItems="center"
      w="fit-content"
      borderBottomLeftRadius="redesign.lg"
      borderBottomRightRadius="redesign.lg"
      border="1px solid"
      borderTop="none"
      borderColor="redesignBorderSecondary"
      gridTemplateColumns={{ base: '1fr', lg: 'auto 1px auto' }}
      gridTemplateRows={{ base: 'auto auto auto', lg: 'auto' }}
    >
      <Flex
        alignItems="center"
        justifyContent="center"
        px={{ base: 3, lg: 4 }}
        py={{ base: 3, lg: 2 }}
      >
        <PaginationRoot
          page={pageIndex + 1} // the current page index, +1 because the pagination component is 1-based
          pageSize={pageSize} // the current page size, how many rows per page
          count={totalRows} // the total number of rows
          siblingCount={1} // the number of sibling pages to show on either side of the current page
          onPageChange={handlePageChange} // the callback to handle page index change
          css={{
            '& .previous-trigger': {
              px: 2,
              py: 1,
              minW: 8,
              maxW: 8,
              minH: { base: 8, lg: 6 },
              maxH: { base: 8, lg: 6 },
            },
            '& .next-trigger': {
              px: 2,
              py: 1,
              minW: 8,
              maxW: 8,
              minH: { base: 8, lg: 6 },
              maxH: { base: 8, lg: 6 },
            },
          }}
        >
          <HStack gap={{ base: 1, lg: 4 }}>
            <PaginationPrevTrigger aria-label="Go to previous page" />
            <HStack gap={1}>
              <PaginationItems
                itemProps={{
                  px: 1,
                  minW: 8,
                  minH: 8,
                  maxH: 8,
                  border: 'none',
                }}
                ellipsisProps={{
                  px: 1,
                  minW: 8,
                  minH: 8,
                  maxH: 8,
                  border: 'none',
                }}
              />
            </HStack>
            <PaginationNextTrigger aria-label="Go to next page" />
          </HStack>
        </PaginationRoot>
      </Flex>

      {numPages > 5 && (
        <>
          <Separator
            orientation={{ base: 'horizontal', lg: 'vertical' }}
            h="auto"
            alignSelf="stretch"
            borderColor="redesignBorderSecondary"
          />

          <Flex gap={4} px={4} py={{ base: 3, lg: 2 }} alignItems="center" justifyContent="center">
            <Flex gap={2} alignItems="center">
              <Input
                aria-label="Go to page number"
                variant="redesignPrimary"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                minW={12}
                maxW={12}
                px={1.5}
                h={6}
                type="number"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    goToPageEventHandler(inputValue);
                  }
                }}
                bg="transparent"
                css={{
                  // Hide the spinner buttons
                  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                  '&[type=number]': {
                    MozAppearance: 'textfield',
                  },
                }}
              />
              <Text fontSize="xs" color="textTertiary">
                of {pageCount > 1000 ? '1000+' : pageCount} pages
              </Text>
            </Flex>
            <Button
              py={1.5}
              px={3}
              onClick={() => {
                goToPageEventHandler(inputValue);
              }}
              variant="redesignSecondary"
              size="small"
            >
              Go
            </Button>
          </Flex>
        </>
      )}
    </Grid>
  );
}
