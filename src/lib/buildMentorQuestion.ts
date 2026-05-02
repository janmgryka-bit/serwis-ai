/** Małe litery + usunięcie znaków diakrytycznych (np. „pobór” → „pobor”) do dopasowania fraz. */
function foldForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

const VIN_OK =
  "\n\nUstalony stan: VIN obecny, zwarcie głównej linii wykluczone, pobór prądu 0A/0mA. Nie pytaj ponownie o VIN ani rezystancję głównej linii. Następny krok ma dotyczyć znalezienia i pomiaru sekcji standby/ALW fizycznie na płycie, bez schematu jeśli dokumentacja nie jest dodana.";

/**
 * Normalizuje pierwsze pytanie do mentora, gdy użytkownik już streścił VIN / brak zwarcia / zerowy pobór.
 */
export function buildMentorQuestion(question: string): string {
  const n = foldForMatch(question);
  const hasVin =
    n.includes("vin jest") || n.includes("vin obecny") || n.includes("vin ok");
  const hasNoShort =
    n.includes("zwarcia brak") || n.includes("brak zwarcia");
  const hasZeroDraw = n.includes("pobor 0a") || n.includes("pobor 0ma");
  if (hasVin && hasNoShort && hasZeroDraw) {
    return `${question.trimEnd()}${VIN_OK}`;
  }
  return question;
}
