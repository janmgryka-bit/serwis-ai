import Database from "@tauri-apps/plugin-sql";
import { DEFAULT_REPAIR_DOCUMENTATION, parseRepairWorkbench } from "../types/repair";
import type {
  DiagnosticMode,
  DiagnosticStage,
  Repair,
  RepairDocumentation,
  RepairDocumentationStatus,
  RepairFile,
  RepairFileRole,
  RepairStatus,
} from "../types/repair";

const DB_CONNECTION = "sqlite:serwis-ai.db";

const DIAGNOSTIC_MODES: DiagnosticMode[] = [
  "no_power",
  "no_display",
  "restarts",
  "charging_issue",
  "other",
];

const STATUSES: RepairStatus[] = ["nowa", "diagnoza", "w naprawie", "gotowa", "wydana"];

const FILE_ROLES: RepairFileRole[] = ["schematic", "boardview", "photo", "bios", "other"];

const DIAGNOSTIC_STAGES: DiagnosticStage[] = [
  "start",
  "no_supply",
  "standby",
  "power_sequence",
  "board_boot",
  "display",
  "stage_other",
];

const LEGACY_DIAGNOSTIC_STAGE: Record<string, DiagnosticStage> = {
  post: "board_boot",
  analysis: "stage_other",
};

let dbInstance: Database | null = null;
/** Jedna inicjalizacja na proces (React Strict Mode wywołuje effect 2× równolegle). */
let initDatabasePromise: Promise<void> | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_CONNECTION);
  }
  return dbInstance;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const DOC_STATUSES: RepairDocumentationStatus[] = ["missing", "uploaded", "found"];

function isDocStatus(x: unknown): x is RepairDocumentationStatus {
  return typeof x === "string" && (DOC_STATUSES as readonly string[]).includes(x);
}

function parseDocumentationJson(raw: string): RepairDocumentation {
  const parsed = parseJson<Partial<RepairDocumentation>>(raw, {});
  return {
    schematicStatus: isDocStatus(parsed.schematicStatus)
      ? parsed.schematicStatus
      : DEFAULT_REPAIR_DOCUMENTATION.schematicStatus,
    boardviewStatus: isDocStatus(parsed.boardviewStatus)
      ? parsed.boardviewStatus
      : DEFAULT_REPAIR_DOCUMENTATION.boardviewStatus,
    ...(typeof parsed.schematicFileName === "string" && parsed.schematicFileName.trim() !== ""
      ? { schematicFileName: parsed.schematicFileName.trim() }
      : {}),
    ...(typeof parsed.boardviewFileName === "string" && parsed.boardviewFileName.trim() !== ""
      ? { boardviewFileName: parsed.boardviewFileName.trim() }
      : {}),
    ...(typeof parsed.schematicPath === "string" && parsed.schematicPath.trim() !== ""
      ? { schematicPath: parsed.schematicPath.trim() }
      : {}),
    ...(typeof parsed.boardviewPath === "string" && parsed.boardviewPath.trim() !== ""
      ? { boardviewPath: parsed.boardviewPath.trim() }
      : {}),
  };
}

function parseDiagnosticMode(raw: string): DiagnosticMode {
  return DIAGNOSTIC_MODES.includes(raw as DiagnosticMode) ? (raw as DiagnosticMode) : "other";
}

function parseDiagnosticStage(raw: string | undefined | null): DiagnosticStage {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (DIAGNOSTIC_STAGES.includes(s as DiagnosticStage)) return s as DiagnosticStage;
  if (s in LEGACY_DIAGNOSTIC_STAGE) return LEGACY_DIAGNOSTIC_STAGE[s];
  return "start";
}

function parseStatus(raw: string): RepairStatus {
  return STATUSES.includes(raw as RepairStatus) ? (raw as RepairStatus) : "nowa";
}

function isFileRole(x: string): x is RepairFileRole {
  return (FILE_ROLES as readonly string[]).includes(x);
}

type RepairRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  device_type: string;
  brand: string;
  model: string;
  motherboard: string;
  symptom: string;
  diagnostic_mode: string;
  status: string;
  notes: string;
  final_diagnosis: string;
  solution: string;
  documentation_json: string;
  diagnostic_steps_json: string;
  diagnosis_steps_json: string;
  diagnostic_stage?: string;
  diagnostic_observation_vin?: string;
  diagnostic_observation_draw?: string;
  diagnostic_observation_reaction?: string;
  diagnostic_conclusion?: string;
  workbench_json?: string;
};

type RepairFileRow = {
  id: string;
  repair_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_role: string;
  created_at: string;
};

