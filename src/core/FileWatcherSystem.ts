import * as vscode from 'vscode';
import { IFileWatcher } from './interfaces/IFileWatcher';

/**
 * File watcher system for monitoring changes in the Memory folder
 */
export class FileWatcherSystem implements IFileWatcher {
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private createHandlers: Array<(uri: vscode.Uri) => void> = [];
    private changeHandlers: Array<(uri: vscode.Uri) => void> = [];
    private deleteHandlers: Array<(uri: vscode.Uri) => void> = [];
    private disposables: vscode.Disposable[] = [];

    /**
     * Starts watching the Memory folder for file changes
     * @param memoryFolderPattern Glob pattern for memory files
     */
    public startWatching(memoryFolderPattern: string): void {
        // Stop any existing watcher
        this.stopWatching();

        // Create a new file system watcher
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            memoryFolderPattern,
            false, // Watch for create events
            false, // Watch for change events
            false  // Watch for delete events
        );

        // Register event handlers
        this.disposables.push(
            this.fileWatcher.onDidCreate((uri) => {
                this.notifyCreateHandlers(uri);
            })
        );

        this.disposables.push(
            this.fileWatcher.onDidChange((uri) => {
                this.notifyChangeHandlers(uri);
            })
        );

        this.disposables.push(
            this.fileWatcher.onDidDelete((uri) => {
                this.notifyDeleteHandlers(uri);
            })
        );

        // Add the watcher itself to disposables
        this.disposables.push(this.fileWatcher);
    }

    /**
     * Stops watching and disposes of the file watcher
     */
    public stopWatching(): void {
        // Dispose all event listeners and the watcher
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.fileWatcher = undefined;
    }

    /**
     * Registers a callback for file creation events
     * @param handler Function to call when a file is created
     */
    public onFileCreated(handler: (uri: vscode.Uri) => void): void {
        this.createHandlers.push(handler);
    }

    /**
     * Registers a callback for file change events
     * @param handler Function to call when a file is changed
     */
    public onFileChanged(handler: (uri: vscode.Uri) => void): void {
        this.changeHandlers.push(handler);
    }

    /**
     * Registers a callback for file deletion events
     * @param handler Function to call when a file is deleted
     */
    public onFileDeleted(handler: (uri: vscode.Uri) => void): void {
        this.deleteHandlers.push(handler);
    }

    /**
     * Notifies all registered create handlers
     */
    private notifyCreateHandlers(uri: vscode.Uri): void {
        this.createHandlers.forEach(handler => {
            try {
                handler(uri);
            } catch (error) {
                console.error(`Error in file create handler: ${error}`);
            }
        });
    }

    /**
     * Notifies all registered change handlers
     */
    private notifyChangeHandlers(uri: vscode.Uri): void {
        this.changeHandlers.forEach(handler => {
            try {
                handler(uri);
            } catch (error) {
                console.error(`Error in file change handler: ${error}`);
            }
        });
    }

    /**
     * Notifies all registered delete handlers
     */
    private notifyDeleteHandlers(uri: vscode.Uri): void {
        this.deleteHandlers.forEach(handler => {
            try {
                handler(uri);
            } catch (error) {
                console.error(`Error in file delete handler: ${error}`);
            }
        });
    }

    /**
     * Disposes of the file watcher system
     */
    public dispose(): void {
        this.stopWatching();
        this.createHandlers = [];
        this.changeHandlers = [];
        this.deleteHandlers = [];
    }
}
