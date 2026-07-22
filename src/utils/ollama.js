// Client for a locally-hosted Ollama server (https://ollama.com).
// Used for AI clue assistance. All config lives in localStorage so it is
// per-device and never leaves the machine.
import { loadJSON, saveJSON } from './storage';

const CONFIG_KEY = 'ollama';
export const DEFAULT_CONFIG = {
  enabled: false,
  baseUrl: 'http://localhost:11434',
  model: 'llama3.1',
};

export const getOllamaConfig = () => ({ ...DEFAULT_CONFIG, ...loadJSON(CONFIG_KEY, {}) });
export const saveOllamaConfig = (cfg) => saveJSON(CONFIG_KEY, { ...getOllamaConfig(), ...cfg });

const withTimeout = (ms) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(id) };
};

const trimBase = (url) => (url || '').replace(/\/+$/, '');

// Warn if an https page tries to reach an http Ollama (browsers block this as
// mixed content). Returns a message string, or null if fine.
export const mixedContentWarning = (baseUrl) => {
  try {
    if (typeof window === 'undefined') return null;
    if (window.location.protocol === 'https:' && /^http:\/\//i.test(baseUrl || '')) {
      return 'This page is served over HTTPS but the Ollama URL is HTTP — browsers block that (mixed content). Serve the app over HTTP, or put Ollama behind HTTPS.';
    }
  } catch { /* ignore */ }
  return null;
};

// Quick connectivity + model list. Throws on failure with a friendly message.
export const listModels = async (baseUrl) => {
  const mc = mixedContentWarning(baseUrl);
  if (mc) throw new Error(mc);
  const t = withTimeout(8000);
  try {
    const res = await fetch(`${trimBase(baseUrl)}/api/tags`, { signal: t.signal });
    if (!res.ok) throw new Error(`Server responded ${res.status}.`);
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Timed out reaching Ollama (check the URL / VPN).');
    if (err.message && err.message.startsWith('Server responded')) throw err;
    throw new Error('Could not reach Ollama. Check: (1) it is running; (2) the URL is right — over Tailscale use the host\'s Tailscale IP/name, not localhost; (3) it is bound to your network (OLLAMA_HOST=0.0.0.0:11434); (4) this page\'s origin is allowed (OLLAMA_ORIGINS).');
  } finally {
    t.done();
  }
};

const DIFFICULTY_HINT = {
  EASY: 'very easy and straightforward, suitable for a Monday puzzle',
  FAIR: 'gently challenging',
  MODERATE: 'medium difficulty with a little wordplay',
  HARD: 'tricky, with wordplay or misdirection',
  DIFFICULT: 'very hard, cryptic-leaning, suitable for a Saturday puzzle',
};

const cleanClueLine = (line) => {
  let c = line.trim().replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim();
  c = c.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  return c;
};

/**
 * Generate crossword clues for a word.
 * @returns {Promise<string[]>} array of candidate clues
 */
export const generateClues = async ({ baseUrl, model, word, count = 3, difficulty = 'MODERATE', language = 'English' }) => {
  const answer = (word || '').toUpperCase();
  if (!answer) return [];
  const hint = DIFFICULTY_HINT[difficulty.toUpperCase()] || DIFFICULTY_HINT.MODERATE;
  const prompt = `You are an expert crossword clue writer. Write ${count} distinct ${language} crossword clues for the answer "${answer}".
Make them ${hint}. Keep each clue short (a few words), do NOT include the answer or its length in the clue, and do not explain.
Return ONLY the clues, one per line, with no numbering or quotes.`;

  const t = withTimeout(45000);
  try {
    const res = await fetch(`${trimBase(baseUrl)}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.8 } }),
      signal: t.signal,
    });
    if (!res.ok) throw new Error(`Ollama responded ${res.status}. Check the model name.`);
    const data = await res.json();
    const text = data.response || '';
    return text
      .split('\n')
      .map((l) => cleanClueLine(l))
      .filter((c) => c && !c.toUpperCase().includes(answer))
      .slice(0, count);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Clue generation timed out.');
    throw new Error(err.message || 'Clue generation failed.');
  } finally {
    t.done();
  }
};
