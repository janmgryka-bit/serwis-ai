import { useEffect, useState } from "react";
import { Alert, Box, Container, Group, Loader, Text, Title } from "@mantine/core";
import { RepairList } from "./components/RepairList";
import { RepairForm } from "./components/RepairForm";
import { RepairDetails } from "./components/RepairDetails";
import { useRepairsDatabase } from "./hooks/useRepairsDatabase";
import { buildDiagnosticStepsForSymptom } from "./lib/powerDiagnosticChecklist";
import { type Repair, type RepairDraft } from "./types/repair";

type View = "list" | "form" | "details";

function App() {
  const { repairs, ready, loadError, addRepair, updateRepairDb, refreshRepairs } = useRepairsDatabase();
  const [view, setView] = useState<View>("list");
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);

  async function handleSave(draft: RepairDraft) {
    const newRepair: Repair = {
      ...draft,
      id: crypto.randomUUID(),
      orderNumber: `SRV-${Date.now()}`,
      customerName: draft.customerName.trim(),
      customerPhone: draft.customerPhone.trim(),
      status: "nowa",
      notes: "",
      finalDiagnosis: draft.finalDiagnosis.trim(),
      solution: draft.solution.trim(),
      diagnosticSteps: buildDiagnosticStepsForSymptom(draft.symptom),
      diagnosisSteps: draft.diagnosisSteps ?? [],
      attachedFiles: draft.attachedFiles ?? [],
    };
    await addRepair(newRepair);
    setView("list");
  }

  const selectedRepair =
    selectedRepairId != null ? repairs.find((r) => r.id === selectedRepairId) : undefined;

  function goToList() {
    setSelectedRepairId(null);
    setView("list");
  }

  useEffect(() => {
    if (view === "details" && !selectedRepair) {
      setSelectedRepairId(null);
      setView("list");
    }
  }, [view, selectedRepair]);

  const openDetails = (r: Repair) => {
    setSelectedRepairId(r.id);
    setView("details");
  };

  return (
    <Box style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        component="header"
        py="sm"
        style={{
          borderBottom: "1px solid var(--mantine-color-dark-4)",
          background: "linear-gradient(180deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)",
        }}
      >
        <Container size="xl" px={{ base: "sm", sm: "md" }}>
          <Group gap="md" align="center" wrap="nowrap">
            <Text component="span" size="xl" c="teal.4" aria-hidden>
              ◈
            </Text>
            <Box>
              <Title order={2} size="h4">
                Serwis AI
              </Title>
              <Text size="xs" c="dimmed" ff="monospace" mt={2}>
                Rejestr napraw · SQLite
              </Text>
            </Box>
          </Group>
        </Container>
      </Box>

      <Box
        component="main"
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!ready ? (
          <Container size="sm" py="xl">
            <Group justify="center" gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Ładowanie bazy danych…
              </Text>
            </Group>
          </Container>
        ) : (
          <Box style={{ flex: 1, minWidth: 0, width: "100%" }}>
            {loadError ? (
              <Container size="md" py="md">
                <Alert color="red" title="Baza danych">
                  {loadError}
                </Alert>
              </Container>
            ) : null}
            {view === "list" ? (
              <RepairList
                repairs={repairs}
                onNewRepair={() => setView("form")}
                onSelectRepair={openDetails}
              />
            ) : view === "form" ? (
              <RepairForm onSave={(d) => void handleSave(d)} onCancel={goToList} />
            ) : selectedRepair ? (
              <RepairDetails
                repair={selectedRepair}
                onBack={goToList}
                onUpdateRepair={(r) => void updateRepairDb(r)}
                onFilesChanged={() => void refreshRepairs()}
              />
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
