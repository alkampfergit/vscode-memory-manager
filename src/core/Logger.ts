import * as vscode from 'vscode';

/**
 * Log levels
 */
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

/**
 * Structured logger for the Memory Manager extension
 * Feature 9, Story 2
 *
 * Provides structured logging with timestamps and severity levels
 * All output is directed to the extension's Output Channel
 */
export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Memory Manager');
    }

    /**
     * Gets the singleton instance of Logger
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Logs an info message
     */
    public info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Logs a warning message
     */
    public warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * Logs an error message
     */
    public error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    /**
     * Logs a debug message
     */
    public debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, data?: unknown): void {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (data !== undefined) {
            if (typeof data === 'object' && data !== null) {
                // Format objects with indentation for readability
                logMessage += '\n' + JSON.stringify(data, null, 2);
            } else {
                logMessage += ` ${String(data)}`;
            }
        }

        // Output to the Output Channel
        this.outputChannel.appendLine(logMessage);

        // Also log to console for debugging
        switch (level) {
            case LogLevel.ERROR:
                console.error(message, data);
                break;
            case LogLevel.WARN:
                console.warn(message, data);
                break;
            case LogLevel.INFO:
            case LogLevel.DEBUG:
                console.log(message, data);
                break;
        }
    }

    /**
     * Shows the output channel
     */
    public show(preserveFocus: boolean = true): void {
        this.outputChannel.show(preserveFocus);
    }

    /**
     * Clears the output channel
     */
    public clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Disposes the output channel
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}
