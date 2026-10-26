// Transcribe a WAV buffer using the Google Gemini API (Gemini 2.5 Flash).
// Runs in the main process so the GEMINI_API_KEY never leaks to the renderer.

export async function transcribeGemini(wav: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your key in Settings or Onboarding.",
    );
  }

  const base64Audio = wav.toString("base64");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "audio/wav",
              data: base64Audio,
            },
          },
          {
            text: "Accurately transcribe the spoken voice command from this audio. Return ONLY the verbatim transcript as plain text. Do not include markdown, quotes, explanations, or filler words.",
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini voice transcription failed: ${res.status} ${errorText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}
