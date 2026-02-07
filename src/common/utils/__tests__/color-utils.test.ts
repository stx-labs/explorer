import { hexToRgb, getColorWithOpacity } from '../color-utils';

describe('color-utils', () => {
    describe('hexToRgb', () => {
        it('should convert 6-digit hex to RGB', () => {
            const result = hexToRgb('#FF5500');
            expect(result).toEqual({ r: 255, g: 85, b: 0 });
        });

        it('should handle hex without # prefix', () => {
            const result = hexToRgb('FF5500');
            expect(result).toEqual({ r: 255, g: 85, b: 0 });
        });

        it('should convert black hex to RGB', () => {
            const result = hexToRgb('#000000');
            expect(result).toEqual({ r: 0, g: 0, b: 0 });
        });

        it('should convert white hex to RGB', () => {
            const result = hexToRgb('#FFFFFF');
            expect(result).toEqual({ r: 255, g: 255, b: 255 });
        });

        it('should handle lowercase hex', () => {
            const result = hexToRgb('#ff5500');
            expect(result).toEqual({ r: 255, g: 85, b: 0 });
        });

        it('should convert Stacks purple color', () => {
            const result = hexToRgb('#5546FF');
            expect(result).toEqual({ r: 85, g: 70, b: 255 });
        });
    });

    describe('getColorWithOpacity', () => {
        it('should return rgba string with specified opacity', () => {
            const result = getColorWithOpacity('#FF5500', 0.5);
            expect(result).toBe('rgba(255, 85, 0, 0.5)');
        });

        it('should handle full opacity', () => {
            const result = getColorWithOpacity('#FF5500', 1);
            expect(result).toBe('rgba(255, 85, 0, 1)');
        });

        it('should handle zero opacity', () => {
            const result = getColorWithOpacity('#FF5500', 0);
            expect(result).toBe('rgba(255, 85, 0, 0)');
        });

        it('should work with white color', () => {
            const result = getColorWithOpacity('#FFFFFF', 0.8);
            expect(result).toBe('rgba(255, 255, 255, 0.8)');
        });

        it('should work with black color', () => {
            const result = getColorWithOpacity('#000000', 0.3);
            expect(result).toBe('rgba(0, 0, 0, 0.3)');
        });
    });
});
