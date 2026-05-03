import { dirname } from "@tauri-apps/api/path";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Command, open as shellOpen } from "@tauri-apps/plugin-shell";

/** Otwiera plik domyślną aplikacją (Tauri Shell `open`). */
export async function openRepairFileWithShell(filePath: string): Promise<void> {
  const p = filePath.trim();
  if (p === "") return;
  try {
    await shellOpen(p);
  } catch {
    /* brak aplikacji / odrzucone przez konfigurację shell.open */
  }
}

function isLinuxDesktop(): boolean {
  const ua = navigator.userAgent;
  return /Linux/i.test(ua) && !/Android/i.test(ua);
}

/**
 * Otwiera menedżer plików w lokalizacji pliku.
 * Na Linuxie: `xdg-open` na katalogu nadrzędnym (Tauri Shell `Command`).
 * Na innych platformach: `revealItemInDir` z pluginu opener.
 */
export async function openFileLocation(filePath: string): Promise<void> {
  const p = filePath.trim();
  if (p === "") return;
  try {
    if (isLinuxDesktop()) {
      const dir = await dirname(p);
      await Command.create("xdg-open-dir", [dir]).execute();
      return;
    }
    await revealItemInDir(p);
  } catch {
    /* brak xdg-open / menedżera plików */
  }
}

/** Kopiuje pełną ścieżkę do schowka (Clipboard API przeglądarki / webview). */
export async function copyPathToClipboard(text: string): Promise<void> {
  const t = text.trim();
  if (t === "") return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
    }
  } catch {
    /* brak uprawnień schowka */
  }
}
