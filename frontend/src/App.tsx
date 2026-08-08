import { AppShell } from "./components/AppShell";
import { Chat } from "./features/chat/Chat";
import { CodeAgent } from "./features/code/CodeAgent";
import { Extensions } from "./features/extensions/Extensions";
import { ImagesWorkspace } from "./features/images/ImagesWorkspace";
import { Projects } from "./features/projects/Projects";
import { Research } from "./features/research/Research";
import { SettingsPage } from "./features/settings/SettingsPage";
import { usePathname } from "./lib/router";

export function App() {
  const pathname = usePathname();

  const page = (() => {
    switch (pathname) {
      case "/":
        return <CodeAgent />;
      case "/chat":
        return <Chat />;
      case "/projects":
        return <Projects />;
      case "/images":
        return <ImagesWorkspace />;
      case "/research":
        return <Research />;
      case "/extensions":
        return <Extensions />;
      case "/settings":
        return <SettingsPage />;
      default:
        return <CodeAgent />;
    }
  })();

  return <AppShell>{page}</AppShell>;
}
