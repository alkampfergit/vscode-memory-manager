import * as vscode from 'vscode';
import { FileWatcherSystem } from './FileWatcherSystem';
import { MemorySynchronizationService } from './MemorySynchronizationService';
import { MemoryIndex } from './MemoryIndex';
import { TagSystem } from './TagSystem';
import { StatusBarManager } from './StatusBarManager';
import { AsyncQueue } from './AsyncQueue';

/**
 * Main service that integrates file watching with memory synchronization
 * Provides silent recovery for invalid files that become valid
 * Feature 10, Story 3: Uses AsyncQueue for sequential file event processing
 */
export class MemoryManagerService {
    private fileWatcher: FileWatcherSystem;
    private syncService: MemorySynchronizationService;
    private memoryIndex: MemoryIndex;
    private tagSystem: TagSystem;
    private statusBarManager: StatusBarManager;
    private eventQueue: AsyncQueue;

    constructor() {
        this.memoryIndex = new MemoryIndex();
        this.tagSystem = new TagSystem();
        this.syncService = new MemorySynchronizationService(this.memoryIndex, this.tagSystem);
        this.fileWatcher = new FileWatcherSystem();
        this.statusBarManager = StatusBarManager.getInstance();
        this.eventQueue = new AsyncQueue();
    }

    /**
     * Starts the memory manager service
     * @param memoryFolderPattern Glob pattern for memory files
     *
     * Feature 10, Story 3: File events are queued for sequential processing
     * to prevent race conditions when multiple files change simultaneously
     */
    public start(memoryFolderPattern: string): void {
        // Register handlers for file events
        // Each event is enqueued for sequential processing
        this.fileWatcher.onFileCreated((uri) => {
            this.eventQueue.enqueue(async () => {
                await this.syncService.handleFileCreateOrChange(uri);
                this.statusBarManager.updateStatusBar();
            });
        });

        // When a file changes, use refreshFile for silent recovery
        // This automatically handles files that transition from invalid to valid
        this.fileWatcher.onFileChanged((uri) => {
            this.eventQueue.enqueue(async () => {
                await this.syncService.refreshFile(uri.fsPath);
                this.statusBarManager.updateStatusBar();
            });
        });

        this.fileWatcher.onFileDeleted((uri) => {
            this.eventQueue.enqueue(async () => {
                this.syncService.handleFileDelete(uri);
                this.statusBarManager.updateStatusBar();
            });
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
        this.eventQueue.clear();
    }

    /**
     * Gets the event queue (for testing/debugging)
     */
    public getEventQueue(): AsyncQueue {
        return this.eventQueue;
    }
}
