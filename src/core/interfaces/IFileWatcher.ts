import * as vscode from 'vscode';

/**
 * Interface for file watcher functionality
 */
export interface IFileWatcher {
    /**
     * Starts watching the Memory folder for file changes
     * @param memoryFolderPattern Glob pattern for memory files
     */
    startWatching(memoryFolderPattern: string): void;

    /**
     * Stops watching and disposes of the file watcher
     */
    stopWatching(): void;

    /**
     * Registers a callback for file creation events
     * @param handler Function to call when a file is created
     */
    onFileCreated(handler: (uri: vscode.Uri) => void): void;

    /**
     * Registers a callback for file change events
     * @param handler Function to call when a file is changed
     */
    onFileChanged(handler: (uri: vscode.Uri) => void): void;

    /**
     * Registers a callback for file deletion events
     * @param handler Function to call when a file is deleted
     */
    onFileDeleted(handler: (uri: vscode.Uri) => void): void;
}
