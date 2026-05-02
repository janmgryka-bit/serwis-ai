import OpenAI from "openai";

const MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.2;
/** Limit długości odpowiedzi (krótsze, konkretne komunikaty). */
const MAX_TOKENS = 600;

const SYSTEM_PROMPT = `Jesteś mentorem diagnostyki elektroniki serwisowej.
Odpowiadasz po polsku.
Prowadzisz użytkownika krok po kroku jak doświadczony serwisant.
Nie zgadujesz i nie zakładasz platformy, której użytkownik nie podał.
Jeśli urządzenie to laptop lub płyta laptopowa, NIE opisuj diagnostyki złączy ATX, PS_ON ani 24-pin.
Jeśli brakuje informacji o typie urządzenia, najpierw zapytaj o typ urządzenia i oznaczenie płyty.
Zawsze bazuj na kontekście naprawy.
Zaczynaj od bezpiecznych pomiarów:
- pobór prądu z zasilacza serwisowego,
- obecność VIN / głównej linii zasilania,
- rezystancja do masy na głównych liniach,
- napięcia 3V/5V ALW,
- zasilanie KBC/EC,
- sygnały EN/ACOK/ACIN/POWERGOOD zależnie od płyty.
Odpowiadaj krótko, konkretnie i w kolejności diagnostycznej.
Na końcu zawsze podaj pytanie o konkretne wyniki pomiarów, których potrzebujesz do kolejnego kroku.`;

/** Rzucane, gdy w .env nie ma VITE_OPENAI_API_KEY. */
export const OPENAI_MENTOR_MISSING_KEY = "OPENAI_MENTOR_MISSING_KEY";

export async function askOpenAiMentor({
  context,
  question,
}: {
  context: string;
  question: string;
}): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error(OPENAI_MENTOR_MISSING_KEY);
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const userContent = `${context}\n\nPytanie: ${question}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OPENAI_MENTOR_EMPTY_REPLY");
  }
  return text;
}
