import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  reference: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, reference: null };

  static getDerivedStateFromError(): State {
    return { failed: true, reference: crypto.randomUUID().slice(0, 8) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Atlas renderer error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid h-screen place-items-center bg-[#0d0f12] p-6 text-center text-zinc-100">
        <div className="max-w-md rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-8">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-300/70" />
          <h1 className="mt-4 text-lg font-semibold">Atlas could not render this screen</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Reload the local interface. No extension code was executed.</p>
          <p className="mt-3 text-[11px] text-zinc-700">Reference {this.state.reference}</p>
          <button type="button" onClick={() => window.location.reload()} className="atlas-accent-bg mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"><RotateCcw className="h-3.5 w-3.5" /> Reload Atlas</button>
        </div>
      </div>
    );
  }
}
