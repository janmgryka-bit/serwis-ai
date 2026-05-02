import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  DIAGNOSTIC_MODE_LABELS,
  type Repair,
  type RepairDiagnosisStepEntry,
  type RepairDocumentationStatus,
  REPAIR_STATUS_LABELS,
} from "../types/repair";
import { buildAiContext } from "../lib/buildAiContext";
import { buildMentorQuestion } from "../lib/buildMentorQuestion";
import { repairStatusBadgeColor } from "../lib/repairStatusBadgeColor";
import {
  askOpenAiMentor,
  OPENAI_MENTOR_MISSING_KEY,
  type MentorMessage,
} from "../lib/openaiMentor";
function diagnosisStepsToMentorHistory(steps: RepairDiagnosisStepEntry[]): MentorMessage[] {
  const out: MentorMessage[] = [];
  for (const s of steps) {
    out.push({ role: "user", content: s.question });
    out.push({ role: "assistant", content: s.answer });
  }
  return out;
}

type RepairDetailsProps = {
  repair: Repair;
  onBack: () => void;
  onUpdateRepair: (updatedRepair: Repair) => void;
};

/** Tekst do API / historii; `null` gdy wszystkie pola puste. */
function buildStepResultPayload(alw3v: string, alw5v: string, extra: string): string | null {
  const lines: string[] = [];
  const t3 = alw3v.trim();
  const t5 = alw5v.trim();
  const tex = extra.trim();
  if (t3 !== "") lines.push(`3V_ALW = ${t3} V`);
  if (t5 !== "") lines.push(`5V_ALW = ${t5} V`);
  if (tex !== "") lines.push(`Dodatkowy opis: ${tex}`);
  if (lines.length === 0) return null;
  return lines.join("\n");
}

function isBothAlwZero(alw3v: string, alw5v: string): boolean {
  const t3 = alw3v.trim();
  const t5 = alw5v.trim();
  if (t3 === "" || t5 === "") return false;
  const v3 = parseFloat(t3);
  const v5 = parseFloat(t5);
  return Number.isFinite(v3) && Number.isFinite(v5) && v3 === 0 && v5 === 0;
}

const CONVERTER_FOCUS =
  "\n\nBrak napięć 3V/5V ALW mimo obecnego VIN i braku zwarcia. Skup się wyłącznie na diagnostyce przetwornicy 3V/5V i jej sygnałów EN/ACOK/ACIN.";

function documentationUiLabel(status: RepairDocumentationStatus, fileName?: string): string {
  if (status === "missing") return "brak";
  const n = fileName?.trim();
  if (status === "found") {
    return n ? `znaleziony: ${n}` : "znaleziony";
  }
  return n ? `dodany: ${n}` : "dodany";
}

