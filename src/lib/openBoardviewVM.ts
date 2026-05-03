import { Command } from "@tauri-apps/plugin-shell";

const LINUX_DOWNLOADS_SHARE_PREFIX = "/home/buckwheat/Downloads";
const VM_NAME = "Serwis_Win10";
const BOARDVIEW_EXE_WINDOWS =
  "Z:\\backup\\lenovoIDEAPAD5\\Alternative BV Viewer (New)\\BoardViewer_NEW.exe";
const GUEST_USER = "vboxuser";
const GUEST_PASSWORD = "vboxuser";

const PATH_OUTSIDE_SHARE_MSG =
  "Plik musi znajdować się w folderze Downloads udostępnionym do VM jako Z:";

function logVBoxResult(label: string, r: { stdout: string; stderr: string; code: number | null }): void {
  console.log(`[VBox] ${label} stdout:`, r.stdout, "stderr:", r.stderr, "code:", r.code);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Typowy błąd, gdy usługa guestcontrol w gościu jeszcze nie wystartowała (świeży boot VM). */
function isGuestExecutionNotReady(stderr: string, stdout: string): boolean {
  const t = `${stderr}\n${stdout}`.toLowerCase();
  return (
    t.includes("guest execution service is not ready") ||
    t.includes("not ready (yet)") ||
    (t.includes("waiting for guest process") && t.includes("not ready"))
  );
}

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
    logVBoxResult("list runningvms", r);
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
    logVBoxResult("startvm", r);
    if (r.code !== 0) {
      const msg = r.stderr || r.stdout || `VBoxManage startvm (code ${r.code})`;
      console.error("VBoxManage startvm:", msg);
      throw new Error(msg);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

/**
 * Uruchamia BoardViewer w gościu Windows z podaną ścieżką pliku (Z:\…).
 * Przy kolejnych wywołaniach ponownie wykonuje guestcontrol start (nowy plik).
 */
export async function openBoardviewInVM(filePath: string): Promise<void> {
  console.log("[openBoardviewInVM] etap: sprawdzanie VM", { filePath });
  const list = await Command.create("vbox-list-running", ["list", "runningvms"]).execute();
  logVBoxResult("list runningvms (openBoardviewInVM)", list);
  if (list.code !== 0) {
    const msg = list.stderr || list.stdout || `VBoxManage list runningvms (code ${list.code})`;
    throw new Error(msg);
  }
  const running = list.stdout.includes(`"${VM_NAME}"`);
  console.log("[openBoardviewInVM] VM działa?", running);

  let vmJustStarted = false;
  if (!running) {
    console.log("[openBoardviewInVM] etap: start VM (headless)");
    const st = await Command.create("vbox-start", ["startvm", VM_NAME, "--type", "headless"]).execute();
    logVBoxResult("startvm (openBoardviewInVM)", st);
    if (st.code !== 0) {
      const msg = st.stderr || st.stdout || `VBoxManage startvm (code ${st.code})`;
      throw new Error(msg);
    }
    vmJustStarted = true;
  }

  if (vmJustStarted) {
    console.log(
      "[openBoardviewInVM] VM właśnie wystartował — czekam 15 s na usługę gościa (Guest Additions / logowanie)…",
    );
    await sleep(15_000);
  }

  console.log("[openBoardviewInVM] etap: konwersja ścieżki Linux → Z:");
  const winFilePath = linuxPathToWindowsSharedPath(filePath);
  console.log("[openBoardviewInVM] ścieżka w gościu:", winFilePath);

  /**
   * Kolejność zgodna z manualem VBox: po nazwie VM i `start` najpierw [common-options]
   * (`--username`, `--domain`, `--password`), dopiero potem `--exe` i argumenty po `--`.
   * `start` zamiast `run` — uruchomienie GUI (BoardViewer) bez blokowania na stdout gościa.
   */
  const guestArgs = [
    "guestcontrol",
    VM_NAME,
    "start",
    "--username",
    GUEST_USER,
    "--domain",
    ".",
    "--password",
    GUEST_PASSWORD,
    "--exe",
    BOARDVIEW_EXE_WINDOWS,
    "--",
    BOARDVIEW_EXE_WINDOWS,
    winFilePath,
  ] as const;

  const maxAttempts = 20;
  const delayMs = 3000;
  let lastMsg = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[openBoardviewInVM] etap: guestcontrol start (próba ${attempt}/${maxAttempts})`);
    const r = await Command.create("vbox-run-boardview", [...guestArgs]).execute();
    logVBoxResult(`guestcontrol start (${attempt})`, r);
    if (r.code === 0) {
      return;
    }
    lastMsg = (r.stderr || r.stdout || `code ${r.code}`).trim();
    if (isGuestExecutionNotReady(r.stderr, r.stdout) && attempt < maxAttempts) {
      console.log(
        `[openBoardviewInVM] gość jeszcze nie gotowy — ponowna próba za ${delayMs / 1000} s…`,
      );
      await sleep(delayMs);
      continue;
    }
    throw new Error(lastMsg || `VBoxManage guestcontrol start (code ${r.code})`);
  }
}
