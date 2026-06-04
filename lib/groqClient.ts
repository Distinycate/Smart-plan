export async function fetchGroqWithRetry(prompt: string, maxRetries = 2) {
  let attempt = 0;
  const baseDelay = 1500;
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable.');
  }

  const payload = {
    model: 'llama-3.1-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant designed to output strict JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        next: { revalidate: 0 },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return response; // Success
      }

      const errText = await response.text();
      
      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Groq API Error (Status ${response.status}): ${errText}`);
        }
        
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[Groq API] Status ${response.status}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      } else {
        throw new Error(`Groq API Error (Status ${response.status}): ${errText}`);
      }
    } catch (error: any) {
      if (attempt >= maxRetries - 1) {
        throw error;
      }
      attempt++;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Groq API] Network Error: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("Failed to fetch from Groq after maximum retries.");
}
