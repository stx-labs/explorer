import { ensureError, extractErrorDetails } from '../error-utils';

describe('error-utils', () => {
    describe('ensureError', () => {
        it('should return the same Error if input is already an Error', () => {
            const originalError = new Error('Test error');
            const result = ensureError(originalError);
            expect(result).toBe(originalError);
        });

        it('should create Error from string input', () => {
            const result = ensureError('string error message');
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('string error message');
        });

        it('should create default Error for null input', () => {
            const result = ensureError(null);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('An unknown error occurred');
        });

        it('should create default Error for undefined input', () => {
            const result = ensureError(undefined);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('An unknown error occurred');
        });

        it('should create default Error for non-string/non-Error input', () => {
            const result = ensureError({ code: 500 });
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('An unknown error occurred');
        });

        it('should create default Error for number input', () => {
            const result = ensureError(42);
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('An unknown error occurred');
        });
    });

    describe('extractErrorDetails', () => {
        it('should extract details from Error instance', () => {
            const error = new Error('Test error');
            error.name = 'TestError';
            const result = extractErrorDetails(error);

            expect(result.message).toBe('Test error');
            expect(result.name).toBe('TestError');
            expect(typeof result.stack).toBe('string');
        });

        it('should handle string error', () => {
            const result = extractErrorDetails('string error');
            expect(result.message).toBe('string error');
            expect(result.name).toBe('Unknown');
        });

        it('should handle number error', () => {
            const result = extractErrorDetails(500);
            expect(result.message).toBe('Error code: 500');
        });

        it('should handle object error with message property', () => {
            const errorObj = { message: 'Object error', name: 'ObjectError' };
            const result = extractErrorDetails(errorObj);
            expect(result.message).toBe('Object error');
            expect(result.name).toBe('ObjectError');
        });

        it('should handle null/undefined', () => {
            const result = extractErrorDetails(null);
            expect(result.message).toBe('An unknown error occurred');
        });

        it('should stringify complex object errors', () => {
            const complexError = { code: 404, details: { reason: 'Not found' } };
            const result = extractErrorDetails(complexError);
            expect(typeof result.message).toBe('string');
        });
    });
});
