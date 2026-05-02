/** Stałe frazy trafiające do `Repair.symptom` (kolejność zapisu). */
export const SYMPTOM_PRESET_OPTIONS = [
  { id: "brak-reakcji", phrase: "brak reakcji" },
  { id: "nie-uruchamia", phrase: "nie uruchamia się" },
  { id: "restartuje", phrase: "restartuje się" },
  { id: "brak-obrazu", phrase: "brak obrazu" },
  { id: "zalanie", phrase: "zalanie" },
] as const;

export type SymptomPresetId = (typeof SYMPTOM_PRESET_OPTIONS)[number]["id"];

/** Składa `symptom` z zaznaczonych opcji + opcjonalnego „Inny objaw”. */
export function buildSymptomString(
  checked: Record<SymptomPresetId, boolean>,
  otherSymptom: string,
): string {
  const phrases = SYMPTOM_PRESET_OPTIONS.filter((o) => checked[o.id]).map((o) => o.phrase);
  const other = otherSymptom.trim();
  const parts: string[] = [];
  if (phrases.length > 0) {
    parts.push(phrases.join(", "));
  }
  if (other) {
    parts.push(`Inny objaw: ${other}`);
  }
  return parts.join("\n\n");
}
