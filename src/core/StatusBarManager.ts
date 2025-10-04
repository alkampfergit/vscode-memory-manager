import * as vscode from 'vscode';
import { MemoryIndex } from './MemoryIndex';
import { ErrorReporter } from './ErrorReporter';

/**
 * Manages the status bar item for the Memory Manager extension
 * Shows the number of indexed memories and error status
 * Per Feature 8, Story 4: Status bar provides high-level status
 */
export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    private memoryIndex?: MemoryIndex;
    private errorReporter?: ErrorReporter;
    private hasErrors: boolean = false;

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'memoryManager.showOutput';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    /**
     * Gets the singleton instance of StatusBarManager
     */
    public static getInstance(): StatusBarManager {
        if (!StatusBarManager.instance) {
            StatusBarManager.instance = new StatusBarManager();
        }
        return StatusBarManager.instance;
    }

    /**
     * Sets the memory index to track
     */
    public setMemoryIndex(index: MemoryIndex): void {
        this.memoryIndex = index;
        this.updateStatusBar();
    }

    /**
     * Sets the error reporter to monitor
     */
    public setErrorReporter(reporter: ErrorReporter): void {
        this.errorReporter = reporter;
        this.updateStatusBar();
    }

    /**
     * Updates the status bar to show current status
     */
    public updateStatusBar(): void {
        const memoryCount = this.memoryIndex?.size() || 0;
        const errorCount = this.errorReporter?.getErrorHistory().length || 0;
        this.hasErrors = errorCount > 0;

        if (this.hasErrors) {
            // Show error icon when errors are present
            this.statusBarItem.text = `$(error) Memory: ${memoryCount} files, ${errorCount} errors`;
            this.statusBarItem.tooltip = `Memory Manager: ${memoryCount} indexed memories, ${errorCount} errors. Click to view output.`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else {
            // Show normal status when no errors
            this.statusBarItem.text = `$(database) Memory: ${memoryCount}`;
            this.statusBarItem.tooltip = `Memory Manager: ${memoryCount} indexed memories. Click to view output.`;
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    /**
     * Shows success status temporarily
     */
    public showSuccess(message: string, duration: number = 3000): void {
        const originalText = this.statusBarItem.text;
        const originalTooltip = this.statusBarItem.tooltip;

        this.statusBarItem.text = `$(check) ${message}`;
        this.statusBarItem.tooltip = message;

        setTimeout(() => {
            this.statusBarItem.text = originalText;
            this.statusBarItem.tooltip = originalTooltip;
        }, duration);
    }

    /**
     * Shows an error status temporarily
     */
    public showError(message: string, duration: number = 3000): void {
        const originalText = this.statusBarItem.text;
        const originalTooltip = this.statusBarItem.tooltip;

        this.statusBarItem.text = `$(error) ${message}`;
        this.statusBarItem.tooltip = message;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

        setTimeout(() => {
            this.statusBarItem.text = originalText;
            this.statusBarItem.tooltip = originalTooltip;
            this.updateStatusBar();
        }, duration);
    }

    /**
     * Gets whether there are current errors
     */
    public hasActiveErrors(): boolean {
        return this.hasErrors;
    }

    /**
     * Gets the current memory count
     */
    public getMemoryCount(): number {
        return this.memoryIndex?.size() || 0;
    }

    /**
     * Gets the current error count
     */
    public getErrorCount(): number {
        return this.errorReporter?.getErrorHistory().length || 0;
    }

    /**
     * Gets the status bar item (for testing)
     */
    public getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }

    /**
     * Disposes the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
