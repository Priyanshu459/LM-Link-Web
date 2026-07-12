const getEndpoint = (baseUrl, path) => {
  if (import.meta.env.DEV) {
    const url = new URL(baseUrl);
    return `/api-proxy${url.pathname}${path}`;
  }
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}${path}`;
};

const getHeaders = (baseUrl, extraHeaders = {}) => {
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...extraHeaders
  };
  if (import.meta.env.DEV) {
    const url = new URL(baseUrl);
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
    console.error('Error fetching models:', error);
    throw error;
  }
};

export const pingServer = async (baseUrl) => {
  try {
    const response = await fetch(getEndpoint(baseUrl, '/models'), {
      headers: getHeaders(baseUrl)
    });
    return response.ok;
  } catch (error) {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
          } catch (e) {
            console.warn('Error parsing stream data:', e, line);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw error;
  }
};
