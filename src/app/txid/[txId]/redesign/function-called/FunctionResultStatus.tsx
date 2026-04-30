import { StatusBadge } from '@/ui/Badge';

export function FunctionResultStatus({ success }: { success: boolean | undefined }) {
  if (success == null) return null;
  return <StatusBadge successLabel="Success" failureLabel="Failure" success={success} />;
}
