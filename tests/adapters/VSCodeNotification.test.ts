import { VSCodeNotification } from '../../src/adapters/VSCodeNotification';
import { INotification } from '../../src/core/interfaces/INotification';

describe('VSCodeNotification', () => {
    let notification: INotification;

    beforeEach(() => {
        notification = new VSCodeNotification();
    });

    it('should implement INotification interface', () => {
        expect(notification).toBeDefined();
        expect(notification.showInformation).toBeDefined();
        expect(notification.showWarning).toBeDefined();
        expect(notification.showError).toBeDefined();
    });

    it('should have correct method signatures', () => {
        expect(typeof notification.showInformation).toBe('function');
        expect(typeof notification.showWarning).toBe('function');
        expect(typeof notification.showError).toBe('function');
    });
});