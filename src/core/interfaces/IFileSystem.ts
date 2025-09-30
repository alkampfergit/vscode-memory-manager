export interface IFileSystem {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    fileExists(path: string): Promise<boolean>;
    readDirectory(path: string): Promise<string[]>;
    watchFile(path: string, callback: () => void): void;
}