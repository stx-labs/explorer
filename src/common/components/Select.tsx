import {
  SelectContent,
  SelectControl,
  SelectHiddenSelect,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectRootProps,
  SelectTrigger,
  SelectVariantProps,
} from '@/components/ui/select';
import {
  SelectValueChangeDetails,
  Stack,
  VisuallyHidden,
  createListCollection,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

export function Select<V extends string, L extends string>({
  placeholder,
  defaultValue,
  items,
  onValueChange,
  selectProps,
  size,
  label,
}: {
  items: { value: V; label: L }[];
  onValueChange?: (details: SelectValueChangeDetails<{ value: V; label: L }>) => void;
  defaultValue?: V[];
  placeholder?: string;
  selectProps?: SelectRootProps<V, L>;
  label?: string;
} & SelectVariantProps) {
  const positioning = selectProps?.positioning;
  const list = createListCollection<{ value: V; label: L }>({
    items,
  });
  const [open, setOpen] = useState(false);
  const [isContentWiderThanControl, setIsContentWiderThanControl] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Observe the control and content for size changes
  // This is needed to determine if the content is wider than the control, necessitating the tab to be displayed
  useEffect(() => {
    if (!controlRef.current || !contentRef.current) return;

    const observer = new ResizeObserver(entries => {
      if (controlRef.current && contentRef.current) {
        const controlWidth = controlRef.current.offsetWidth;
        const contentWidth = contentRef.current.offsetWidth;
        setIsContentWiderThanControl(contentWidth > controlWidth);
      }
    });

    observer.observe(controlRef.current);
    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <SelectRoot
      collection={list}
      defaultValue={defaultValue}
      onOpenChange={details => {
        setOpen(details.open);
      }}
      onValueChange={details => {
        onValueChange?.(details);
      }}
      positioning={positioning}
      open={open}
      size={size}
      {...selectProps}
    >
      {label ? (
        <VisuallyHidden asChild>
          <SelectLabel>{label}</SelectLabel>
        </VisuallyHidden>
      ) : null}
      <SelectHiddenSelect />
      <SelectControl
        ref={controlRef}
        open={open}
        positioning={positioning}
        isContentWiderThanControl={isContentWiderThanControl}
      >
        <SelectTrigger open={open} positioning={positioning} placeholder={placeholder} />
      </SelectControl>
      <SelectContent
        ref={contentRef}
        open={open}
        positioning={positioning}
        isContentWiderThanControl={isContentWiderThanControl}
      >
        <Stack gap={2.5}>
          {list.items.map(item => (
            <SelectItem item={item} key={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </Stack>
      </SelectContent>
    </SelectRoot>
  );
}
