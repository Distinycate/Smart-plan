import { supabase } from '@/lib/supabase';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  foundIndicators: string[];
  hallucinatedIndicators: string[];
}

export async function validateIndicators(indicatorCodes: string[]): Promise<ValidationResult> {
  if (!indicatorCodes || indicatorCodes.length === 0) {
    return { isValid: true, foundIndicators: [], hallucinatedIndicators: [] };
  }

  // Clean the input codes (e.g. trim whitespace)
  const cleanedCodes = indicatorCodes.map(code => code.trim()).filter(Boolean);
  
  if (cleanedCodes.length === 0) {
    return { isValid: true, foundIndicators: [], hallucinatedIndicators: [] };
  }

  try {
    const { data, error } = await supabase
      .from('Indicators')
      .select('indicatorCode')
      .in('indicatorCode', cleanedCodes);

    if (error) {
      console.error("Database error during validation:", error);
      return { isValid: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", foundIndicators: [], hallucinatedIndicators: cleanedCodes };
    }

    const foundSet = new Set(data?.map(item => item.indicatorCode) || []);
    
    const foundIndicators: string[] = [];
    const hallucinatedIndicators: string[] = [];

    cleanedCodes.forEach(code => {
      if (foundSet.has(code)) {
        foundIndicators.push(code);
      } else {
        hallucinatedIndicators.push(code);
      }
    });

    return {
      isValid: hallucinatedIndicators.length === 0,
      foundIndicators,
      hallucinatedIndicators
    };
  } catch (e: any) {
    console.error("Validator Error:", e);
    return { isValid: false, message: e.message, foundIndicators: [], hallucinatedIndicators: cleanedCodes };
  }
}