function rowToRepair(row: RepairRow, attachedFiles: RepairFile[]): Repair {
  const legacyVin = row.diagnostic_observation_vin ?? "";
  const legacyDraw = row.diagnostic_observation_draw ?? "";
  const legacyReaction = row.diagnostic_observation_reaction ?? "";
  const legacyConclusion = row.diagnostic_conclusion ?? "";
  const workbench = parseRepairWorkbench(parseJson(row.workbench_json ?? "{}", {}), {
    vin: legacyVin,
    draw: legacyDraw,
    reaction: legacyReaction,
    conclusion: legacyConclusion,
  });
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    device_type: row.device_type,
    brand: row.brand,
    model: row.model,
    motherboard: row.motherboard,
    symptom: row.symptom,
    diagnosticMode: parseDiagnosticMode(row.diagnostic_mode),
    status: parseStatus(row.status),
    notes: row.notes,
    finalDiagnosis: row.final_diagnosis,
    solution: row.solution,
    documentation: parseDocumentationJson(row.documentation_json),
    diagnosticSteps: parseJson(row.diagnostic_steps_json, [] as Repair["diagnosticSteps"]),
    diagnosisSteps: parseJson(row.diagnosis_steps_json, [] as Repair["diagnosisSteps"]),
    diagnosticStage: parseDiagnosticStage(row.diagnostic_stage),
    workbench,
    attachedFiles,
  };
}

function fileRowToFile(row: RepairFileRow): RepairFile {
  const role = isFileRole(row.file_role) ? row.file_role : "other";
  return {
    id: row.id,
    repairId: row.repair_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileRole: role,
    createdAt: row.created_at,
  };
}

/** Tworzy tabele i indeksy (idempotentnie). */
export async function initDatabase(): Promise<void> {
  if (!initDatabasePromise) {
    initDatabasePromise = runInitDatabase().catch((e) => {
      initDatabasePromise = null;
      throw e;
    });
  }
  return initDatabasePromise;
}

async function runInitDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute("PRAGMA foreign_keys = ON");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS repairs (
      id TEXT PRIMARY KEY NOT NULL,
      order_number TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      device_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      motherboard TEXT NOT NULL DEFAULT '',
      symptom TEXT NOT NULL,
      diagnostic_mode TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      final_diagnosis TEXT NOT NULL DEFAULT '',
      solution TEXT NOT NULL DEFAULT '',
      documentation_json TEXT NOT NULL DEFAULT '{}',
      diagnostic_steps_json TEXT NOT NULL DEFAULT '[]',
      diagnosis_steps_json TEXT NOT NULL DEFAULT '[]',
      diagnostic_stage TEXT NOT NULL DEFAULT 'start',
      diagnostic_observation_vin TEXT NOT NULL DEFAULT '',
      diagnostic_observation_draw TEXT NOT NULL DEFAULT '',
      diagnostic_observation_reaction TEXT NOT NULL DEFAULT '',
      diagnostic_conclusion TEXT NOT NULL DEFAULT '',
      workbench_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await migrateRepairsDiagnosticFlowColumns(db);
  await migrateRepairsWorkbenchJsonColumn(db);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS repair_files (
      id TEXT PRIMARY KEY NOT NULL,
      repair_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
    )
  `);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_repair_files_repair_id ON repair_files(repair_id)",
  );
}

function repairTableColumnNames(info: unknown[]): Set<string> {
  const names = new Set<string>();
  for (const row of info) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const n = r.name ?? r.Name;
    if (typeof n === "string" && n.length > 0) names.add(n);
  }
  return names;
}

/** Uzupełnia kolumny flow diagnostycznego w istniejącej bazie (SQLite). */
async function migrateRepairsDiagnosticFlowColumns(db: Database): Promise<void> {
  const info = (await db.select("PRAGMA table_info(repairs)")) as unknown[];
  const names = repairTableColumnNames(info);
  const columns: [string, string][] = [
    ["diagnostic_stage", "TEXT NOT NULL DEFAULT 'start'"],
    ["diagnostic_observation_vin", "TEXT NOT NULL DEFAULT ''"],
    ["diagnostic_observation_draw", "TEXT NOT NULL DEFAULT ''"],
    ["diagnostic_observation_reaction", "TEXT NOT NULL DEFAULT ''"],
    ["diagnostic_conclusion", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [col, def] of columns) {
    if (names.has(col)) continue;
    try {
      await db.execute(`ALTER TABLE repairs ADD COLUMN ${col} ${def}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/duplicate column name/i.test(msg)) continue;
      throw e;
    }
    names.add(col);
  }
}

/** Kolumna JSON workbench (stan płyty + obserwacje); stary schemat uzupełniany przez ALTER. */
async function migrateRepairsWorkbenchJsonColumn(db: Database): Promise<void> {
  const info = (await db.select("PRAGMA table_info(repairs)")) as unknown[];
  const names = repairTableColumnNames(info);
  const col = "workbench_json";
  if (names.has(col)) return;
  try {
    await db.execute(`ALTER TABLE repairs ADD COLUMN ${col} TEXT NOT NULL DEFAULT '{}'`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate column name/i.test(msg)) return;
    throw e;
  }
}

