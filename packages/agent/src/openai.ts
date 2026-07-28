import OpenAI from "openai";
import {
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
} from "@openai/agents";

// LLM is provider-agnostic and env-swappable (PRD §8). We target any
// OpenAI-compatible endpoint (Groq, OpenRouter, Gemini's OpenAI shim, Ollama…).
export const MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

let configured = false;

/** Point the Agents SDK at the configured OpenAI-compatible endpoint (once). */
export function configureModelProvider(): void {
  if (configured) return;

  const apiKey = process.env.LLM_API_KEY;
  const baseURL = process.env.LLM_BASE_URL; // undefined => api.openai.com
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not set (see .env.local)");
  }

  setDefaultOpenAIClient(new OpenAI({ apiKey, baseURL }));
  // Compatible endpoints speak Chat Completions, not OpenAI's Responses API.
  setOpenAIAPI("chat_completions");
  // Tracing uploads to OpenAI's platform; disable it for non-OpenAI providers.
  setTracingDisabled(true);

  configured = true;
}
