import * as vscode from 'vscode';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    Info = 'Info',
    Warning = 'Warning',
    Error = 'Error'
}

/**
 * Represents an error report entry
 */
export interface ErrorReport {
    timestamp: Date;
    severity: ErrorSeverity;
    message: string;
    filePath?: string;
    details?: string;
}

/**
 * Non-intrusive error reporting system
 * Uses Output Channel for logging errors without interrupting user workflow
 * Per Feature 8, Story 1: Never use modal dialogs for validation/parsing errors
 */
export class ErrorReporter {
    private static instance: ErrorReporter;
    private outputChannel: vscode.OutputChannel;
    private errorHistory: ErrorReport[] = [];
    private readonly maxHistorySize = 100;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Memory Manager');
    }

    /**
     * Gets the singleton instance of ErrorReporter
     */
    public static getInstance(): ErrorReporter {
        if (!ErrorReporter.instance) {
            ErrorReporter.instance = new ErrorReporter();
        }
        return ErrorReporter.instance;
    }

    /**
     * Reports an error in a non-intrusive way
     * Logs to output channel and stores in history
     * Does NOT use modal dialogs
     */
    public reportError(message: string, filePath?: string, details?: string): void {
        this.report(ErrorSeverity.Error, message, filePath, details);
    }

    /**
     * Reports a warning in a non-intrusive way
     */
    public reportWarning(message: string, filePath?: string, details?: string): void {
        this.report(ErrorSeverity.Warning, message, filePath, details);
    }

    /**
     * Reports an info message in a non-intrusive way
     */
    public reportInfo(message: string, filePath?: string, details?: string): void {
        this.report(ErrorSeverity.Info, message, filePath, details);
    }

    /**
     * Internal method to report errors/warnings/info
     */
    private report(severity: ErrorSeverity, message: string, filePath?: string, details?: string): void {
        const timestamp = new Date();
        const errorReport: ErrorReport = {
            timestamp,
            severity,
            message,
            filePath,
            details
        };

        // Store in history
        this.errorHistory.push(errorReport);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }

        // Format message for output channel
        const timeStr = timestamp.toLocaleTimeString();
        let logMessage = `[${timeStr}] [${severity}] ${message}`;

        if (filePath) {
            logMessage += ` (File: ${filePath})`;
        }

        if (details) {
            logMessage += `\n  Details: ${details}`;
        }

        // Log to output channel (non-intrusive)
        this.outputChannel.appendLine(logMessage);

        // Also log to console for debugging
        const consoleMessage = filePath ? `${message} (${filePath})` : message;
        switch (severity) {
            case ErrorSeverity.Error:
                console.error(consoleMessage, details || '');
                break;
            case ErrorSeverity.Warning:
                console.warn(consoleMessage, details || '');
                break;
            case ErrorSeverity.Info:
                console.log(consoleMessage, details || '');
                break;
        }
    }

    /**
     * Shows the output channel (user can manually open this)
     * This is non-intrusive as it doesn't steal focus
     */
    public showOutputChannel(preserveFocus: boolean = true): void {
        this.outputChannel.show(preserveFocus);
    }

    /**
     * Gets the error history
     */
    public getErrorHistory(): ErrorReport[] {
        return [...this.errorHistory];
    }

    /**
     * Clears the error history
     */
    public clearHistory(): void {
        this.errorHistory = [];
    }

    /**
     * Gets errors for a specific file
     */
    public getErrorsForFile(filePath: string): ErrorReport[] {
        return this.errorHistory.filter(report => report.filePath === filePath);
    }

    /**
     * Gets recent errors (last N entries)
     */
    public getRecentErrors(count: number): ErrorReport[] {
        return this.errorHistory.slice(-count);
    }

    /**
     * Disposes the output channel
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}
