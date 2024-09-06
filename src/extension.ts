import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "local-launch" is now active!');

    const disposable = vscode.commands.registerCommand('local-launch.addLaunchConfigs', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const vscodeFolderPath = path.join(workspacePath, '.vscode');
        const launchJsonPath = path.join(vscodeFolderPath, 'launch.json');

        if (!fs.existsSync(vscodeFolderPath)) {
            fs.mkdirSync(vscodeFolderPath);
        }

        let originalLaunchConfig: string | null = null;
        if (fs.existsSync(launchJsonPath)) {
            originalLaunchConfig = fs.readFileSync(launchJsonPath, 'utf8');
        }

        interface LaunchConfig {
            version: string;
            configurations: Array<{
                name: string;
                type: string;
                request: string;
                program: string;
                cwd: string;
                console: string;
            }>;
        }

        let launchConfig: LaunchConfig = {
            version: '0.2.0',
            configurations: []
        };

        if (originalLaunchConfig) {
            try {
                const json = sanitizeJson(originalLaunchConfig);
                launchConfig = JSON.parse(json);
            } catch (error) {
                vscode.window.showErrorMessage('Failed to parse launch.json');
                return;
            }
        }

        // Determine the parent directory of the currently open file
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const currentFilePath = activeEditor.document.uri.fsPath;
        const parentDirectoryPath = path.dirname(currentFilePath);
        const parentVscodeFolderPath = path.join(parentDirectoryPath, '.vscode');
        const parentLaunchJsonPath = path.join(parentVscodeFolderPath, 'launch.json');

        if (!fs.existsSync(parentLaunchJsonPath)) {
            vscode.window.showErrorMessage('No launch.json found in the parent .vscode folder');
            return;
        }

        let parentLaunchConfig: LaunchConfig;
        try {
            const parentLaunchJsonContent = fs.readFileSync(parentLaunchJsonPath, 'utf8');
            parentLaunchConfig = JSON.parse(sanitizeJson(parentLaunchJsonContent));
        } catch (error) {
            vscode.window.showErrorMessage('Failed to parse parent launch.json');
            return;
        }

        // Assuming you want to take the first configuration from the parent launch.json
        const newConfig = parentLaunchConfig.configurations[0];
        if (!newConfig) {
            vscode.window.showErrorMessage('No configurations found in the parent launch.json');
            return;
        }

        const configNameToUpdate = newConfig.name;

        // Find and update the existing configuration
        const existingConfigIndex = launchConfig.configurations.findIndex(config => config.name === configNameToUpdate);
        if (existingConfigIndex !== -1) {
            launchConfig.configurations[existingConfigIndex] = newConfig;
        } else {
            launchConfig.configurations.push(newConfig);
        }

        fs.writeFileSync(launchJsonPath, JSON.stringify(launchConfig, null, 4));
        vscode.window.showInformationMessage('Launch configuration added or updated!');

        // Start the debugging session with the new configuration
        const debugConfig = launchConfig.configurations.find(config => config.name === configNameToUpdate);
        if (debugConfig) {
            await vscode.debug.startDebugging(workspaceFolders[0], debugConfig);
        } else {
            vscode.window.showErrorMessage('Failed to find the new debug configuration');
        }

        // Revert the launch.json to its original state
        if (originalLaunchConfig) {
            fs.writeFileSync(launchJsonPath, originalLaunchConfig);
        } else {
            fs.unlinkSync(launchJsonPath);
        }
        vscode.window.showInformationMessage('Launch configuration reverted!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

// Function to sanitize JSON content by removing comments and trailing commas
function sanitizeJson(jsonString: string): string {
    return jsonString
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing brace
        .replace(/,\s*]/g, ']'); // Remove trailing commas before closing bracket
}