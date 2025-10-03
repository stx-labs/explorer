import { Switch } from '../../components/ui/switch';
import { Text } from '../../ui/Text';

export function SignersDistributionFilter({
  onlyShowPublicSigners,
  setOnlyShowPublicSigners,
}: {
  onlyShowPublicSigners: boolean;
  setOnlyShowPublicSigners: (value: boolean) => void;
}) {
  return (
    <Switch
      variant="redesignPrimary"
      size="small"
      id="only-show-public-signers"
      onCheckedChange={() => {
        setOnlyShowPublicSigners(!onlyShowPublicSigners);
      }}
      checked={onlyShowPublicSigners}
    >
      <Text fontWeight={400} textOverflow={'ellipsis'} overflow={'hidden'} whiteSpace={'nowrap'}>
        Show only public signers
      </Text>
    </Switch>
  );
}
