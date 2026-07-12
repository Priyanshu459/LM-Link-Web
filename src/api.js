export const fetchModels = async (baseUrl) => {
  try {
    const url = new URL(baseUrl);
    const response = await fetch(`/api-proxy${url.pathname}/models`, {
      headers: {
        'x-proxy-target': url.origin
      }
    });
    if (!response.ok) throw new Error('Failed to fetch models');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

export const sendChatCompletion = async (baseUrl, model, messages, onChunk) => {
  try {
    const url = new URL(baseUrl);
    const response = await fetch(`/api-proxy${url.pathname}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-target': url.origin
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
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
