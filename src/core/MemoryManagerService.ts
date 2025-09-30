import * as vscode from 'vscode';
import { FileWatcherSystem } from './FileWatcherSystem';
import { MemorySynchronizationService } from './MemorySynchronizationService';
import { MemoryIndex } from './MemoryIndex';
import { TagSystem } from './TagSystem';

/**
 * Main service that integrates file watching with memory synchronization
 * Provides silent recovery for invalid files that become valid
 */
export class MemoryManagerService {
    private fileWatcher: FileWatcherSystem;
    private syncService: MemorySynchronizationService;
    private memoryIndex: MemoryIndex;
    private tagSystem: TagSystem;

    constructor() {
        this.memoryIndex = new MemoryIndex();
        this.tagSystem = new TagSystem();
        this.syncService = new MemorySynchronizationService(this.memoryIndex, this.tagSystem);
        this.fileWatcher = new FileWatcherSystem();
    }

    /**
     * Starts the memory manager service
     * @param memoryFolderPattern Glob pattern for memory files
     */
    public start(memoryFolderPattern: string): void {
        // Register handlers for file events
        this.fileWatcher.onFileCreated((uri) => {
            this.syncService.handleFileCreateOrChange(uri);
        });

        // When a file changes, use refreshFile for silent recovery
        // This automatically handles files that transition from invalid to valid
        this.fileWatcher.onFileChanged((uri) => {
            this.syncService.refreshFile(uri.fsPath);
        });

        this.fileWatcher.onFileDeleted((uri) => {
            this.syncService.handleFileDelete(uri);
        });

        // Start watching
        this.fileWatcher.startWatching(memoryFolderPattern);
    }

    /**
     * Stops the memory manager service
     */
    public stop(): void {
        this.fileWatcher.stopWatching();
    }

    /**
     * Gets the memory index
     */
    public getMemoryIndex(): MemoryIndex {
        return this.memoryIndex;
    }

    /**
     * Gets the tag system
     */
    public getTagSystem(): TagSystem {
        return this.tagSystem;
    }

    /**
     * Manually refreshes a specific file
     * @param filePath The file path to refresh
     */
    public async refreshFile(filePath: string): Promise<void> {
        await this.syncService.refreshFile(filePath);
    }

    /**
     * Performs initial synchronization of all memory files
     * @param uris Array of file URIs to synchronize
     */
    public async initialSync(uris: vscode.Uri[]): Promise<void> {
        await this.syncService.synchronizeBatch(uris);
    }

    /**
     * Disposes of all resources
     */
    public dispose(): void {
        this.fileWatcher.dispose();
        this.syncService.clear();
    }
}
