import * as vscode from 'vscode';
import { INotification } from '../core/interfaces/INotification';

export class VSCodeNotification implements INotification {
    showInformation(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    showWarning(message: string): void {
        vscode.window.showWarningMessage(message);
    }

    showError(message: string): void {
        vscode.window.showErrorMessage(message);
    }
}