import { VSCodeNotification } from '../../src/adapters/VSCodeNotification';
import { INotification } from '../../src/core/interfaces/INotification';
import { StringUtils } from '../../src/core/StringUtils';

describe('Adapter Integration Tests', () => {
    describe('Notification with StringUtils', () => {
        let notification: INotification;

        beforeEach(() => {
            notification = new VSCodeNotification();
        });

        it('should integrate notification adapter with core utilities', () => {
            const message = 'test message';
            const capitalizedMessage = StringUtils.capitalize(message);

            expect(capitalizedMessage).toBe('Test message');
            expect(notification).toBeDefined();
            expect(notification.showInformation).toBeDefined();
        });

        it('should validate empty messages before notification', () => {
            const emptyMessage = '';
            const validMessage = 'Valid message';

            expect(StringUtils.isEmpty(emptyMessage)).toBe(true);
            expect(StringUtils.isEmpty(validMessage)).toBe(false);
        });

        it('should process path strings for notifications', () => {
            const windowsPath = 'C:\\Users\\test\\file.txt';
            const normalizedPath = StringUtils.trimPath(windowsPath);

            expect(normalizedPath).toBe('C:/Users/test/file.txt');
        });
    });
});