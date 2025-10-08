import * as vscode from 'vscode';

/**
 * Manages VS Code diagnostics for memory files
 * Reports YAML validation errors in the Problems Panel
 * Per Feature 8, Story 2: Show errors directly on files in the editor
 */
export class DiagnosticReporter {
    private static instance: DiagnosticReporter;
    private diagnosticCollection: vscode.DiagnosticCollection;

    private constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('memoryManager');
    }

    /**
     * Gets the singleton instance of DiagnosticReporter
     */
    public static getInstance(): DiagnosticReporter {
        if (!DiagnosticReporter.instance) {
            DiagnosticReporter.instance = new DiagnosticReporter();
        }
        return DiagnosticReporter.instance;
    }

    /**
     * Reports a validation error for a memory file
     * Shows the error in the Problems Panel
     *
     * @param filePath Path to the file with the error
     * @param message Error message
     * @param line Line number where the error occurred (0-based), defaults to 0
     */
    public reportValidationError(filePath: string, message: string, line: number = 0): void {
        const uri = vscode.Uri.file(filePath);

        // Create a diagnostic for the error
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
            message,
            vscode.DiagnosticSeverity.Error
        );

        diagnostic.source = 'Memory Manager';

        // Set the diagnostic for this file
        this.diagnosticCollection.set(uri, [diagnostic]);
    }

    /**
     * Reports a YAML frontmatter parsing error
     * Specifically for YAML parsing issues
     */
    public reportYAMLError(filePath: string, error: Error, line: number = 0): void {
        const message = `YAML Frontmatter Error: ${error.message}`;
        this.reportValidationError(filePath, message, line);
    }

    /**
     * Reports a missing required field error
     */
    public reportMissingFieldError(filePath: string, fieldName: string): void {
        const message = `Missing required field: ${fieldName}`;
        this.reportValidationError(filePath, message, 0);
    }

    /**
     * Reports a field type error
     */
    public reportFieldTypeError(filePath: string, fieldName: string, expectedType: string): void {
        const message = `Field "${fieldName}" must be ${expectedType}`;
        this.reportValidationError(filePath, message, 0);
    }

    /**
     * Clears diagnostics for a specific file
     * Call this when a file is fixed or deleted
     */
    public clearDiagnostics(filePath: string): void {
        const uri = vscode.Uri.file(filePath);
        this.diagnosticCollection.delete(uri);
    }

    /**
     * Clears all diagnostics
     */
    public clearAll(): void {
        this.diagnosticCollection.clear();
    }

    /**
     * Gets all current diagnostics
     * Useful for testing
     */
    public getAllDiagnostics(): Map<string, vscode.Diagnostic[]> {
        const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

        this.diagnosticCollection.forEach((uri, diagnostics) => {
            diagnosticsMap.set(uri.fsPath, [...diagnostics]);
        });

        return diagnosticsMap;
    }

    /**
     * Gets diagnostics for a specific file
     */
    public getDiagnosticsForFile(filePath: string): vscode.Diagnostic[] {
        const uri = vscode.Uri.file(filePath);
        const diagnostics = this.diagnosticCollection.get(uri);
        return diagnostics ? [...diagnostics] : [];
    }

    /**
     * Disposes the diagnostic collection
     */
    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
