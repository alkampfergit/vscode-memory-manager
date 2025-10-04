export class OutputChannel {
    public name: string;
    private lines: string[] = [];

    constructor(name: string) {
        this.name = name;
    }

    append(value: string): void {
        this.lines.push(value);
    }

    appendLine(value: string): void {
        this.lines.push(value + '\n');
    }

    clear(): void {
        this.lines = [];
    }

    show(preserveFocus?: boolean): void {
        // Mock implementation - does nothing in tests
    }

    hide(): void {
        // Mock implementation
    }

    dispose(): void {
        this.lines = [];
    }

    getLines(): string[] {
        return [...this.lines];
    }
}

export const window = {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    createOutputChannel: jest.fn((name: string) => new OutputChannel(name)),
};

export const workspace = {
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
        readDirectory: jest.fn(),
    },
    createFileSystemWatcher: jest.fn(() => {
        const createCallback = jest.fn();
        const changeCallback = jest.fn();
        const deleteCallback = jest.fn();

        return {
            onDidCreate: jest.fn((handler) => {
                createCallback.mockImplementation(handler);
                return { dispose: jest.fn() };
            }),
            onDidChange: jest.fn((handler) => {
                changeCallback.mockImplementation(handler);
                return { dispose: jest.fn() };
            }),
            onDidDelete: jest.fn((handler) => {
                deleteCallback.mockImplementation(handler);
                return { dispose: jest.fn() };
            }),
            dispose: jest.fn(),
            // Expose callbacks for testing
            _triggerCreate: createCallback,
            _triggerChange: changeCallback,
            _triggerDelete: deleteCallback,
        };
    }),
};

export class Uri {
    static file(path: string): Uri {
        return new Uri(path);
    }

    constructor(public fsPath: string) {}
}

export class RelativePattern {
    constructor(public base: Uri, public pattern: string) {}
}

export class Range {
    public start: Position;
    public end: Position;

    constructor(
        startLine: number,
        startCharacter: number,
        endLine: number,
        endCharacter: number
    ) {
        this.start = new Position(startLine, startCharacter);
        this.end = new Position(endLine, endCharacter);
    }
}

export class Position {
    constructor(public line: number, public character: number) {}
}

export enum CompletionItemKind {
    Text = 0,
    Method = 1,
    Function = 2,
    Constructor = 3,
    Field = 4,
    Variable = 5,
    Class = 6,
    Interface = 7,
    Module = 8,
    Property = 9,
    Unit = 10,
    Value = 11,
    Enum = 12,
    Keyword = 13,
    Snippet = 14,
    Color = 15,
    File = 16,
    Reference = 17,
    Folder = 18,
}

export enum CompletionTriggerKind {
    Invoke = 0,
    TriggerCharacter = 1,
    TriggerForIncompleteCompletions = 2,
}

export class CompletionItem {
    constructor(public label: string, public kind?: CompletionItemKind) {}
    insertText?: string;
    filterText?: string;
    detail?: string;
    documentation?: string | MarkdownString;
    sortText?: string;
}

export class MarkdownString {
    constructor(public value?: string) {}
}

export class Diagnostic {
    constructor(
        public range: Range,
        public message: string,
        public severity?: DiagnosticSeverity
    ) {}
    public source?: string;
}

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3,
}

export class DiagnosticCollection {
    private diagnostics: Map<string, Diagnostic[]> = new Map();

    constructor(public name: string) {}

    set(uri: Uri, diagnostics: Diagnostic[]): void {
        this.diagnostics.set(uri.fsPath, diagnostics);
    }

    delete(uri: Uri): void {
        this.diagnostics.delete(uri.fsPath);
    }

    clear(): void {
        this.diagnostics.clear();
    }

    get(uri: Uri): Diagnostic[] | undefined {
        return this.diagnostics.get(uri.fsPath);
    }

    forEach(callback: (uri: Uri, diagnostics: Diagnostic[]) => void): void {
        this.diagnostics.forEach((diagnostics, fsPath) => {
            callback(Uri.file(fsPath), diagnostics);
        });
    }

    dispose(): void {
        this.diagnostics.clear();
    }
}

export const languages = {
    createDiagnosticCollection: jest.fn((name: string) => new DiagnosticCollection(name)),
};