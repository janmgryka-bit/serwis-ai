import Database from "@tauri-apps/plugin-sql";
import { DEFAULT_REPAIR_DOCUMENTATION } from "../types/repair";
import type {
  DiagnosticMode,
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

let dbInstance: Database | null = null;

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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
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
  await db.execute(
    `INSERT INTO repairs (
      id, order_number, customer_name, customer_phone, device_type, brand, model, motherboard,
      symptom, diagnostic_mode, status, notes, final_diagnosis, solution,
      documentation_json, diagnostic_steps_json, diagnosis_steps_json, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
      t,
      t,
    ],
  );
}

export async function updateRepair(repair: Repair): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE repairs SET
      order_number = $1, customer_name = $2, customer_phone = $3, device_type = $4, brand = $5,
      model = $6, motherboard = $7, symptom = $8, diagnostic_mode = $9, status = $10,
      notes = $11, final_diagnosis = $12, solution = $13, documentation_json = $14,
      diagnostic_steps_json = $15, diagnosis_steps_json = $16, updated_at = $17
    WHERE id = $18`,
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
