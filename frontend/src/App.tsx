import { lazy, Suspense } from "react";

import { AppShell } from "./components/AppShell";
import { AtlasLoader } from "./components/AtlasAtom";
import { Home } from "./features/home/Home";
import { usePathname } from "./lib/router";

const Chat = lazy(() => import("./features/chat/Chat").then((module) => ({ default: module.Chat })));
const CodeAgent = lazy(() => import("./features/code/CodeAgent").then((module) => ({ default: module.CodeAgent })));
const Extensions = lazy(() => import("./features/extensions/Extensions").then((module) => ({ default: module.Extensions })));
const Files = lazy(() => import("./features/files/Files").then((module) => ({ default: module.Files })));
const History = lazy(() => import("./features/history/History").then((module) => ({ default: module.History })));
const ImagesWorkspace = lazy(() => import("./features/images/ImagesWorkspace").then((module) => ({ default: module.ImagesWorkspace })));
const Projects = lazy(() => import("./features/projects/Projects").then((module) => ({ default: module.Projects })));
const Research = lazy(() => import("./features/research/Research").then((module) => ({ default: module.Research })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function App() {
  const pathname = usePathname();

  const page = (() => {
    switch (pathname) {
      case "/":
        return <Home />;
      case "/chat":
        return <Chat />;
      case "/image":
        return <ImagesWorkspace />;
      case "/code":
        return <CodeAgent />;
      case "/search":
        return <Research />;
      case "/files":
        return <Files />;
      case "/projects":
        return <Projects />;
      case "/history":
        return <History />;
      case "/extensions":
        return <Extensions />;
      case "/settings":
        return <SettingsPage />;
      default:
        return <Home />;
    }
  })();

  return <AppShell><Suspense fallback={<div className="grid h-full place-items-center"><AtlasLoader label="Loading workspace" /></div>}>{page}</Suspense></AppShell>;
}
