import { type FormEvent, useState } from "react";
import {
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import type { RepairDraft } from "../types/repair";
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

export function RepairForm({ onSave, onCancel }: RepairFormProps) {
  const [fields, setFields] = useState(emptyFields);
  const [symptomChecked, setSymptomChecked] = useState(emptyChecked);
  const [otherSymptom, setOtherSymptom] = useState("");

  function togglePreset(id: SymptomPresetId) {
    setSymptomChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const symptom = buildSymptomString(symptomChecked, otherSymptom);
    const trimmed: RepairDraft = {
      device_type: fields.device_type.trim(),
      brand: fields.brand.trim(),
      model: fields.model.trim(),
      motherboard: fields.motherboard.trim(),
      symptom: symptom.trim(),
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
