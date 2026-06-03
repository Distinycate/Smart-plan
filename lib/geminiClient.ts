export async function fetchGeminiWithRetry(apiUrl: string, payload: any, maxRetries = 3) {
  let attempt = 0;
  const baseDelay = 1500; // 1.5 seconds

  while (attempt < maxRetries) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        next: { revalidate: 0 } // bypass cache
      });

      if (response.ok) {
        return response; // Success
      }

      const errText = await response.text();
      
      // If 503 or 429, we should retry
      if (response.status === 503 || response.status === 429) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error(`Gemini API Error (Status ${response.status}): ${errText}`);
        }
        
        // Exponential backoff with some jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[Gemini API] Status ${response.status}. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`);
        
        await new Promise(res => setTimeout(res, delay));
        continue;
      } else {
        // Other errors (e.g. 400 Bad Request, 401 Unauthorized), don't retry
        throw new Error(`Gemini API Error (Status ${response.status}): ${errText}`);
      }
    } catch (error: any) {
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
