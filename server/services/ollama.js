import { config } from "../config.js";

export async function generateMedicalReport(prompt) {
  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.response || "";
}
