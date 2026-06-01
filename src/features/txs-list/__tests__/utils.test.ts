import { TransactionStatus } from '../../../common/constants/constants';
import { getV3TxStatus } from '../utils';

describe('getV3TxStatus', () => {
  it('maps success to the anchor-block status', () => {
    expect(getV3TxStatus('success')).toBe(TransactionStatus.SUCCESS_ANCHOR_BLOCK);
  });

  it('maps an abort status to failed', () => {
    expect(getV3TxStatus('abort_by_post_condition')).toBe(TransactionStatus.FAILED);
  });
});
