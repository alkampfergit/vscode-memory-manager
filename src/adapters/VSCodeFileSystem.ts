import * as vscode from 'vscode';
import { IFileSystem } from '../core/interfaces/IFileSystem';

export class VSCodeFileSystem implements IFileSystem {
    async readFile(path: string): Promise<string> {
        const uri = vscode.Uri.file(path);
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString('utf-8');
    }

    async writeFile(path: string, content: string): Promise<void> {
        const uri = vscode.Uri.file(path);
        const buffer = Buffer.from(content, 'utf-8');
        await vscode.workspace.fs.writeFile(uri, buffer);
    }

    async fileExists(path: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(path);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    async readDirectory(path: string): Promise<string[]> {
        const uri = vscode.Uri.file(path);
        const entries = await vscode.workspace.fs.readDirectory(uri);
        return entries.map(([name]) => name);
    }

    watchFile(path: string, callback: () => void): void {
        const uri = vscode.Uri.file(path);
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(uri, '*')
        );
        watcher.onDidChange(callback);
        watcher.onDidCreate(callback);
        watcher.onDidDelete(callback);
    }
}