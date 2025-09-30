describe('Jest Configuration', () => {
    it('should run a basic test', () => {
        expect(true).toBe(true);
    });

    it('should perform basic arithmetic', () => {
        const result = 2 + 2;
        expect(result).toBe(4);
    });

    it('should handle TypeScript types', () => {
        const greeting: string = 'Hello, Jest!';
        expect(greeting).toContain('Jest');
    });
});