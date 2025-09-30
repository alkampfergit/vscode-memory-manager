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