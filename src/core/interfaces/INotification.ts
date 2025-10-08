export interface INotification {
    showInformation(message: string): void;
    showWarning(message: string): void;
    showError(message: string): void;
}