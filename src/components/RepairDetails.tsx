import { useEffect, useState } from "react";
import {
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  DIAGNOSTIC_STAGE_LABELS,
  DIAGNOSTIC_STAGE_ORDER,
  type DiagnosticStage,
  type Repair,
  type RepairFileRole,
  REPAIR_FILE_ROLE_LABELS,
} from "../types/repair";
import { addRepairFile, deleteRepairFile, guessFileTypeFromPath } from "../lib/database";
import { fileNameFromPath } from "../lib/filePathUtils";
import { openFileLocation, openRepairFileWithShell } from "../lib/repairFileActions";
import { buildAiContext } from "../lib/buildAiContext";
import { buildMentorQuestion } from "../lib/buildMentorQuestion";
import {
  askOpenAiMentor,
  OPENAI_MENTOR_MISSING_KEY,
} from "../lib/openaiMentor";

const STAGE_SELECT_DATA = DIAGNOSTIC_STAGE_ORDER.map((value) => ({
  value,
  label: DIAGNOSTIC_STAGE_LABELS[value],
}));

const ADD_FILE_ROLE_ORDER: RepairFileRole[] = ["schematic", "boardview", "bios", "photo", "other"];
const ADD_FILE_ROLE_OPTIONS = ADD_FILE_ROLE_ORDER.map((value) => ({
  value,
  label: REPAIR_FILE_ROLE_LABELS[value],
}));

type RepairDetailsProps = {
  repair: Repair;
  onBack: () => void;
  onUpdateRepair: (updatedRepair: Repair) => void;
  onFilesChanged?: () => void;
};

type DiagnosticFileRow = {
  key: string;
  roleLabel: string;
  displayName: string;
  path: string;
  /** Ustawione tylko dla wierszy z `repair_files` — wtedy dostępne „Usuń”. */
  repairFileId?: string;
};

function collectDiagnosticFileRows(repair: Repair): DiagnosticFileRow[] {
  const rows: DiagnosticFileRow[] = [];
  const doc = repair.documentation;
  const schPath = doc.schematicPath?.trim() ?? "";
  if (schPath !== "") {
    rows.push({
      key: "doc-schematic",
      roleLabel: "Schemat",
      displayName: doc.schematicFileName?.trim() || fileNameFromPath(schPath),
      path: schPath,
    });
  }
  const bvPath = doc.boardviewPath?.trim() ?? "";
  if (bvPath !== "") {
    rows.push({
      key: "doc-boardview",
      roleLabel: "Boardview",
      displayName: doc.boardviewFileName?.trim() || fileNameFromPath(bvPath),
      path: bvPath,
    });
  }
  for (const f of repair.attachedFiles) {
    rows.push({
      key: `file-${f.id}`,
      roleLabel: REPAIR_FILE_ROLE_LABELS[f.fileRole],
      displayName: f.fileName,
      path: f.filePath.trim(),
      repairFileId: f.id,
    });
  }
  return rows;
}

