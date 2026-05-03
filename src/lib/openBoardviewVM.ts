import { Command } from "@tauri-apps/plugin-shell";

const LINUX_DOWNLOADS_SHARE_PREFIX = "/home/buckwheat/Downloads";
const VM_NAME = "Win10";
const BOARDVIEW_EXE_WINDOWS =
  "Z:\\backup\\lenovoIDEAPAD5\\Alternative BV Viewer (New)\\BoardViewer_NEW.exe";
const GUEST_USER = "vboxuser";
const GUEST_PASSWORD = "vboxuser";

const PATH_OUTSIDE_SHARE_MSG =
  "Plik musi znajdować się w folderze Downloads udostępnionym do VM jako Z:";

/** Mapuje ścieżkę hosta (Linux) na ścieżkę w udostępnionym dysku Z: w gościu. */
export function linuxPathToWindowsSharedPath(filePath: string): string {
  const normalized = filePath.trim().replace(/\/+/g, "/");
  if (!normalized.startsWith(LINUX_DOWNLOADS_SHARE_PREFIX)) {
    throw new Error(PATH_OUTSIDE_SHARE_MSG);
  }
  const tail = normalized.slice(LINUX_DOWNLOADS_SHARE_PREFIX.length).replace(/^\/+/, "");
  if (tail === "") {
    return "Z:\\";
  }
  return `Z:\\${tail.replace(/\//g, "\\")}`;
}

export async function isVirtualBoxVmRunning(vmName: string): Promise<boolean> {
  try {
    const r = await Command.create("vbox-list-running", ["list", "runningvms"]).execute();
    if (r.code !== 0) {
      console.error("VBoxManage list runningvms:", r.stderr || r.stdout || `(code ${r.code})`);
      return false;
    }
    return r.stdout.includes(`"${vmName}"`);
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function startVirtualBoxVmIfNeeded(vmName: string): Promise<void> {
  if (await isVirtualBoxVmRunning(vmName)) {
    return;
  }
  try {
    const r = await Command.create("vbox-start", ["startvm", vmName, "--type", "headless"]).execute();
    if (r.code !== 0) {
      console.error("VBoxManage startvm:", r.stderr || r.stdout || `(code ${r.code})`);
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Uruchamia BoardViewer w gościu Windows z podaną ścieżką pliku (Z:\…).
 * Przy kolejnych wywołaniach ponownie wykonuje guestcontrol run (nowy plik).
 */
export async function openBoardviewInVM(filePath: string): Promise<void> {
  const winFilePath = linuxPathToWindowsSharedPath(filePath);
  await startVirtualBoxVmIfNeeded(VM_NAME);
  try {
    const r = await Command.create("vbox-run-boardview", [
      "guestcontrol",
      VM_NAME,
      "run",
      "--exe",
      BOARDVIEW_EXE_WINDOWS,
      "--username",
      GUEST_USER,
      "--password",
      GUEST_PASSWORD,
      "--",
      BOARDVIEW_EXE_WINDOWS,
      winFilePath,
    ]).execute();
    if (r.code !== 0) {
      console.error("VBoxManage guestcontrol run:", r.stderr || r.stdout || `(code ${r.code})`);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}
