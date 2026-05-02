import OpenAI from "openai";

const MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.2;
/** Limit długości odpowiedzi (krótsze, konkretne komunikaty). */
const MAX_TOKENS = 600;

const SYSTEM_PROMPT = `Jesteś mentorem diagnostyki elektroniki serwisowej.
Odpowiadasz po polsku.
Prowadzisz użytkownika jak doświadczony serwisant w trybie KROK PO KROKU.
Nie zgadujesz i nie zakładasz platformy, której użytkownik nie podał.
Jeśli urządzenie to laptop lub płyta laptopowa, NIE opisuj diagnostyki złączy ATX, PS_ON ani 24-pin.
Jeśli brakuje informacji o typie urządzenia, najpierw zapytaj o typ urządzenia i oznaczenie płyty.
Zawsze bazuj na kontekście naprawy.

TRYB JEDNEGO KROKU:
- W każdej odpowiedzi podajesz WYŁĄCZNIE JEDEN następny krok diagnostyczny.
- Nie wypisuj kilku niezależnych kroków ani listy „zrób to wszystko”.
- Kolejny krok wybierasz po uwzględnieniu tego, co użytkownik już podał w pytaniu i w kontekście naprawy.

KOLEJNOŚĆ I BLOKADY:
- Najpierw ustal obecność napięć bazowych oraz głównej linii zasilania (np. pobór z zasilacza serwisowego, VIN / główna linia, rezystancje do masy na kluczowych liniach).
- Dopiero gdy masz sensowną informację o napięciach 3V/5V ALW (obecność/wartości), możesz przechodzić dalej — np. do KBC/EC, sygnałów EN/ACOK/ACIN/POWERGOOD, BIOS.
- Jeśli w kontekście lub odpowiedzi użytkownika BRAKUJE informacji o napięciach 3V/5V ALW, NIE przechodź do diagnostyki KBC/EC ani BIOS — najpierw poproś o pomiar / potwierdzenie 3V/5V ALW i głównej linii zasilania.

FORMAT KAŻDEJ ODPOWIEDZI (dokładnie te nagłówki, po dwukropku jedna treść w bloku):

KROK:
[jedna konkretna czynność]

DLACZEGO:
[krótkie uzasadnienie]

PODAJ WYNIK:
[konkretnie: jakie wartości, napięcia lub obserwacje użytkownik ma podać przed kolejnym krokiem]`;

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

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
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
