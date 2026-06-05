export async function fetchGeminiWithRetry(apiUrl: string, payload: any, maxRetries = 6, customApiKey?: string) {
  let attempt = 0;
  const baseDelay = 1500; // 1.5s base delay
  
  // Extract pool of keys (comma separated)
  const envKeys = process.env.GEMINI_API_KEYS || customApiKey || process.env.GEMINI_API_KEY || '';
  const apiKeys = envKeys.split(',').map(k => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    throw new Error('API Key is not configured.');
  }

  while (attempt < maxRetries) {
    // Round-robin key selection based on attempt count
    const currentKey = apiKeys[attempt % apiKeys.length];

    try {
      const controller = new AbortController();
      // Increase timeout slightly to allow for longer retries if needed
      const timeoutId = setTimeout(() => controller.abort(), 55000); 

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': currentKey
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
            throw new Error('ขณะนี้มีการใช้งานระบบ AI จำนวนมาก หรือโควต้า API เต็ม (Status 429) โปรดรอสัก 1-2 นาทีแล้วลองใหม่อีกครั้ง');
          }
          if (response.status === 503) {
            throw new Error('เซิร์ฟเวอร์ AI ของ Google ขัดข้องชั่วคราว (Status 503) โปรดรอสักครู่แล้วลองใหม่อีกครั้ง');
          }
          throw new Error(`เกิดข้อผิดพลาดจาก AI (Status ${response.status}): ${errText}`);
        }
        
        // Adjust delay: if 429 (rate limit), we should wait much longer (e.g. 8-12 seconds)
        let delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        if (response.status === 429) {
           // If we have multiple keys, we can retry almost immediately with the next key
           if (apiKeys.length > 1) {
             delay = 500 + Math.random() * 500; // short delay to switch key
           } else {
             delay = 8000 + (attempt * 2000) + Math.random() * 1000; // 10s, 12s, 14s
           }
        }
        
        console.warn(`[Gemini API] Status ${response.status}. Attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms with a key...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      } else {
        // Other errors (e.g. 400 Bad Request, 401 Unauthorized), don't retry
        if (response.status === 400) throw new Error('ข้อมูลคำสั่งที่ส่งไปยัง AI ไม่ถูกต้อง (Status 400) กรุณาลองตรวจสอบข้อมูลที่กรอกอีกครั้ง');
        if (response.status === 401) throw new Error('รหัส API Key ไม่ถูกต้องหรือหมดอายุ (Status 401) กรุณาตรวจสอบการตั้งค่า API Key ใน Vercel หรือไฟล์ .env.local');
        if (response.status === 403) throw new Error('ระบบปฏิเสธการเข้าถึง AI (Status 403) กรุณาตรวจสอบสิทธิ์การใช้งาน API Key ของคุณ');
        if (response.status === 404) throw new Error('ไม่พบโมเดล AI ที่ระบุในระบบ (Status 404) ระบบอาจมีการอัปเดตเวอร์ชัน โปรดแจ้งผู้ดูแลระบบ');
        if (response.status === 500) throw new Error('เกิดข้อผิดพลาดภายในระบบ AI ของ Google (Status 500) โปรดลองใหม่อีกครั้ง');
        
        throw new Error(`AI ขัดข้อง (Status ${response.status}): ${errText.substring(0, 100)}...`);
      }
    } catch (error: any) {
      // Throw friendly network / timeout errors immediately without retry if it's the last attempt
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        if (attempt >= maxRetries - 1) {
          throw new Error('การประมวลผลใช้เวลานานเกินไป (Timeout) อาจเกิดจากเนื้อหายาวเกินไป โปรดลองใหม่อีกครั้ง');
        }
      }
      
      // If we threw a friendly Thai error, bubble it up directly
      if (error.message.includes('Status') || error.message.includes('AI')) {
        throw error;
      }
      
      if (attempt >= maxRetries - 1) {
        throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย โปรดตรวจสอบอินเทอร์เน็ตและลองใหม่อีกครั้ง');
      }
      attempt++;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw new Error("ล้มเหลวในการเชื่อมต่อกับ AI หลังจากพยายามซ้ำหลายครั้ง โปรดลองใหม่อีกครั้งในภายหลัง");
}
