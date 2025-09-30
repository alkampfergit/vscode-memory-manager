import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FileWatcherSystem } from '../../src/core/FileWatcherSystem';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('FileWatcherSystem', () => {
    let fileWatcher: FileWatcherSystem;
    let mockWatcher: any;

    beforeEach(() => {
        fileWatcher = new FileWatcherSystem();
        // Clear mock calls
        jest.clearAllMocks();
    });

    describe('startWatching', () => {
        it('should create a file system watcher with the correct pattern', () => {
            const pattern = '**/Memory/**/*.md';

            fileWatcher.startWatching(pattern);

            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
                pattern,
                false, // Watch for create
                false, // Watch for change
                false  // Watch for delete
            );
        });

        it('should register onDidCreate handler', () => {
            fileWatcher.startWatching('**/Memory/**/*.md');

            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;

            expect(mockWatcher.onDidCreate).toHaveBeenCalled();
        });

        it('should register onDidChange handler', () => {
            fileWatcher.startWatching('**/Memory/**/*.md');

            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;

            expect(mockWatcher.onDidChange).toHaveBeenCalled();
        });

        it('should register onDidDelete handler', () => {
            fileWatcher.startWatching('**/Memory/**/*.md');

            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;

            expect(mockWatcher.onDidDelete).toHaveBeenCalled();
        });

        it('should stop existing watcher before starting a new one', () => {
            fileWatcher.startWatching('**/Memory/**/*.md');

            const firstWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;

            // Start watching again with a different pattern
            fileWatcher.startWatching('**/Memory2/**/*.md');

            // Should have been called twice
            expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('event handlers', () => {
        let createHandler: jest.Mock;
        let changeHandler: jest.Mock;
        let deleteHandler: jest.Mock;
        let testUri: vscode.Uri;

        beforeEach(() => {
            createHandler = jest.fn();
            changeHandler = jest.fn();
            deleteHandler = jest.fn();
            testUri = vscode.Uri.file('/test/file.md');

            fileWatcher.onFileCreated(createHandler);
            fileWatcher.onFileChanged(changeHandler);
            fileWatcher.onFileDeleted(deleteHandler);

            fileWatcher.startWatching('**/Memory/**/*.md');
            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;
        });

        it('should call registered create handlers when file is created', () => {
            // Trigger the create event
            mockWatcher._triggerCreate(testUri);

            expect(createHandler).toHaveBeenCalledWith(testUri);
        });

        it('should call registered change handlers when file is changed', () => {
            // Trigger the change event
            mockWatcher._triggerChange(testUri);

            expect(changeHandler).toHaveBeenCalledWith(testUri);
        });

        it('should call registered delete handlers when file is deleted', () => {
            // Trigger the delete event
            mockWatcher._triggerDelete(testUri);

            expect(deleteHandler).toHaveBeenCalledWith(testUri);
        });

        it('should call multiple registered handlers for the same event', () => {
            const secondCreateHandler = jest.fn();
            fileWatcher.onFileCreated(secondCreateHandler);

            // Re-start watching to register the new handler
            fileWatcher.startWatching('**/Memory/**/*.md');
            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[1].value;

            // Trigger the create event
            mockWatcher._triggerCreate(testUri);

            expect(createHandler).toHaveBeenCalledWith(testUri);
            expect(secondCreateHandler).toHaveBeenCalledWith(testUri);
        });

        it('should not throw error if handler throws exception', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Test error');
            });
            const normalHandler = jest.fn();

            fileWatcher.onFileCreated(errorHandler);
            fileWatcher.onFileCreated(normalHandler);

            fileWatcher.startWatching('**/Memory/**/*.md');
            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[1].value;

            // Should not throw
            expect(() => mockWatcher._triggerCreate(testUri)).not.toThrow();

            // Normal handler should still be called
            expect(normalHandler).toHaveBeenCalledWith(testUri);
        });
    });

    describe('stopWatching', () => {
        it('should dispose all event listeners and the watcher', () => {
            fileWatcher.startWatching('**/Memory/**/*.md');

            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;
            const onDidCreateDisposable = mockWatcher.onDidCreate.mock.results[0].value;
            const onDidChangeDisposable = mockWatcher.onDidChange.mock.results[0].value;
            const onDidDeleteDisposable = mockWatcher.onDidDelete.mock.results[0].value;

            fileWatcher.stopWatching();

            expect(onDidCreateDisposable.dispose).toHaveBeenCalled();
            expect(onDidChangeDisposable.dispose).toHaveBeenCalled();
            expect(onDidDeleteDisposable.dispose).toHaveBeenCalled();
            expect(mockWatcher.dispose).toHaveBeenCalled();
        });

        it('should not throw if called when not watching', () => {
            expect(() => fileWatcher.stopWatching()).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should stop watching and clear all handlers', () => {
            const createHandler = jest.fn();

            fileWatcher.onFileCreated(createHandler);
            fileWatcher.startWatching('**/Memory/**/*.md');

            fileWatcher.dispose();

            // Should have stopped watching
            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[0].value;
            expect(mockWatcher.dispose).toHaveBeenCalled();

            // If we start watching again and trigger an event, old handlers shouldn't be called
            fileWatcher.startWatching('**/Memory/**/*.md');
            mockWatcher = (vscode.workspace.createFileSystemWatcher as jest.Mock).mock.results[1].value;
            mockWatcher._triggerCreate(vscode.Uri.file('/test.md'));

            expect(createHandler).not.toHaveBeenCalled();
        });
    });
});