export async function getRepairs(): Promise<Repair[]> {
  const db = await getDb();
  const rows = (await db.select(
    "SELECT * FROM repairs ORDER BY datetime(updated_at) DESC",
  )) as RepairRow[];
  const fileRows = (await db.select("SELECT * FROM repair_files")) as RepairFileRow[];
  const byRepair = new Map<string, RepairFile[]>();
  for (const fr of fileRows) {
    const f = fileRowToFile(fr);
    const list = byRepair.get(f.repairId) ?? [];
    list.push(f);
    byRepair.set(f.repairId, list);
  }
  return rows.map((r: RepairRow) => rowToRepair(r, byRepair.get(r.id) ?? []));
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createRepair(repair: Repair): Promise<void> {
  const db = await getDb();
  const t = nowIso();
  const wb = repair.workbench;
  await db.execute(
    `INSERT INTO repairs (
      id, order_number, customer_name, customer_phone, device_type, brand, model, motherboard,
      symptom, diagnostic_mode, status, notes, final_diagnosis, solution,
      documentation_json, diagnostic_steps_json, diagnosis_steps_json,
      diagnostic_stage, diagnostic_observation_vin, diagnostic_observation_draw,
      diagnostic_observation_reaction, diagnostic_conclusion, workbench_json,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
    [
      repair.id,
      repair.orderNumber,
      repair.customerName,
      repair.customerPhone,
      repair.device_type,
      repair.brand,
      repair.model,
      repair.motherboard,
      repair.symptom,
      repair.diagnosticMode,
      repair.status,
      repair.notes,
      repair.finalDiagnosis,
      repair.solution,
      JSON.stringify(repair.documentation),
      JSON.stringify(repair.diagnosticSteps),
      JSON.stringify(repair.diagnosisSteps),
      repair.diagnosticStage,
      wb.vinObservation,
      wb.currentDraw,
      wb.powerReaction,
      wb.workingConclusion,
      JSON.stringify(repair.workbench),
      t,
      t,
    ],
  );
}

export async function updateRepair(repair: Repair): Promise<void> {
  const db = await getDb();
  const wb = repair.workbench;
  await db.execute(
    `UPDATE repairs SET
      order_number = $1, customer_name = $2, customer_phone = $3, device_type = $4, brand = $5,
      model = $6, motherboard = $7, symptom = $8, diagnostic_mode = $9, status = $10,
      notes = $11, final_diagnosis = $12, solution = $13, documentation_json = $14,
      diagnostic_steps_json = $15, diagnosis_steps_json = $16,
      diagnostic_stage = $17, diagnostic_observation_vin = $18, diagnostic_observation_draw = $19,
      diagnostic_observation_reaction = $20, diagnostic_conclusion = $21, workbench_json = $22,
      updated_at = $23
    WHERE id = $24`,
    [
      repair.orderNumber,
      repair.customerName,
      repair.customerPhone,
      repair.device_type,
      repair.brand,
      repair.model,
      repair.motherboard,
      repair.symptom,
      repair.diagnosticMode,
      repair.status,
      repair.notes,
      repair.finalDiagnosis,
      repair.solution,
      JSON.stringify(repair.documentation),
      JSON.stringify(repair.diagnosticSteps),
      JSON.stringify(repair.diagnosisSteps),
      repair.diagnosticStage,
      wb.vinObservation,
      wb.currentDraw,
      wb.powerReaction,
      wb.workingConclusion,
      JSON.stringify(repair.workbench),
      nowIso(),
      repair.id,
    ],
  );
}

export async function deleteRepair(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM repairs WHERE id = $1", [id]);
}

export async function getRepairFiles(repairId: string): Promise<RepairFile[]> {
  const db = await getDb();
  const rows = (await db.select(
    "SELECT * FROM repair_files WHERE repair_id = $1 ORDER BY datetime(created_at) ASC",
    [repairId],
  )) as RepairFileRow[];
  return rows.map(fileRowToFile);
}

export type NewRepairFileInput = {
  repairId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileRole: RepairFileRole;
};

export async function addRepairFile(input: NewRepairFileInput): Promise<RepairFile> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await db.execute(
    `INSERT INTO repair_files (id, repair_id, file_name, file_path, file_type, file_role, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.repairId, input.fileName, input.filePath, input.fileType, input.fileRole, createdAt],
  );
  return {
    id,
    repairId: input.repairId,
    fileName: input.fileName,
    filePath: input.filePath,
    fileType: input.fileType,
    fileRole: input.fileRole,
    createdAt,
  };
}

export async function deleteRepairFile(fileId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM repair_files WHERE id = $1", [fileId]);
}

/** Prosty typ MIME po rozszerzeniu (dla kolumny file_type). */
export function guessFileTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".brd")) return "application/x-brd";
  if (lower.endsWith(".bin") || lower.endsWith(".rom")) return "application/octet-stream";
  return "application/octet-stream";
}
