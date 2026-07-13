// ── Security: Only allow http/https schemes ──────────────────────────────────
const ALLOWED_SCHEMES = ['http:', 'https:'];
const MAX_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB SSE buffer limit

/**
 * Validates that a baseUrl uses only http or https.
 * Throws a TypeError for any other scheme (javascript:, data:, ftp:, etc.)
 */
const validateUrl = (baseUrl) => {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError(`Invalid URL: "${baseUrl}"`);
  }
  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    throw new TypeError(
      `Blocked URL with disallowed scheme "${parsed.protocol}". Only http/https are permitted.`
    );
  }
  return parsed;
};

const getEndpoint = (baseUrl, path) => {
  if (import.meta.env.DEV) {
    const url = validateUrl(baseUrl);
    return `/api-proxy${url.pathname}${path}`;
  }
  validateUrl(baseUrl); // still validate in prod
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}${path}`;
};

const getHeaders = (baseUrl, extraHeaders = {}) => {
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...extraHeaders
  };
  if (import.meta.env.DEV) {
    const url = validateUrl(baseUrl);
    // Only pass the origin — never an arbitrary attacker-supplied value
    headers['x-proxy-target'] = url.origin;
  }
  return headers;
};

export const fetchModels = async (baseUrl) => {
  try {
    const response = await fetch(getEndpoint(baseUrl, '/models'), {
      headers: getHeaders(baseUrl)
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error fetching models:', error);
    throw error;
  }
};

export const pingServer = async (baseUrl) => {
  try {
    const response = await fetch(getEndpoint(baseUrl, '/models'), {
      headers: getHeaders(baseUrl)
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const sendChatCompletion = async (baseUrl, model, messages, options, onChunk, signal) => {
  try {
    const { temperature = 0.7, max_tokens = 2048, systemPrompt = '' } = options;

    // Prepend system prompt if provided
    const finalMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const response = await fetch(getEndpoint(baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: getHeaders(baseUrl, {
        'Content-Type': 'application/json'
      }),
      signal,
      body: JSON.stringify({
        model: model,
        messages: finalMessages,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(max_tokens, 10) || undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let totalBytesReceived = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // ── Security: Limit total stream size to prevent memory exhaustion ──
      totalBytesReceived += value.byteLength;
      if (totalBytesReceived > MAX_BUFFER_BYTES) {
        reader.cancel();
        throw new Error('Response stream exceeded maximum allowed size.');
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === 'data: [DONE]') {
          return;
        }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              onChunk(data.choices[0].delta.content);
            }
          } catch {
            // Silently ignore malformed SSE frames — don't log raw server data
          }
        }
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Error in chat completion:', error);
    throw error;
  }
};
