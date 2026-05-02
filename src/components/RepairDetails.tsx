import { useEffect, useState } from "react";
import { type Repair, REPAIR_STATUS_LABELS } from "../types/repair";
import { buildAiContext } from "../lib/buildAiContext";
import { askOpenAiMentor, OPENAI_MENTOR_MISSING_KEY } from "../lib/openaiMentor";

type RepairDetailsProps = {
  repair: Repair;
  onBack: () => void;
  onUpdateRepair: (updatedRepair: Repair) => void;
};

function badgeClass(status: Repair["status"]): string {
  return `badge badge--${status.replace(/\s/g, "-")}`;
}

export function RepairDetails({ repair, onBack, onUpdateRepair }: RepairDetailsProps) {
  const steps = repair.diagnosticSteps;
  const [mentorOpen, setMentorOpen] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState("");
  const [mentorReply, setMentorReply] = useState<string | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);

  useEffect(() => {
    setMentorOpen(false);
    setMentorQuestion("");
    setMentorReply(null);
    setMentorLoading(false);
    setMentorError(null);
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
    setMentorReply(null);
    setMentorLoading(true);
    try {
      const context = buildAiContext(repair);
      const text = await askOpenAiMentor({ context, question: mentorQuestion });
      setMentorReply(text);
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

  return (
    <div className="repair-details">
      <div className="repair-details__toolbar">
        <button type="button" className="btn btn--ghost repair-details__back" onClick={onBack}>
          ← Lista napraw
        </button>
        <button
          type="button"
          className={`btn btn--ai${mentorOpen ? " btn--ai-active" : ""}`}
          onClick={() => setMentorOpen((o) => !o)}
        >
          🤖 Zapytaj AI
        </button>
      </div>

      {mentorOpen ? (
        <section className="mentor-panel" aria-label="Mentor AI">
          <h3 className="mentor-panel__title">Mentor AI</h3>
          <label className="field mentor-panel__field">
            <span className="field__label">Twoje pytanie</span>
            <textarea
              className="input input--area mentor-panel__textarea"
              value={mentorQuestion}
              onChange={(e) => setMentorQuestion(e.target.value)}
              placeholder="Np. co sprawdzić jako pierwsze na płycie?"
              rows={3}
              spellCheck={false}
            />
          </label>
          <div className="mentor-panel__row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleMentorSend()}
              disabled={mentorLoading}
            >
              Wyślij
            </button>
          </div>
          <label className="field mentor-panel__field">
            <span className="field__label">Odpowiedź</span>
            <div className="mentor-panel__reply mono" aria-live="polite">
              {mentorLoading ? (
                <span className="mentor-panel__thinking muted">Myślę…</span>
              ) : mentorError ? (
                <span className="mentor-panel__error">{mentorError}</span>
              ) : mentorReply ? (
                mentorReply
              ) : (
                <span className="mentor-panel__reply-placeholder muted">
                  Tu pojawi się odpowiedź mentora…
                </span>
              )}
            </div>
          </label>
        </section>
      ) : null}

      <section className="repair-details__panel">
        <h2 className="repair-details__title">Szczegóły naprawy</h2>
        <p className="repair-details__id mono" title={repair.id}>
          ID: {repair.id}
        </p>

        <dl className="detail-grid">
          <div className="detail-grid__row">
            <dt>Typ urządzenia</dt>
            <dd>{repair.device_type}</dd>
          </div>
          <div className="detail-grid__row">
            <dt>Marka</dt>
            <dd>{repair.brand}</dd>
          </div>
          <div className="detail-grid__row">
            <dt>Model</dt>
            <dd>{repair.model || "—"}</dd>
          </div>
          <div className="detail-grid__row">
            <dt>Płyta główna</dt>
            <dd className="muted">{repair.motherboard || "—"}</dd>
          </div>
          <div className="detail-grid__row detail-grid__row--block">
            <dt>Objaw</dt>
            <dd className="repair-details__symptom">{repair.symptom}</dd>
          </div>
          <div className="detail-grid__row">
            <dt>Status</dt>
            <dd>
              <span className={badgeClass(repair.status)}>
                {REPAIR_STATUS_LABELS[repair.status]}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="repair-details__panel repair-details__panel--notes">
        <h3 className="repair-details__subtitle repair-details__subtitle--section">
          Notatki serwisowe
        </h3>
        <textarea
          className="input input--area input--notes"
          value={repair.notes}
          onChange={(e) => onUpdateRepair({ ...repair, notes: e.target.value })}
          placeholder="Pomiary, ustalenia, części…"
          rows={6}
          spellCheck={false}
        />
      </section>

      <section className="repair-details__panel repair-details__panel--checklist">
        <h3 className="repair-details__subtitle">Checklista diagnostyczna</h3>
        {steps.length === 0 ? (
          <p className="repair-details__checklist-empty muted">
            Brak automatycznej checklisty dla tego objawu.
          </p>
        ) : (
          <>
            <p className="repair-details__checklist-hint">
              Objaw wskazuje na problem ze startem / zasilaniem — odhacz wykonane kroki.
            </p>
            <ul className="checklist">
              {steps.map((step) => (
                <li key={step.id}>
                  <label className="checklist__item">
                    <input
                      type="checkbox"
                      className="checklist__checkbox"
                      checked={step.done}
                      onChange={() => toggleDiagnosticStep(step.id)}
                    />
                    <span
                      className={
                        step.done ? "checklist__label checklist__label--done" : "checklist__label"
                      }
                    >
                      {step.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
