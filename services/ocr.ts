import MlkitOcr from 'react-native-mlkit-ocr';
import { OCRResult } from '../types';
import { extractExpirationDate } from './dateParser';

export async function recognizeText(imageUri: string): Promise<OCRResult> {
  try {
    const result = await MlkitOcr.detectFromUri(imageUri);

    // Combine all recognized text blocks
    const fullText = result.map((block) => block.text).join('\n');

    // Try to extract expiration date
    const extractedDate = extractExpirationDate(fullText);

    return {
      text: fullText,
      extractedDate,
    };
  } catch (error) {
    console.error('OCR recognition failed:', error);
    return {
      text: '',
      extractedDate: null,
    };
  }
}

export async function recognizeTextFromBase64(
  base64Image: string
): Promise<OCRResult> {
  try {
    // Create a data URI from base64
    const uri = `data:image/jpeg;base64,${base64Image}`;
    return recognizeText(uri);
  } catch (error) {
    console.error('OCR recognition from base64 failed:', error);
    return {
      text: '',
      extractedDate: null,
    };
  }
}

// Helper to check if OCR is available on this device
export async function isOCRAvailable(): Promise<boolean> {
  try {
    // Try to access the ML Kit OCR module
    return typeof MlkitOcr.detectFromUri === 'function';
  } catch {
    return false;
  }
}
