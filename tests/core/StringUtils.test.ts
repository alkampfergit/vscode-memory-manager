import { StringUtils } from '../../src/core/StringUtils';

describe('StringUtils - Unit Tests', () => {
    describe('isEmpty', () => {
        it('should return true for null', () => {
            expect(StringUtils.isEmpty(null)).toBe(true);
        });

        it('should return true for undefined', () => {
            expect(StringUtils.isEmpty(undefined)).toBe(true);
        });

        it('should return true for empty string', () => {
            expect(StringUtils.isEmpty('')).toBe(true);
        });

        it('should return true for whitespace only', () => {
            expect(StringUtils.isEmpty('   ')).toBe(true);
        });

        it('should return false for non-empty string', () => {
            expect(StringUtils.isEmpty('hello')).toBe(false);
        });
    });

    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect(StringUtils.capitalize('hello')).toBe('Hello');
        });

        it('should handle already capitalized string', () => {
            expect(StringUtils.capitalize('Hello')).toBe('Hello');
        });

        it('should handle single character', () => {
            expect(StringUtils.capitalize('a')).toBe('A');
        });
    });

    describe('trimPath', () => {
        it('should convert backslashes to forward slashes', () => {
            expect(StringUtils.trimPath('C:\\Users\\test')).toBe('C:/Users/test');
        });

        it('should trim whitespace', () => {
            expect(StringUtils.trimPath('  /path/to/file  ')).toBe('/path/to/file');
        });
    });
});