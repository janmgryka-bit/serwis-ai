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
import { type DiagnosticMode, type RepairDraft, DIAGNOSTIC_MODE_LABELS } from "../types/repair";
import {
  buildSymptomString,
  SYMPTOM_PRESET_OPTIONS,
  type SymptomPresetId,
} from "../lib/repairSymptomForm";

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
  const [hasSchematic, setHasSchematic] = useState(false);
  const [schematicFileName, setSchematicFileName] = useState("");
  const [hasBoardview, setHasBoardview] = useState(false);
  const [boardviewFileName, setBoardviewFileName] = useState("");
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>("no_power");

  function togglePreset(id: SymptomPresetId) {
    setSymptomChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symptom = buildSymptomString(symptomChecked, otherSymptom);
    const schName = schematicFileName.trim();
    const bvName = boardviewFileName.trim();
    const documentation = {
      schematicStatus: hasSchematic ? ("uploaded" as const) : ("missing" as const),
      boardviewStatus: hasBoardview ? ("uploaded" as const) : ("missing" as const),
      ...(hasSchematic && schName !== "" ? { schematicFileName: schName } : {}),
      ...(hasBoardview && bvName !== "" ? { boardviewFileName: bvName } : {}),
    };
    const trimmed: RepairDraft = {
      device_type: fields.device_type.trim(),
      brand: fields.brand.trim(),
      model: fields.model.trim(),
      motherboard: fields.motherboard.trim(),
      symptom: symptom.trim(),
      documentation,
      diagnosticMode,
      diagnosisSteps: [],
    };
    if (!trimmed.device_type || !trimmed.brand || !trimmed.symptom) {
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
            Wymagane: typ urządzenia, marka oraz co najmniej jeden objaw (lista lub pole „Inny”).
          </Text>
        </Stack>

        <Paper component="form" withBorder shadow="sm" p="lg" radius="md" onSubmit={handleSubmit}>
          <Stack gap="md">
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
              data={DIAGNOSTIC_MODE_OPTIONS}
              value={diagnosticMode}
              onChange={(v) => setDiagnosticMode((v ?? "no_power") as DiagnosticMode)}
              allowDeselect={false}
            />

            <Stack gap="xs">
              <Text size="xs" fw={500} tt="uppercase" c="dimmed">
                Objawy <Text span c="teal.4">*</Text>
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
              <Checkbox
                label="Mam schemat"
                checked={hasSchematic}
                onChange={(e) => {
                  setHasSchematic(e.currentTarget.checked);
                  if (!e.currentTarget.checked) setSchematicFileName("");
                }}
              />
              {hasSchematic ? (
                <TextInput
                  label="Nazwa pliku schematu"
                  value={schematicFileName}
                  onChange={(e) => setSchematicFileName(e.target.value)}
                  placeholder="Np. LA-J091P.pdf"
                  autoComplete="off"
                />
              ) : null}
              <Checkbox
                label="Mam boardview"
                checked={hasBoardview}
                onChange={(e) => {
                  setHasBoardview(e.currentTarget.checked);
                  if (!e.currentTarget.checked) setBoardviewFileName("");
                }}
              />
              {hasBoardview ? (
                <TextInput
                  label="Nazwa pliku boardview"
                  value={boardviewFileName}
                  onChange={(e) => setBoardviewFileName(e.target.value)}
                  placeholder="Np. board.brd"
                  autoComplete="off"
                />
              ) : null}
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