export function RepairDetails({ repair, onBack, onUpdateRepair }: RepairDetailsProps) {
  const steps = repair.diagnosticSteps;
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [alw3v, setAlw3v] = useState("");
  const [alw5v, setAlw5v] = useState("");
  const [resultInput, setResultInput] = useState("");

  useEffect(() => {
    setMentorOpen(false);
    setMentorQuestion("");
    setMentorLoading(false);
    setMentorError(null);
    setAlw3v("");
    setAlw5v("");
    setResultInput("");
  }, [repair.id]);

  function toggleDiagnosticStep(stepId: string) {
    onUpdateRepair({
      ...repair,
      diagnosticSteps: repair.diagnosticSteps.map((s) =>
        s.id === stepId ? { ...s, done: !s.done } : s,
      ),
    });
  }

  async function handleMentorSend() {
    setMentorError(null);
    setAlw3v("");
    setAlw5v("");
    setResultInput("");
    setMentorLoading(true);
    try {
      const context = buildAiContext(repair);
      const q = buildMentorQuestion(mentorQuestion);
      const text = await askOpenAiMentor({
        context,
        question: q,
        history: diagnosisStepsToMentorHistory(repair.diagnosisSteps),
      });
      const nextStep = repair.diagnosisSteps.length + 1;
      onUpdateRepair({
        ...repair,
        diagnosisSteps: [
          ...repair.diagnosisSteps,
          { step: nextStep, question: q, answer: text },
        ],
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === OPENAI_MENTOR_MISSING_KEY
          ? "Brak klucza API. Dodaj VITE_OPENAI_API_KEY do pliku .env i uruchom ponownie dev serwer."
          : "Nie udało się połączyć z OpenAI. Sprawdź sieć i klucz API.";
      setMentorError(msg);
    } finally {
      setMentorLoading(false);
    }
  }

  async function handleSendStepResult() {
    const payload = buildStepResultPayload(alw3v, alw5v, resultInput);
    if (payload == null) return;
    setMentorError(null);
    setMentorLoading(true);
    try {
      const context = buildAiContext(repair);
      const bothZero = isBothAlwZero(alw3v, alw5v);
      const apiQuestion = bothZero
        ? `${context}\n\nWynik poprzedniego kroku: ${payload}${CONVERTER_FOCUS}`
        : `Wynik poprzedniego kroku: ${payload}\nCo dalej?`;
      const text = await askOpenAiMentor({
        context,
        question: apiQuestion,
        history: diagnosisStepsToMentorHistory(repair.diagnosisSteps),
      });
      const nextStep = repair.diagnosisSteps.length + 1;
      onUpdateRepair({
        ...repair,
        diagnosisSteps: [
          ...repair.diagnosisSteps,
          { step: nextStep, question: apiQuestion, answer: text },
        ],
      });
      setAlw3v("");
      setAlw5v("");
      setResultInput("");
    } catch (e) {
      const msg =
        e instanceof Error && e.message === OPENAI_MENTOR_MISSING_KEY
          ? "Brak klucza API. Dodaj VITE_OPENAI_API_KEY do pliku .env i uruchom ponownie dev serwer."
          : "Nie udało się połączyć z OpenAI. Sprawdź sieć i klucz API.";
      setMentorError(msg);
    } finally {
      setMentorLoading(false);
    }
  }

  function detailRow(label: string, value: ReactNode, valueMuted?: boolean) {
    return (
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.06em" }} miw={120}>
          {label}
        </Text>
        <Text size="sm" style={{ flex: 1, textAlign: "right" }} c={valueMuted ? "dimmed" : undefined}>
          {value}
        </Text>
      </Group>
    );
  }

  return (
    <Container size="sm" px={{ base: "sm", sm: "md" }} py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <Button variant="subtle" color="gray" onClick={onBack}>
            ← Lista napraw
          </Button>
          <Button
            variant={mentorOpen ? "light" : "default"}
            color="teal"
            onClick={() => setMentorOpen((o) => !o)}
          >
            Zapytaj AI
          </Button>
        </Group>

        {mentorOpen ? (
          <Paper
            withBorder
            shadow="sm"
            p="md"
            radius="md"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: "var(--mantine-color-blue-6)",
            }}
            aria-label="Mentor AI"
          >
            <Stack gap="md">
              <Title order={4} size="sm" tt="uppercase" c="blue.3" fw={600}>
                Mentor AI
              </Title>

              <Textarea
                label="Twoje pytanie"
                value={mentorQuestion}
                onChange={(e) => setMentorQuestion(e.target.value)}
                placeholder="Np. co sprawdzić jako pierwsze na płycie?"
                minRows={3}
                spellCheck={false}
              />
              <Button onClick={() => void handleMentorSend()} loading={mentorLoading}>
                Wyślij
              </Button>

              <Text size="sm" fw={500}>
                Historia kroków
              </Text>
              <ScrollArea h="min(52vh, 28rem)" type="auto" offsetScrollbars="present">
                <Stack gap="md" pr="xs" aria-live="polite">
                  {repair.diagnosisSteps.length === 0 && !mentorLoading && !mentorError ? (
                    <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                      Wyślij pierwsze pytanie — pojawi się krok 1.
                    </Text>
                  ) : null}
                  {repair.diagnosisSteps.map((s, i) => {
                    const wynik = repair.diagnosisSteps[i + 1]?.question;
                    return (
                      <Paper key={s.step} p="sm" radius="sm" withBorder bg="dark.6">
                        <Text size="xs" c="teal.4" tt="uppercase" fw={600} mb={8}>
                          KROK {s.step}
                        </Text>
                        <Text size="xs" c="dimmed" tt="uppercase" mb={4}>
                          AI
                        </Text>
                        <Text component="pre" size="sm" ff="monospace" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {s.answer}
                        </Text>
                        <Text size="xs" c="dimmed" tt="uppercase" mb={4} mt="sm">
                          WYNIK
                        </Text>
                        <Text component="pre" size="sm" ff="monospace" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {wynik ?? "—"}
                        </Text>
                      </Paper>
                    );
                  })}
                  {mentorLoading ? (
                    <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                      Myślę…
                    </Text>
                  ) : null}
                  {mentorError ? (
                    <Text size="sm" c="red.4">
                      {mentorError}
                    </Text>
                  ) : null}
                </Stack>
              </ScrollArea>

              {repair.diagnosisSteps.length > 0 ? (
                <Stack gap="md" pt="sm" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
                  <Title order={5} size="sm" c="dimmed" tt="uppercase">
                    Podaj wynik pomiaru / obserwacji
                  </Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="3V_ALW"
                      type="number"
                      inputMode="decimal"
                      rightSection={<Text size="xs">V</Text>}
                      value={alw3v}
                      onChange={(e) => setAlw3v(e.target.value)}
                      disabled={mentorLoading}
                      aria-label="Napięcie 3V ALW w woltach"
                    />
                    <TextInput
                      label="5V_ALW"
                      type="number"
                      inputMode="decimal"
                      rightSection={<Text size="xs">V</Text>}
                      value={alw5v}
                      onChange={(e) => setAlw5v(e.target.value)}
                      disabled={mentorLoading}
                      aria-label="Napięcie 5V ALW w woltach"
                    />
                  </SimpleGrid>
                  <Textarea
                    id="resultInput"
                    label="Dodatkowy opis"
                    value={resultInput}
                    onChange={(e) => setResultInput(e.target.value)}
                    placeholder="Np. brak zwarcia na głównej, zachowanie po power…"
                    minRows={3}
                    spellCheck={false}
                    disabled={mentorLoading}
                  />
                  <Button
                    onClick={() => void handleSendStepResult()}
                    disabled={mentorLoading || buildStepResultPayload(alw3v, alw5v, resultInput) === null}
                    loading={mentorLoading}
                  >
                    Wyślij wynik
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        <Paper withBorder shadow="sm" p="lg" radius="md">
          <Stack gap="md">
            <Title order={3}>Szczegóły naprawy</Title>
            <Text size="xs" c="dimmed" ff="monospace" style={{ wordBreak: "break-all" }} title={repair.id}>
              ID: {repair.id}
            </Text>
            <Stack gap="xs">
              <Stack gap="xs" pb="xs" style={{ borderBottom: "1px solid var(--mantine-color-dark-5)" }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.06em" }}>
                  Klient
                </Text>
                {detailRow("Numer zlecenia", repair.orderNumber)}
                {detailRow("Imię klienta", repair.customerName || "—", true)}
                {detailRow("Telefon", repair.customerPhone || "—", true)}
              </Stack>
              {detailRow("Typ urządzenia", repair.device_type)}
              {detailRow("Marka", repair.brand)}
              {detailRow("Model", repair.model || "—")}
              {detailRow("Płyta główna", repair.motherboard || "—", true)}
              {detailRow("Tryb diagnostyki", DIAGNOSTIC_MODE_LABELS[repair.diagnosticMode])}
              <Stack gap={6}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.06em" }}>
                  Objaw
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {repair.symptom}
                </Text>
              </Stack>
              <Group justify="space-between" align="center" wrap="nowrap" gap="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.06em" }} miw={120}>
                  Status
                </Text>
                <Badge variant="light" color={repairStatusBadgeColor(repair.status)}>
                  {REPAIR_STATUS_LABELS[repair.status]}
                </Badge>
              </Group>
              <Stack gap="xs" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: "0.06em" }}>
                  Dokumentacja
                </Text>
                {detailRow(
                  "Schemat",
                  documentationUiLabel(
                    repair.documentation.schematicStatus,
                    repair.documentation.schematicFileName,
                  ),
                )}
                {detailRow(
                  "Boardview",
                  documentationUiLabel(
                    repair.documentation.boardviewStatus,
                    repair.documentation.boardviewFileName,
                  ),
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper withBorder shadow="sm" p="lg" radius="md">
          <Title order={4} size="sm" tt="uppercase" c="teal.4" mb="md">
            Notatki serwisowe
          </Title>
          <Textarea
            value={repair.notes}
            onChange={(e) => onUpdateRepair({ ...repair, notes: e.target.value })}
            placeholder="Pomiary, ustalenia, części…"
            minRows={6}
            spellCheck={false}
          />
        </Paper>

        <Paper withBorder shadow="sm" p="lg" radius="md">
          <Title order={4} size="sm" tt="uppercase" c="teal.4" mb="md">
            Wynik naprawy
          </Title>
          <Stack gap="md">
            <Textarea
              label="Diagnoza"
              value={repair.finalDiagnosis}
              onChange={(e) => onUpdateRepair({ ...repair, finalDiagnosis: e.target.value })}
              placeholder="Końcowa diagnoza…"
              minRows={4}
              spellCheck={false}
            />
            <Textarea
              label="Rozwiązanie"
              value={repair.solution}
              onChange={(e) => onUpdateRepair({ ...repair, solution: e.target.value })}
              placeholder="Co zrobiono, wymienione elementy…"
              minRows={4}
              spellCheck={false}
            />
          </Stack>
        </Paper>

        <Paper
          withBorder
          shadow="sm"
          p="lg"
          radius="md"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--mantine-color-teal-6)" }}
        >
          <Title order={4} size="sm" tt="uppercase" c="teal.4" mb="sm">
            Checklista diagnostyczna
          </Title>
          {steps.length === 0 ? (
            <Text size="sm" c="dimmed">
              Brak automatycznej checklisty dla tego objawu.
            </Text>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Objaw wskazuje na problem ze startem / zasilaniem — odhacz wykonane kroki.
              </Text>
              <Stack gap="xs">
                {steps.map((step) => (
                  <Checkbox
                    key={step.id}
                    label={step.label}
                    checked={step.done}
                    onChange={() => toggleDiagnosticStep(step.id)}
                    styles={{
                      label: {
                        textDecoration: step.done ? "line-through" : undefined,
                        color: step.done ? "var(--mantine-color-dimmed)" : undefined,
                      },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
