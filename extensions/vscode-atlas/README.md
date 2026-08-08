# Atlas Companion for VS Code

Atlas Companion brings the local Atlas Code Agent into Visual Studio Code without exposing Atlas to the network or uploading a workspace automatically.

## Connect

1. Start the Atlas desktop app.
2. Open **Settings → Security → VS Code companion** in Atlas.
3. Press **Copy** beside the pairing token.
4. In VS Code, run **Atlas: Connect to Desktop** from the Command Palette and paste the token.
5. Open the **Atlas** tab in the Secondary Sidebar beside Chat and Codex.

The token is stored with VS Code SecretStorage. Atlas listens only on `127.0.0.1:47635`, rate-limits requests, and requires the bearer token for every capability endpoint.

## Commands

- **Atlas: Connect to Desktop** — pair this VS Code installation.
- **Atlas: Ask About Selection** — send only the selected editor text after entering an instruction.
- **Atlas: Explain Selection** — explain selected code.
- **Atlas: Review Current File** — explicitly send the current file, capped at 32,000 characters.
- **Atlas: Preview Last Code Response** — open generated code in an untitled editor without modifying project files.
- **Atlas: New Chat** — clear the extension conversation.

Chat history stays in VS Code global storage. The extension does not run terminal commands or apply file edits silently.

## Development

```powershell
npm install
npm test
npm run package
```

Press `F5` from the extension folder to test it in an Extension Development Host, or install the generated `.vsix` with **Extensions: Install from VSIX…**.
