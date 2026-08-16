import { create } from "zustand";

export type AtlasFileKind = "image" | "document" | "data" | "code" | "archive" | "other";

export interface LibraryFile extends AtlasSelectedFile {
  displayName: string;
  kind: AtlasFileKind;
  addedAt: string;
}

interface FileState {
  files: LibraryFile[];
  addFiles: (files: AtlasSelectedFile[]) => LibraryFile[];
  renameFile: (id: string, name: string) => void;
  removeFile: (id: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  addFiles: (selected) => {
    const added = selected.map((file) => ({
      ...file,
      displayName: file.name,
      kind: fileKind(file.name),
      addedAt: new Date().toISOString(),
    }));
    set((state) => ({
      files: [...added, ...state.files.filter((file) => !added.some((next) => next.id === file.id))].slice(0, 100),
    }));
    return added;
  },
  renameFile: (id, name) => set((state) => ({
    files: state.files.map((file) => file.id === id ? { ...file, displayName: name.trim().slice(0, 180) || file.displayName } : file),
  })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((file) => file.id !== id) })),
}));

function fileKind(name: string): AtlasFileKind {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(extension)) return "image";
  if (["pdf", "txt", "md", "doc", "docx", "rtf"].includes(extension)) return "document";
  if (["csv", "json", "xml", "yaml", "yml", "toml"].includes(extension)) return "data";
  if (["js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp", "cs", "html", "css", "sql", "sh", "ps1"].includes(extension)) return "code";
  if (["zip", "tar", "gz", "7z", "rar"].includes(extension)) return "archive";
  return "other";
}
