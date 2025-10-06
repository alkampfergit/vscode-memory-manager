/**
 * Asynchronous task queue for sequential processing
 * Feature 10, Story 3: Queue-based Contention Management
 *
 * Ensures file system events are processed sequentially to prevent race conditions
 * when multiple file changes occur in rapid succession.
 */
export class AsyncQueue {
    private queue: Array<() => Promise<void>> = [];
    private processing = false;

    /**
     * Adds a task to the queue
     * @param task Async function to execute
     */
    public enqueue(task: () => Promise<void>): void {
        this.queue.push(task);
        this.processQueue();
    }

    /**
     * Processes tasks from the queue sequentially
     * Only one task is processed at a time (single worker)
     */
    private async processQueue(): Promise<void> {
        // If already processing, return (worker is already running)
        if (this.processing) {
            return;
        }

        // Mark as processing
        this.processing = true;

        // Process all tasks in the queue sequentially
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                try {
                    await task();
                } catch (error) {
                    // Log error but continue processing other tasks
                    console.error('Error processing queue task:', error);
                }
            }
        }

        // Mark as not processing
        this.processing = false;
    }

    /**
     * Gets the current queue size
     */
    public size(): number {
        return this.queue.length;
    }

    /**
     * Checks if the queue is currently processing
     */
    public isProcessing(): boolean {
        return this.processing;
    }

    /**
     * Clears all pending tasks from the queue
     */
    public clear(): void {
        this.queue = [];
    }
}
