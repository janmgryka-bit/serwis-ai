/** Ostatni segment ścieżki (Windows lub POSIX). */
export function fileNameFromPath(path: string): string {
  const t = path.trim();
  if (t === "") return "";
  return t.split(/[/\\]/).pop() ?? "";
}
