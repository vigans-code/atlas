const vscode = require("vscode");
const { randomBytes } = require("node:crypto");

const { AtlasClient } = require("./lib/client.cjs");
const { buildEditorPrompt, extractFirstCodeBlock } = require("./lib/context.cjs");

const TOKEN_KEY = "atlas.pairingToken";
const HISTORY_KEY = "atlas.chatHistory.v1";

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  status.command = "atlas.connect";
  status.name = "Atlas Companion";
  status.text = "$(plug) Atlas";
  status.tooltip = "Connect Atlas Companion";
  status.show();

  const provider = new AtlasChatViewProvider(context, status);
  context.subscriptions.push(
    status,
    vscode.window.registerWebviewViewProvider("atlas.chat", provider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("atlas.showPanel", () => provider.reveal()),
    vscode.commands.registerCommand("atlas.connect", () => provider.connect()),
    vscode.commands.registerCommand("atlas.newChat", () => provider.clear()),
    vscode.commands.registerCommand("atlas.askSelection", () => askAboutSelection(provider)),
    vscode.commands.registerCommand("atlas.explainSelection", () => sendSelection(provider, "Explain this code clearly, including its purpose, data flow, and important edge cases.")),
    vscode.commands.registerCommand("atlas.reviewFile", () => reviewCurrentFile(provider)),
    vscode.commands.registerCommand("atlas.previewLastCode", () => previewLastCode(provider)),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("atlas.bridgeUrl")) void provider.refreshConnection();
    }),
  );
  void provider.refreshConnection();
}

class AtlasChatViewProvider {
  constructor(context, status) {
    this.context = context;
    this.status = status;
    this.view = undefined;
    this.busy = false;
    const saved = context.globalState.get(HISTORY_KEY, []);
    this.messages = Array.isArray(saved)
      ? saved.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string").slice(-40)
      : [];
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.html = createWebviewHtml(view.webview);
    view.webview.onDidReceiveMessage(async (message) => {
      if (!message || typeof message.type !== "string") return;
      if (message.type === "send" && typeof message.text === "string") await this.sendPrompt(message.text);
      if (message.type === "connect") await this.connect();
      if (message.type === "clear") await this.clear();
      if (message.type === "preview") await previewLastCode(this);
    });
    this.render();
  }

  async connect() {
    const token = await vscode.window.showInputBox({
      title: "Connect Atlas Desktop",
      prompt: "Copy the pairing token from Atlas → Settings → Security → VS Code companion.",
      placeHolder: "Paste the Atlas pairing token",
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => value.trim().length < 32 ? "The pairing token is too short." : undefined,
    });
    if (!token) return false;
    try {
      const client = this.createClient(token.trim());
      await client.checkConnection();
      await this.context.secrets.store(TOKEN_KEY, token.trim());
      this.setConnected(true);
      this.render();
      void vscode.window.showInformationMessage("Atlas Companion connected securely.");
      return true;
    } catch (error) {
      this.setConnected(false);
      void vscode.window.showErrorMessage(cleanError(error));
      return false;
    }
  }

  async refreshConnection() {
    const token = await this.context.secrets.get(TOKEN_KEY);
    if (!token) {
      this.setConnected(false);
      this.render();
      return false;
    }
    try {
      await this.createClient(token).checkConnection();
      this.setConnected(true);
      this.render();
      return true;
    } catch {
      this.setConnected(false);
      this.render();
      return false;
    }
  }

