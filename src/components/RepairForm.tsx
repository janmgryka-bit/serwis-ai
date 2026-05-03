import { type FormEvent, useState } from "react";
import {
  Button,
  Checkbox,
  Container,
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
  type DiagnosticMode,
  type RepairDraft,
  DIAGNOSTIC_MODE_LABELS,
  DEFAULT_REPAIR_WORKBENCH,
} from "../types/repair";
import {
  buildSymptomString,
  SYMPTOM_PRESET_OPTIONS,
  type SymptomPresetId,
} from "../lib/repairSymptomForm";
import { fileNameFromPath } from "../lib/filePathUtils";

type RepairFormProps = {
  onSave: (draft: RepairDraft) => void;
  onCancel: () => void;
};

const emptyChecked: Record<SymptomPresetId, boolean> = {
  "brak-reakcji": false,
  "nie-uruchamia": false,
  restartuje: false,
  "brak-obrazu": false,
  zalanie: false,
};

const emptyFields = {
  customerName: "",
  customerPhone: "",
  device_type: "",
  brand: "",
  model: "",
  motherboard: "",
};

const DIAGNOSTIC_MODE_OPTIONS: { value: DiagnosticMode; label: string }[] = [
  { value: "no_power", label: DIAGNOSTIC_MODE_LABELS.no_power },
  { value: "no_display", label: DIAGNOSTIC_MODE_LABELS.no_display },
  { value: "restarts", label: DIAGNOSTIC_MODE_LABELS.restarts },
  { value: "charging_issue", label: DIAGNOSTIC_MODE_LABELS.charging_issue },
  { value: "other", label: DIAGNOSTIC_MODE_LABELS.other },
];

export function RepairForm({ onSave, onCancel }: RepairFormProps) {
  const [fields, setFields] = useState(emptyFields);
  const [symptomChecked, setSymptomChecked] = useState(emptyChecked);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [schematicPath, setSchematicPath] = useState<string | null>(null);
  const [boardviewPath, setBoardviewPath] = useState<string | null>(null);
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>("no_power");

  function togglePreset(id: SymptomPresetId) {
    setSymptomChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  async function pickSchematicFile() {
    const selected = await open({ multiple: false });
    if (selected === null || Array.isArray(selected)) return;
    setSchematicPath(selected);
  }

  async function pickBoardviewFile() {
    const selected = await open({ multiple: false });
    if (selected === null || Array.isArray(selected)) return;
    setBoardviewPath(selected);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symptom = buildSymptomString(symptomChecked, otherSymptom);
    const documentation = {
      schematicStatus: schematicPath ? ("uploaded" as const) : ("missing" as const),
      boardviewStatus: boardviewPath ? ("uploaded" as const) : ("missing" as const),
      ...(schematicPath
        ? {
            schematicFileName: fileNameFromPath(schematicPath),
            schematicPath: schematicPath,
          }
        : {}),
      ...(boardviewPath
        ? {
            boardviewFileName: fileNameFromPath(boardviewPath),
            boardviewPath: boardviewPath,
          }
        : {}),
    };
    const trimmed: RepairDraft = {
      customerName: fields.customerName.trim(),
      customerPhone: fields.customerPhone.trim(),
      orderNumber: "",
      device_type: fields.device_type.trim(),
      brand: fields.brand.trim(),
      model: fields.model.trim(),
      motherboard: fields.motherboard.trim(),
      symptom: symptom.trim(),
      finalDiagnosis: "",
      solution: "",
      attachedFiles: [],
      documentation,
      diagnosticMode,
      diagnosticStage: "start",
      workbench: { ...DEFAULT_REPAIR_WORKBENCH },
      diagnosisSteps: [],
    };
    if (!trimmed.device_type || !trimmed.brand) {
      return;
    }
    onSave(trimmed);
  }

  return (
    <Container size="sm" px={{ base: "sm", sm: "md" }} py="md">
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={3}>Nowa naprawa</Title>
          <Text size="sm" c="dimmed">
            Wymagane: typ urządzenia, marka oraz tryb diagnostyki.
          </Text>
        </Stack>

        <Paper component="form" withBorder shadow="sm" p="lg" radius="md" onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Imię klienta"
              value={fields.customerName}
              onChange={(e) => setFields((f) => ({ ...f, customerName: e.target.value }))}
              autoComplete="name"
            />
            <TextInput
              label="Telefon"
              value={fields.customerPhone}
              onChange={(e) => setFields((f) => ({ ...f, customerPhone: e.target.value }))}
              autoComplete="tel"
            />
            <TextInput
              label="Typ urządzenia"
              required
              value={fields.device_type}
              onChange={(e) => setFields((f) => ({ ...f, device_type: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Marka"
              required
              value={fields.brand}
              onChange={(e) => setFields((f) => ({ ...f, brand: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Model"
              value={fields.model}
              onChange={(e) => setFields((f) => ({ ...f, model: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Płyta główna"
              value={fields.motherboard}
              onChange={(e) => setFields((f) => ({ ...f, motherboard: e.target.value }))}
              autoComplete="off"
            />

            <Select
              label="Tryb diagnostyki"
              required
              description="Tryb określa główny problem. Objawy są opcjonalne."
              data={DIAGNOSTIC_MODE_OPTIONS}
              value={diagnosticMode}
              onChange={(v) => setDiagnosticMode((v ?? "no_power") as DiagnosticMode)}
              allowDeselect={false}
            />

            <Stack gap="xs">
              <Text size="xs" fw={500} tt="uppercase" c="dimmed">
                Objawy
              </Text>
              <Stack gap="xs">
                {SYMPTOM_PRESET_OPTIONS.map((opt) => (
                  <Checkbox
                    key={opt.id}
                    label={opt.phrase}
                    checked={symptomChecked[opt.id]}
                    onChange={() => togglePreset(opt.id)}
                  />
                ))}
              </Stack>
            </Stack>

            <Textarea
              label="Inny objaw"
              value={otherSymptom}
              onChange={(e) => setOtherSymptom(e.target.value)}
              minRows={3}
              placeholder="Opcjonalny opis…"
              spellCheck={false}
            />

            <Stack gap="xs">
              <Text size="xs" fw={500} tt="uppercase" c="dimmed">
                Dokumentacja
              </Text>
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Schemat
                </Text>
                <Button type="button" variant="light" onClick={() => void pickSchematicFile()}>
                  Wybierz plik
                </Button>
                {schematicPath ? (
                  <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                    {fileNameFromPath(schematicPath)}
                  </Text>
                ) : null}
              </Stack>
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Boardview
                </Text>
                <Button type="button" variant="light" onClick={() => void pickBoardviewFile()}>
                  Wybierz plik
                </Button>
                {boardviewPath ? (
                  <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
                    {fileNameFromPath(boardviewPath)}
                  </Text>
                ) : null}
              </Stack>
            </Stack>

            <Group justify="flex-end" gap="sm" mt="md" pt="md" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
              <Button variant="default" color="gray" type="button" onClick={onCancel}>
                Anuluj
              </Button>
              <Button type="submit">Zapisz</Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
