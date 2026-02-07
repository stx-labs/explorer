import { isIconUrl } from '../url-utils';

describe('url-utils', () => {
    describe('isIconUrl', () => {
        it('should return true for valid PNG URL', () => {
            expect(isIconUrl('https://example.com/icon.png')).toBe(true);
        });

        it('should return true for valid JPG URL', () => {
            expect(isIconUrl('https://example.com/image.jpg')).toBe(true);
        });

        it('should return true for valid JPEG URL', () => {
            expect(isIconUrl('https://example.com/image.jpeg')).toBe(true);
        });

        it('should return true for valid GIF URL', () => {
            expect(isIconUrl('https://example.com/animation.gif')).toBe(true);
        });

        it('should return true for valid SVG URL', () => {
            expect(isIconUrl('https://example.com/vector.svg')).toBe(true);
        });

        it('should return false for non-image URL', () => {
            expect(isIconUrl('https://example.com/document.pdf')).toBe(false);
        });

        it('should return false for HTML URL', () => {
            expect(isIconUrl('https://example.com/page.html')).toBe(false);
        });

        it('should return false for invalid URL', () => {
            expect(isIconUrl('not-a-valid-url')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isIconUrl('')).toBe(false);
        });

        it('should handle URLs with query parameters', () => {
            expect(isIconUrl('https://example.com/icon.png?size=32')).toBe(true);
        });

        it('should handle URLs with multiple query parameters', () => {
            expect(isIconUrl('https://example.com/icon.jpg?width=100&height=100')).toBe(true);
        });

        it('should return false for URL without extension', () => {
            expect(isIconUrl('https://example.com/icon')).toBe(false);
        });
    });
});
