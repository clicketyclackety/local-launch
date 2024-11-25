import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "local-launch" is now active!');

    const disposable = vscode.commands.registerCommand('local-launch.addLaunchConfigs', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workspaceFolder = workspaceFolders[0];
        const workspacePath = workspaceFolder.uri.fsPath;
        const vscodeFolderPath = path.join(workspacePath, '.vscode');
        const launchJsonPath = path.join(vscodeFolderPath, 'launch.json');

        if (!fs.existsSync(vscodeFolderPath)) {
            fs.mkdirSync(vscodeFolderPath);
        }

        let originalLaunchConfig: string | null = null;
        if (fs.existsSync(launchJsonPath)) {
            originalLaunchConfig = fs.readFileSync(launchJsonPath, 'utf8');
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
                vscode.window.showWarningMessage('Failed to parse launch.json, using fallback');
                await DebugFallback(workspaceFolder, launchConfig);
                return;
            }
        }

        // Determine the parent directory of the currently open file
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            await DebugFallback(workspaceFolder, launchConfig);
            return;
        }

        const currentFilePath = activeEditor.document.uri.fsPath;

        let parentDirectoryPath = path.dirname(currentFilePath);
        let parentLaunchJsonPath = '';

        while (!fs.existsSync(parentLaunchJsonPath)) {
            
            if (parentLaunchJsonPath === launchJsonPath) {
                vscode.window.showErrorMessage('Using default launch.json');
                break;
            }

            if (parentDirectoryPath === "") {
                vscode.window.showErrorMessage('No launch.json found in any .vscode folder');
                return;
            }
            
            parentDirectoryPath = path.dirname(parentDirectoryPath);
            parentLaunchJsonPath = path.join(parentDirectoryPath, '.vscode', 'launch.json');
        }

        let parentLaunchConfig: LaunchConfig;
        try {
            const parentLaunchJsonContent = fs.readFileSync(parentLaunchJsonPath, 'utf8');
            parentLaunchConfig = JSON.parse(sanitizeJson(parentLaunchJsonContent));
        } catch (error) {
            vscode.window.showWarningMessage('Failed to parse launch.json, using fallback');
            await DebugFallback(workspaceFolder, launchConfig);
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
            await vscode.debug.startDebugging(workspaceFolder, debugConfig);
        } else {
            vscode.window.showErrorMessage('Failed to find the new debug configuration');
            await DebugFallback(workspaceFolder, launchConfig);
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

async function DebugFallback(workspaceFolder: vscode.WorkspaceFolder, launchConfig: LaunchConfig) {
    const defaultDebugConfig = launchConfig.configurations[0];
    await vscode.debug.startDebugging(workspaceFolder, defaultDebugConfig!);
}

export function deactivate() {}

// Function to sanitize JSON content by removing comments and trailing commas
function sanitizeJson(jsonString: string): string {
    return jsonString.toString()
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing brace
        .replace(/,\s*]/g, ']'); // Remove trailing commas before closing bracket
}