export const window = {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
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
    constructor(
        public startLine: number,
        public startCharacter: number,
        public endLine: number,
        public endCharacter: number
    ) {}
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