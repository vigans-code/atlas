import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface InstalledExtension {
  schemaVersion: 1;
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  enabled: boolean;
  importedAt: string;
}

interface ExtensionState {
  extensions: InstalledExtension[];
  installManifest: (manifest: AtlasExtensionManifest) => void;
  toggleExtension: (id: string) => void;
  removeExtension: (id: string) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set) => ({
      extensions: [],
      installManifest: (manifest) =>
        set((state) => ({
          extensions: [
            { ...manifest, enabled: false, importedAt: new Date().toISOString() },
            ...state.extensions.filter((extension) => extension.id !== manifest.id),
          ],
        })),
      toggleExtension: (id) =>
        set((state) => ({
          extensions: state.extensions.map((extension) =>
            extension.id === id ? { ...extension, enabled: !extension.enabled } : extension,
          ),
        })),
      removeExtension: (id) =>
        set((state) => ({ extensions: state.extensions.filter((extension) => extension.id !== id) })),
    }),
    { name: "atlas-extension-manifests" },
  ),
);
