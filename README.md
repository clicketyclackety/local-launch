# Local Launch

## Overview

**Local Launch** is a VS Code extension which allows you to use localised `.vscode` folders in your code.
I work with a large codebase all day and having some smaller .vscode folders embedded in smaller projects is really handy for speeding up debugging and allows me to avoid modifying the `launch.json` files for many other developers who don't need my very specific launch settings.

Currently only `launch.json` is supported. And is only allowed to have one task. I will work to improve this extension as necessary. But I suspect this is all I'll need.

## Features

- Automatically adds or updates launch configurations in the current workspace.
- Iherits from the root directory's `.vscode` folder.
- Reverts the `launch.json` file to its original state after the debugging session.

## Usage

1. Open a folder in Visual Studio Code.
2. Ensure there is a `.vscode` folder with a `launch.json` file in the parent directory of the currently open file.
3. Run the command `Debug with Local Launch Configurations` from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).

### Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

- Thanks to the VS Code team for their excellent documentation and tools.
- And thanks to Copilot for writing this.
