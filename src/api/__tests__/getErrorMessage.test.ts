import { getErrorMessage } from '../getErrorMessage';

describe('getErrorMessage', () => {
  it('prefers the reason field', () => {
    const error = { reason: 'Contract already exists', message: 'Something else' };
    expect(getErrorMessage(error)).toBe('Contract already exists');
  });

  it('falls back to message if reason is missing', () => {
    const error = { message: 'Unexpected error' };
    expect(getErrorMessage(error)).toBe('Unexpected error');
  });

  it('handles string errors', () => {
    expect(getErrorMessage('Simple error')).toBe('Simple error');
  });

  it('returns default message for empty objects', () => {
    expect(getErrorMessage({})).toBe('Something went wrong! Please try again later.');
  });
});
