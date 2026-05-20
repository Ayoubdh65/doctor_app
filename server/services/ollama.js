import { config } from "../config.js";

export async function generateMedicalReport(prompt) {
  let response;

  try {
    response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.15,
          top_p: 0.8,
        },
      }),
    });
  } catch (error) {
    const message = `Ollama is not reachable at ${config.ollamaBaseUrl}. Make sure the Ollama app/service is running and the model "${config.ollamaModel}" is installed.`;
    const ollamaError = new Error(message);
    ollamaError.status = 503;
    ollamaError.cause = error;
    throw ollamaError;
  }

  if (!response.ok) {
    const errorText = await response.text();
    const ollamaError = new Error(
      `Ollama ${response.status}: ${errorText || response.statusText}`
    );
    ollamaError.status = response.status >= 500 ? 502 : response.status;
    throw ollamaError;
  }

  const data = await response.json();
  return data.response || "";
}