function MiniFileRow(props: {
  row: DiagnosticFileRow;
  onOpenError: (msg: string) => void;
  onDeleteFile?: (fileId: string) => void;
  fileBusy?: boolean;
}) {
  const { row, onOpenError, onDeleteFile, fileBusy } = props;
  const [opening, setOpening] = useState(false);
  const p = row.path;
  const canDelete = Boolean(row.repairFileId && onDeleteFile);

  async function openFile() {
    setOpening(true);
    try {
      await openRepairFileWithShell(p);
    } catch (e) {
      onOpenError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="sm" py={4}>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {row.roleLabel}
        </Text>
        <Text size="sm" style={{ wordBreak: "break-word" }}>
          {row.displayName}
        </Text>
      </Stack>
      <Group gap="xs" wrap="wrap">
        <Button
          size="compact-xs"
          variant="light"
          loading={opening}
          disabled={fileBusy}
          onClick={() => void openFile()}
        >
          Otwórz
        </Button>
        <Button size="compact-xs" variant="default" disabled={fileBusy} onClick={() => void openFileLocation(p)}>
          Folder
        </Button>
        {canDelete ? (
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            disabled={fileBusy}
            onClick={() => onDeleteFile!(row.repairFileId!)}
          >
            Usuń
          </Button>
        ) : null}
      </Group>
    </Group>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>
      {children}
    </Text>
  );
}

export function RepairDetails({ repair, onBack, onUpdateRepair, onFilesChanged }: RepairDetailsProps) {
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newFileRole, setNewFileRole] = useState<RepairFileRole>("schematic");
  const [fileBusy, setFileBusy] = useState(false);

  useEffect(() => {
    setAiQuestion("");
    setAiError(null);
    setFileError(null);
    setNewFileRole("schematic");
  }, [repair.id]);

  function setWorkbench(patch: Partial<Repair["workbench"]>) {
    onUpdateRepair({
      ...repair,
      workbench: { ...repair.workbench, ...patch },
    });
  }

  async function handleProposeStep() {
    const trimmed = aiQuestion.trim();
    setAiError(null);
    setAiLoading(true);
    try {
      const context = buildAiContext(repair);
      const userPart = trimmed !== "" ? buildMentorQuestion(trimmed) : "(brak dodatkowych uwag — zaproponuj następny krok wg kontekstu naprawy.)";
      const question = [
        "Odpowiedz wyłącznie jednym zwięzłym blokiem tekstu: jeden konkretny następny krok diagnostyczny na tej płycie.",
        "Bez nagłówków, bez historii czatu, bez numerowania wielu kroków — tylko ten jeden krok.",
        "",
        userPart,
      ].join("\n");
      const text = await askOpenAiMentor({
        context,
        question,
        history: [],
      });
      setWorkbench({ nextStep: text.trim() });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === OPENAI_MENTOR_MISSING_KEY
          ? "Brak klucza API (VITE_OPENAI_API_KEY)."
          : "Błąd połączenia z OpenAI.";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }

  const modelBoard = [repair.model, repair.motherboard]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  const fileRows = collectDiagnosticFileRows(repair);

  async function handleAddRepairFile() {
    setFileBusy(true);
    try {
      const selected = await open({ multiple: false });
      if (selected === null || Array.isArray(selected)) return;
      const pathStr = selected;
      const fileName = pathStr.split(/[/\\]/).pop() ?? "plik";
      await addRepairFile({
        repairId: repair.id,
        fileName,
        filePath: pathStr,
        fileType: guessFileTypeFromPath(pathStr),
        fileRole: newFileRole,
      });
      onFilesChanged?.();
    } finally {
      setFileBusy(false);
    }
  }

  async function handleDeleteRepairFile(fileId: string) {
    setFileBusy(true);
    try {
      await deleteRepairFile(fileId);
      onFilesChanged?.();
    } finally {
      setFileBusy(false);
    }
  }

  return (
    <Container size="sm" px={{ base: "sm", sm: "md" }} py="md">
      <Stack gap="md">
        <Button variant="subtle" color="gray" size="compact-sm" onClick={onBack} w="fit-content" px={0}>
          ← Lista
        </Button>

        {/* 1 — Header */}
        <Paper withBorder p="md" radius="md">
          <Stack gap={4}>
            <Title order={3}>{repair.orderNumber}</Title>
            <Text size="sm" c="dimmed">
              {modelBoard || "—"}
            </Text>
          </Stack>
        </Paper>

        {/* 2 — Stan diagnozy */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Stan diagnozy</SectionTitle>
            <Select
              label="Etap diagnostyki"
              data={STAGE_SELECT_DATA}
              value={repair.diagnosticStage}
              onChange={(v) =>
                onUpdateRepair({
                  ...repair,
                  diagnosticStage: (v ?? "start") as DiagnosticStage,
                })
              }
              allowDeselect={false}
            />
          </Stack>
        </Paper>

        {/* 3 — Co wiem */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Co wiem</SectionTitle>
            <TextInput
              label="VIN"
              value={repair.workbench.vinObservation}
              onChange={(e) => setWorkbench({ vinObservation: e.target.value })}
              spellCheck={false}
            />
            <TextInput
              label="Pobór"
              value={repair.workbench.currentDraw}
              onChange={(e) => setWorkbench({ currentDraw: e.target.value })}
              spellCheck={false}
            />
            <TextInput
              label="Reakcja"
              value={repair.workbench.powerReaction}
              onChange={(e) => setWorkbench({ powerReaction: e.target.value })}
              spellCheck={false}
            />
          </Stack>
        </Paper>

        {/* 4 — Wniosek */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Wniosek</SectionTitle>
            <Textarea
              placeholder="Krótkie podsumowanie…"
              value={repair.workbench.workingConclusion}
              onChange={(e) => setWorkbench({ workingConclusion: e.target.value })}
              autosize
              minRows={3}
              maxRows={8}
              spellCheck={false}
            />
          </Stack>
        </Paper>

        {/* 5 — Następny krok */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Następny krok</SectionTitle>
            <Textarea
              placeholder="Co robisz dalej na płycie…"
              value={repair.workbench.nextStep}
              onChange={(e) => setWorkbench({ nextStep: e.target.value })}
              autosize
              minRows={4}
              maxRows={12}
              spellCheck={false}
            />
          </Stack>
        </Paper>

        {/* 6 — AI */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>AI</SectionTitle>
            <TextInput
              placeholder="Opcjonalne pytanie lub uwagi do AI…"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              spellCheck={false}
              disabled={aiLoading}
            />
            <Button onClick={() => void handleProposeStep()} loading={aiLoading}>
              Zaproponuj krok
            </Button>
            {aiError ? (
              <Text size="sm" c="red.4">
                {aiError}
              </Text>
            ) : null}
          </Stack>
        </Paper>

        {/* 7 — Pliki */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Pliki</SectionTitle>
            {fileError ? (
              <Text size="xs" c="red.4">
                {fileError}
              </Text>
            ) : null}
            {fileRows.length === 0 ? (
              <Text size="sm" c="dimmed">
                Brak plików.
              </Text>
            ) : (
              <Stack gap={0}>
                {fileRows.map((row, i) => (
                  <Stack key={row.key} gap={0}>
                    {i > 0 ? <Divider my="xs" color="dark.5" /> : null}
                    <MiniFileRow
                      row={row}
                      onOpenError={setFileError}
                      onDeleteFile={(id) => void handleDeleteRepairFile(id)}
                      fileBusy={fileBusy}
                    />
                  </Stack>
                ))}
              </Stack>
            )}
            <Group align="flex-end" wrap="wrap" gap="sm" mt="xs">
              <Select
                label="Rola pliku"
                data={ADD_FILE_ROLE_OPTIONS}
                value={newFileRole}
                onChange={(v) => setNewFileRole((v ?? "schematic") as RepairFileRole)}
                w={{ base: "100%", xs: 220 }}
                disabled={fileBusy}
              />
              <Button loading={fileBusy} onClick={() => void handleAddRepairFile()}>
                Dodaj plik
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* 8 — Notatki */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <SectionTitle>Notatki</SectionTitle>
            <Textarea
              value={repair.notes}
              onChange={(e) => onUpdateRepair({ ...repair, notes: e.target.value })}
              placeholder="Notatki serwisowe…"
              autosize
              minRows={12}
              maxRows={24}
              spellCheck={false}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
