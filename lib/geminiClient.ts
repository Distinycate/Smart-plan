export async function fetchGeminiWithRetry(apiUrl: string, payload: any, maxRetries = 4, customApiKey?: string) {
  let attempt = 0;
  const baseDelay = 1500; // 1.5s base delay
  const finalApiKey = customApiKey || process.env.GEMINI_API_KEY || '';

  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      // Increase timeout slightly to allow for longer retries if needed
      const timeoutId = setTimeout(() => controller.abort(), 55000); 

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': finalApiKey
        },
        body: JSON.stringify(payload),
        next: { revalidate: 0 }, // bypass cache
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return response; // Success
      }

      const errText = await response.text();
      
      // If 503 or 429, we should retry
      if (response.status === 503 || response.status === 429) {
        attempt++;
        if (attempt >= maxRetries) {
          if (response.status === 429 || errText.includes('429') || errText.includes('quota')) {
            throw new Error('RateLimit');
          }
          throw new Error(`Gemini API Error (Status ${response.status}): ${errText}`);
        }
        
        // Adjust delay: if 429 (rate limit), we should wait much longer (e.g. 8-12 seconds)
        let delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        if (response.status === 429) {
           // For rate limits, wait longer to let the quota refill.
           delay = 8000 + (attempt * 2000) + Math.random() * 1000; // 10s, 12s, 14s
        }
        
        console.warn(`[Gemini API] Status ${response.status}. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`);
        
        await new Promise(res => setTimeout(res, delay));
        continue;
      } else {
        // Other errors (e.g. 400 Bad Request, 401 Unauthorized), don't retry
        if (response.status === 429 || errText.includes('429') || errText.includes('quota')) {
          throw new Error('RateLimit');
        }
        throw new Error(`Gemini API Error (Status ${response.status}): ${errText}`);
      }
    } catch (error: any) {
      if (error.message === 'RateLimit' || error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('ขณะนี้มีผู้ใช้งานระบบจำนวนมาก โปรดรอสักครู่ (ประมาณ 1 นาที) แล้วลองใหม่อีกครั้ง');
      }
      
      // Do not retry if we explicitly threw a Gemini API Error for a bad request (400) or unauthorized (401)
      if (error.message.startsWith('Gemini API Error')) {
        throw error;
      }
      
      // Fetch threw a network error
      if (attempt >= maxRetries - 1) {
        throw error;
      }
      attempt++;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Gemini API] Network Error: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("Failed to fetch from Gemini after maximum retries.");
}
