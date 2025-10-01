import { CommandRouter } from '../../src/chat/CommandRouter';

describe('CommandRouter', () => {
    describe('parseMemoryTagCommand', () => {
        it('should parse single tag on first line without remaining prompt', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database');
            expect(result.tags).toEqual(['backend.database']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should parse multiple tags separated by comma on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,api.auth,frontend.ui');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'frontend.ui']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should parse multiple tags separated by colon on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database:api.auth:frontend.ui');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'frontend.ui']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should parse mixed comma and colon separators', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,api.auth:frontend.ui');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'frontend.ui']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should parse tags with spaces around separators', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database , api.auth : frontend.ui');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'frontend.ui']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should parse tag on first line with prompt on next line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database\nHow does user authentication work?');
            expect(result.tags).toEqual(['backend.database']);
            expect(result.remainingPrompt).toBe('How does user authentication work?');
        });

        it('should parse multiple tags on first line with prompt on next lines', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,api.auth\nExplain the authentication flow');
            expect(result.tags).toEqual(['backend.database', 'api.auth']);
            expect(result.remainingPrompt).toBe('Explain the authentication flow');
        });

        it('should parse tags with colon on first line with multi-line prompt', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database:api.auth\nPlease describe the security model\nAnd explain how it works');
            expect(result.tags).toEqual(['backend.database', 'api.auth']);
            expect(result.remainingPrompt).toBe('Please describe the security model\nAnd explain how it works');
        });

        it('should handle empty input', () => {
            const result = CommandRouter.parseMemoryTagCommand('');
            expect(result.tags).toEqual([]);
            expect(result.remainingPrompt).toBe('');
        });

        it('should handle whitespace only input', () => {
            const result = CommandRouter.parseMemoryTagCommand('   ');
            expect(result.tags).toEqual([]);
            expect(result.remainingPrompt).toBe('');
        });

        it('should handle multiple consecutive separators', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,,api.auth:::frontend.ui');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'frontend.ui']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should ignore empty tags from separators', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,,,,api.auth');
            expect(result.tags).toEqual(['backend.database', 'api.auth']);
            expect(result.remainingPrompt).toBe('');
        });

        it('should handle tags with trailing separators on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,api.auth,\nWhat is the structure?');
            expect(result.tags).toEqual(['backend.database', 'api.auth']);
            expect(result.remainingPrompt).toBe('What is the structure?');
        });

        it('should handle complex real-world example with tags on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.database,api.auth:security.jwt\nCan you explain how JWT tokens are validated and what happens during user login?');
            expect(result.tags).toEqual(['backend.database', 'api.auth', 'security.jwt']);
            expect(result.remainingPrompt).toBe('Can you explain how JWT tokens are validated and what happens during user login?');
        });

        it('should handle wildcard patterns on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('backend.*,*.auth\nWhat are the authentication patterns?');
            expect(result.tags).toEqual(['backend.*', '*.auth']);
            expect(result.remainingPrompt).toBe('What are the authentication patterns?');
        });

        it('should handle #memory-tag prefix on first line', () => {
            const result = CommandRouter.parseMemoryTagCommand('#memory-tag backend.database\nHow does connection pooling work?');
            expect(result.tags).toEqual(['backend.database']);
            expect(result.remainingPrompt).toBe('How does connection pooling work?');
        });

        it('should handle #memory-tag prefix with multiple tags', () => {
            const result = CommandRouter.parseMemoryTagCommand('#memory-tag backend.database,api.auth\nExplain authentication');
            expect(result.tags).toEqual(['backend.database', 'api.auth']);
            expect(result.remainingPrompt).toBe('Explain authentication');
        });
    });

    describe('parseMemoryTagCommandLegacy (backward compatibility)', () => {
        it('should return first tag for backward compatibility', () => {
            const result = CommandRouter.parseMemoryTagCommandLegacy('backend.database,api.auth');
            expect(result).toBe('backend.database');
        });

        it('should return empty string when no tags', () => {
            const result = CommandRouter.parseMemoryTagCommandLegacy('');
            expect(result).toBe('');
        });

        it('should return first tag ignoring remaining prompt on next line', () => {
            const result = CommandRouter.parseMemoryTagCommandLegacy('backend.database\nHow does it work?');
            expect(result).toBe('backend.database');
        });
    });
});