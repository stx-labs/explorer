import { showFn, getInvalidFunctionType, InvalidFunctionType } from '../sandbox';

describe('sandbox', () => {
    describe('InvalidFunctionType enum', () => {
        it('should have Private value', () => {
            expect(InvalidFunctionType.Private).toBe('private');
        });

        it('should have Pox2StacksIncrease value', () => {
            expect(InvalidFunctionType.Pox2StacksIncrease).toBe('pox-2-stacks-increase');
        });

        it('should have Unknown value', () => {
            expect(InvalidFunctionType.Unknown).toBe('unknown');
        });
    });

    describe('showFn', () => {
        it('should return true for public function', () => {
            const abiFn = { access: 'public', name: 'transfer' };
            expect(showFn('SP123.contract', abiFn)).toBe(true);
        });

        it('should return false for private function', () => {
            const abiFn = { access: 'private', name: 'internal-helper' };
            expect(showFn('SP123.contract', abiFn)).toBe(false);
        });

        it('should return false for pox-2 stack-increase on mainnet', () => {
            const abiFn = { access: 'public', name: 'stack-increase' };
            expect(showFn('SP000000000000000000002Q6VF78.pox-2', abiFn)).toBe(false);
        });

        it('should return false for pox-2 stack-increase on testnet', () => {
            const abiFn = { access: 'public', name: 'stack-increase' };
            expect(showFn('ST000000000000000000002AMW42H.pox-2', abiFn)).toBe(false);
        });

        it('should return true for stack-increase on other contracts', () => {
            const abiFn = { access: 'public', name: 'stack-increase' };
            expect(showFn('SP123.my-contract', abiFn)).toBe(true);
        });

        it('should return true for read-only function', () => {
            const abiFn = { access: 'read_only', name: 'get-balance' };
            expect(showFn('SP123.contract', abiFn)).toBe(true);
        });
    });

    describe('getInvalidFunctionType', () => {
        it('should return Private for private function', () => {
            const abiFn = { access: 'private', name: 'internal' };
            expect(getInvalidFunctionType('SP123.contract', abiFn)).toBe(InvalidFunctionType.Private);
        });

        it('should return Pox2StacksIncrease for mainnet pox-2 stack-increase', () => {
            const abiFn = { access: 'public', name: 'stack-increase' };
            expect(getInvalidFunctionType('SP000000000000000000002Q6VF78.pox-2', abiFn)).toBe(
                InvalidFunctionType.Pox2StacksIncrease
            );
        });

        it('should return Pox2StacksIncrease for testnet pox-2 stack-increase', () => {
            const abiFn = { access: 'public', name: 'stack-increase' };
            expect(getInvalidFunctionType('ST000000000000000000002AMW42H.pox-2', abiFn)).toBe(
                InvalidFunctionType.Pox2StacksIncrease
            );
        });

        it('should return Unknown for valid public function', () => {
            const abiFn = { access: 'public', name: 'transfer' };
            expect(getInvalidFunctionType('SP123.contract', abiFn)).toBe(InvalidFunctionType.Unknown);
        });
    });
});