  async sendPrompt(value) {
    const prompt = String(value || "").trim();
    if (!prompt || this.busy) return;
    let token = await this.context.secrets.get(TOKEN_KEY);
    if (!token) {
      const connected = await this.connect();
      if (!connected) return;
      token = await this.context.secrets.get(TOKEN_KEY);
    }
    if (!token) return;

    this.messages.push({ role: "user", content: prompt });
    this.messages = boundHistory(this.messages);
    this.busy = true;
    this.render();
    await this.persist();
    try {
      const content = await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Atlas is thinking…", cancellable: false }, () => (
        this.createClient(token).chat(this.messages, "code")
      ));
      this.messages.push({ role: "assistant", content });
      this.messages = boundHistory(this.messages);
      this.setConnected(true);
    } catch (error) {
      const message = cleanError(error);
      if (/pair|401|token/i.test(message)) this.setConnected(false);
      void vscode.window.showErrorMessage(message);
    } finally {
      this.busy = false;
      await this.persist();
      this.render();
    }
  }

  async clear() {
    this.messages = [];
    await this.persist();
    this.render();
  }

  async reveal() {
    await vscode.commands.executeCommand("workbench.view.extension.atlas-secondary");
    this.view?.show?.(true);
  }

  lastAssistantMessage() {
    return [...this.messages].reverse().find((message) => message.role === "assistant")?.content || "";
  }

  createClient(token) {
    const baseUrl = vscode.workspace.getConfiguration("atlas").get("bridgeUrl", "http://127.0.0.1:47635");
    return new AtlasClient(baseUrl, token);
  }

  setConnected(connected) {
    this.connected = connected;
    this.status.text = connected ? "$(check) Atlas" : "$(plug) Atlas";
    this.status.tooltip = connected ? "Atlas Companion connected locally" : "Connect Atlas Companion";
  }

  render() {
    void this.view?.webview.postMessage({ type: "state", messages: this.messages, busy: this.busy, connected: Boolean(this.connected) });
  }

  persist() {
    return this.context.globalState.update(HISTORY_KEY, boundHistory(this.messages));
  }
}

async function askAboutSelection(provider) {
  const instruction = await vscode.window.showInputBox({ title: "Ask Atlas About Selection", prompt: "What should Atlas do with the selected code?", placeHolder: "Debug, refactor, add tests…" });
  if (!instruction) return;
  await sendSelection(provider, instruction);
}

async function sendSelection(provider, instruction) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    void vscode.window.showInformationMessage("Select code in an editor first.");
    return;
  }
  const original = editor.document.getText(editor.selection);
  const prompt = buildEditorPrompt({
    instruction,
    code: original,
    language: editor.document.languageId,
    fileName: contextFileName(editor.document),
    truncated: original.length > 32_000,
  });
  await provider.reveal();
  await provider.sendPrompt(prompt);
}

async function reviewCurrentFile(provider) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showInformationMessage("Open a file to review it with Atlas.");
    return;
  }
  const original = editor.document.getText();
  const prompt = buildEditorPrompt({
    instruction: "Review this file for correctness, security, error handling, maintainability, and missing tests. Prioritize concrete findings and provide corrected code where useful.",
    code: original,
    language: editor.document.languageId,
    fileName: contextFileName(editor.document),
    truncated: original.length > 32_000,
  });
  await provider.reveal();
  await provider.sendPrompt(prompt);
}

async function previewLastCode(provider) {
  const response = provider.lastAssistantMessage();
  if (!response) {
    void vscode.window.showInformationMessage("Atlas has not produced a code response yet.");
    return;
  }
  const language = vscode.window.activeTextEditor?.document.languageId || "plaintext";
  const document = await vscode.workspace.openTextDocument({ content: extractFirstCodeBlock(response), language });
  await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Beside });
}

function contextFileName(document) {
  if (!vscode.workspace.getConfiguration("atlas").get("includeFilePaths", true)) return "current editor";
  return vscode.workspace.asRelativePath(document.uri, false);
}

function boundHistory(messages) {
  const result = [];
  let characters = 0;
  for (const message of [...messages].reverse()) {
    const content = String(message.content || "").slice(0, 32_000);
    if (characters + content.length > 120_000) break;
    result.unshift({ role: message.role, content });
    characters += content.length;
    if (result.length >= 40) break;
  }
  return result;
}

function cleanError(error) {
  if (error?.name === "TimeoutError") return "Atlas timed out. Make sure the desktop app and its model are running.";
  const message = error instanceof Error ? error.message : "Atlas Companion request failed.";
  if (/fetch failed|ECONNREFUSED/i.test(message)) return "Atlas desktop is not reachable. Open Atlas, then try again.";
  return message;
}

