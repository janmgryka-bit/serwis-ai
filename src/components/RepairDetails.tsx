import { useEffect, useState } from "react";
import { type Repair, REPAIR_STATUS_LABELS } from "../types/repair";
import {
  POWER_DIAGNOSTIC_STEPS,
  shouldShowPowerDiagnostic,
} from "../lib/powerDiagnosticChecklist";

type RepairDetailsProps = {
  repair: Repair;
  onBack: () => void;
  onUpdateRepair: (updatedRepair: Repair) => void;
};

function badgeClass(status: Repair["status"]): string {
  return `badge badge--${status.replace(/\s/g, "-")}`;
}

export function RepairDetails({ repair, onBack, onUpdateRepair }: RepairDetailsProps) {
  const showChecklist = shouldShowPowerDiagnostic(repair.symptom);
  const [done, setDone] = useState<boolean[]>(() =>
    POWER_DIAGNOSTIC_STEPS.map(() => false),
  );

  useEffect(() => {
    setDone(POWER_DIAGNOSTIC_STEPS.map(() => false));
  }, [repair.id]);

  function toggleStep(index: number) {
    setDone((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  return (
    <div className="repair-details">
      <div className="repair-details__toolbar">
        <button type="button" className="btn btn--ghost repair-details__back" onClick={onBack}>
          ← Lista napraw
        </button>
        <button type="button" className="btn btn--ai">
          🤖 Zapytaj AI
        </button>
      </div>

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

      {showChecklist ? (
        <section className="repair-details__panel repair-details__panel--checklist">
          <h3 className="repair-details__subtitle">Checklista diagnostyczna</h3>
          <p className="repair-details__checklist-hint">
            Objaw wskazuje na problem ze startem / zasilaniem — odhacz wykonane kroki.
          </p>
          <ul className="checklist">
            {POWER_DIAGNOSTIC_STEPS.map((label, i) => (
              <li key={label}>
                <label className="checklist__item">
                  <input
                    type="checkbox"
                    className="checklist__checkbox"
                    checked={done[i] ?? false}
                    onChange={() => toggleStep(i)}
                  />
                  <span className={done[i] ? "checklist__label checklist__label--done" : "checklist__label"}>
                    {label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
