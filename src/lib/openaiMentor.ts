import OpenAI from "openai";
import { getServiceKnowledge } from "./serviceKnowledge";

const MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.2;
/** Limit długości odpowiedzi (krótsze, konkretne komunikaty). */
const MAX_TOKENS = 600;

/** Nadrzędne reguły; szczegóły, format odpowiedzi i typowe ścieżki — w wiadomości „WIEDZA SERWISOWA APLIKACJI”. */
const SYSTEM_PROMPT = `Jesteś mentorem diagnostyki elektroniki serwisowej (płyty, zasilanie, sygnały).
Odpowiadasz po polsku, krótko i praktycznie — jak serwisant przy płycie.
Stosuj treść z bloku „WIEDZA SERWISOWA APLIKACJI” w tej rozmowie (format KROK / JAK ZNALEŹĆ / DLACZEGO / PODAJ WYNIK, zasady z/bez schematu, narzędzia, typowe sekcje).
Bazuj też na kontekście naprawy i na całej dotychczasowej rozmowie. Nie zgadujesz ani nie uzupełniasz z głowy danych, których użytkownik nie podał.

Nadrzędnie:
- Laptop / płyta laptopowa: NIE opisuj złączy ATX, PS_ON ani 24-pin.
- Brak typu urządzenia lub płyty: doprecyzuj, zanim poprosisz o pomiary.
- W kontekście naprawy są linie «Schemat: …» i «Boardview: …» — traktuj jako fakty; «Schemat: brak» = tryb bez schematu według bazy wiedzy.
- Zakres diagnostyki: cała sensowna ścieżka zasilania i sterowania, nie tylko przetwornica 3V/5V (szczegóły i kolejność — w bazie wiedzy).
- Kolejny krok tylko z faktów z rozmowy i kontekstu; nie powtarzaj wykonanego pomiaru; nie wracaj do sprawdzonych etapów bez sprzeczności; brakujące dane — jedno pytanie w „PODAJ WYNIK”.
- Jedna odpowiedź = jeden następny krok diagnostyczny.`;

export type MentorMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Rzucane, gdy w .env nie ma VITE_OPENAI_API_KEY. */
export const OPENAI_MENTOR_MISSING_KEY = "OPENAI_MENTOR_MISSING_KEY";

export async function askOpenAiMentor({
  context,
  question,
  history = [],
}: {
  context: string;
  question: string;
  history?: MentorMessage[];
}): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error(OPENAI_MENTOR_MISSING_KEY);
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const serviceBlock = `WIEDZA SERWISOWA APLIKACJI:\n${getServiceKnowledge()}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: serviceBlock },
    { role: "user", content: `Kontekst naprawy:\n${context}` },
    ...history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OPENAI_MENTOR_EMPTY_REPLY");
  }
  return text;
}