function createWebviewHtml(webview) {
  const nonce = randomBytes(16).toString("base64");
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<style nonce="${nonce}">
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  .shell { display:flex; flex-direction:column; height:100vh; min-height:260px; }
  .status { display:flex; align-items:center; gap:7px; padding:10px 12px; border-bottom:1px solid var(--vscode-sideBarSectionHeader-border, transparent); color:var(--vscode-descriptionForeground); font-size:11px; }
  .dot { width:7px; height:7px; border-radius:50%; background:var(--vscode-testing-iconFailed); }
  .dot.online { background:var(--vscode-testing-iconPassed); }
  .connect { margin-left:auto; border:0; background:none; color:var(--vscode-textLink-foreground); cursor:pointer; font:inherit; }
  .messages { flex:1; overflow:auto; padding:12px; }
  .empty { padding:28px 6px; color:var(--vscode-descriptionForeground); line-height:1.55; }
  .empty h2 { color:var(--vscode-foreground); font-size:18px; font-weight:500; margin:0 0 8px; }
  .message { margin:0 0 16px; }
  .role { margin-bottom:5px; color:var(--vscode-descriptionForeground); font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; }
  .content { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.55; }
  .assistant { border-left:2px solid var(--vscode-textLink-foreground); padding-left:10px; }
  .thinking { color:var(--vscode-descriptionForeground); animation:pulse 1.2s infinite; }
  .composer { border-top:1px solid var(--vscode-sideBarSectionHeader-border, transparent); padding:10px; }
  textarea { width:100%; min-height:66px; max-height:180px; resize:vertical; border:1px solid var(--vscode-input-border, transparent); border-radius:5px; padding:8px; color:var(--vscode-input-foreground); background:var(--vscode-input-background); font:inherit; outline:none; }
  textarea:focus { border-color:var(--vscode-focusBorder); }
  .actions { display:flex; align-items:center; gap:7px; margin-top:8px; }
  button.action { border:1px solid var(--vscode-button-border, transparent); border-radius:3px; padding:5px 9px; background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); cursor:pointer; font:inherit; font-size:11px; }
  button.primary { margin-left:auto; background:var(--vscode-button-background); color:var(--vscode-button-foreground); }
  button:disabled { opacity:.5; cursor:not-allowed; }
  @keyframes pulse { 50% { opacity:.45; } }
</style></head>
<body><div class="shell">
  <div class="status"><span id="dot" class="dot"></span><span id="statusText">Not connected</span><button id="connect" class="connect">Connect</button></div>
  <main id="messages" class="messages" aria-live="polite"></main>
  <form id="form" class="composer"><textarea id="draft" aria-label="Message Atlas" placeholder="Ask Atlas to build, debug, explain, or review…"></textarea><div class="actions"><button id="clear" type="button" class="action">New chat</button><button id="preview" type="button" class="action">Preview code</button><button id="send" type="submit" class="action primary">Send</button></div></form>
</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const elements = { messages:document.getElementById('messages'), draft:document.getElementById('draft'), send:document.getElementById('send'), dot:document.getElementById('dot'), status:document.getElementById('statusText') };
  let state = { messages:[], busy:false, connected:false };
  function render() {
    elements.messages.replaceChildren();
    if (!state.messages.length) {
      const empty=document.createElement('div'); empty.className='empty';
      const heading=document.createElement('h2'); heading.textContent='Code with Atlas';
      const copy=document.createElement('div'); copy.textContent='Ask questions here, or select code and use “Atlas: Ask About Selection” from the editor menu.';
      empty.append(heading,copy); elements.messages.append(empty);
    }
    for (const message of state.messages) {
      const row=document.createElement('article'); row.className='message '+(message.role==='assistant'?'assistant':'');
      const role=document.createElement('div'); role.className='role'; role.textContent=message.role==='assistant'?'Atlas':'You';
      const content=document.createElement('div'); content.className='content'; content.textContent=message.content;
      row.append(role,content); elements.messages.append(row);
    }
    if (state.busy) { const thinking=document.createElement('div'); thinking.className='thinking'; thinking.textContent='Atlas is thinking…'; elements.messages.append(thinking); }
    elements.dot.classList.toggle('online',state.connected); elements.status.textContent=state.connected?'Connected locally':'Not connected';
    elements.send.disabled=state.busy; elements.draft.disabled=state.busy;
    elements.messages.scrollTop=elements.messages.scrollHeight;
  }
  window.addEventListener('message',event=>{ if(event.data?.type==='state'){state=event.data;render();} });
  document.getElementById('form').addEventListener('submit',event=>{event.preventDefault();const text=elements.draft.value.trim();if(text&&!state.busy){vscode.postMessage({type:'send',text});elements.draft.value='';}});
  elements.draft.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();document.getElementById('form').requestSubmit();}});
  document.getElementById('connect').addEventListener('click',()=>vscode.postMessage({type:'connect'}));
  document.getElementById('clear').addEventListener('click',()=>vscode.postMessage({type:'clear'}));
  document.getElementById('preview').addEventListener('click',()=>vscode.postMessage({type:'preview'}));
  render();
</script></body></html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };
