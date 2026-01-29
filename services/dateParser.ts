import { ParsedDate } from '../types';

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Labeled patterns (high confidence) - must have expiration keywords
const LABELED_PATTERNS = [
  // "EXP 01/25/27", "BEST BY 01-25-2027", "USE BY: 01/25/2027", "SELL BY 01.25.27"
  {
    regex: /(?:EXP(?:IR(?:ES?|Y|ATION))?|BEST\s*(?:BY|BEFORE|IF\s*USED\s*BY)|USE\s*BY|BB|SELL\s*BY)[:\s./]*(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})/gi,
    parse: (match: RegExpExecArray) => parseNumericDate(match[1], match[2], match[3]),
    confidence: 'high' as const,
  },
  // "EXP JAN 25 2027", "BEST BY JAN 25, 2027"
  {
    regex: /(?:EXP(?:IR(?:ES?|Y|ATION))?|BEST\s*(?:BY|BEFORE|IF\s*USED\s*BY)|USE\s*BY|BB|SELL\s*BY)[:\s]*([A-Z]{3,9})[\s.,]*(\d{1,2})[\s,]*(\d{2,4})/gi,
    parse: (match: RegExpExecArray) => parseMonthNameDate(match[1], match[2], match[3]),
    confidence: 'high' as const,
  },
  // "EXP 25 JAN 2027", "BEST BY 25 JAN 27"
  {
    regex: /(?:EXP(?:IR(?:ES?|Y|ATION))?|BEST\s*(?:BY|BEFORE|IF\s*USED\s*BY)|USE\s*BY|BB|SELL\s*BY)[:\s]*(\d{1,2})[\s.,]*([A-Z]{3,9})[\s.,]*(\d{2,4})/gi,
    parse: (match: RegExpExecArray) => parseMonthNameDate(match[2], match[1], match[3]),
    confidence: 'high' as const,
  },
  // "EXP 2027-01-25" (ISO format with label)
  {
    regex: /(?:EXP(?:IR(?:ES?|Y|ATION))?|BEST\s*(?:BY|BEFORE|IF\s*USED\s*BY)|USE\s*BY|BB|SELL\s*BY)[:\s]*(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/gi,
    parse: (match: RegExpExecArray) => parseISODate(match[1], match[2], match[3]),
    confidence: 'high' as const,
  },
];

// Standalone patterns (medium/low confidence)
const STANDALONE_PATTERNS = [
  // ISO format: 2027-01-25
  {
    regex: /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g,
    parse: (match: RegExpExecArray) => parseISODate(match[1], match[2], match[3]),
    confidence: 'medium' as const,
  },
  // MM/DD/YY or MM/DD/YYYY
  {
    regex: /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g,
    parse: (match: RegExpExecArray) => parseNumericDate(match[1], match[2], match[3]),
    confidence: 'low' as const,
  },
  // JAN 25 2027 or JAN 25, 2027
  {
    regex: /\b([A-Z]{3,9})[\s.,]+(\d{1,2})[\s,]+(\d{2,4})\b/gi,
    parse: (match: RegExpExecArray) => parseMonthNameDate(match[1], match[2], match[3]),
    confidence: 'medium' as const,
  },
  // 25 JAN 2027
  {
    regex: /\b(\d{1,2})[\s.,]+([A-Z]{3,9})[\s.,]+(\d{2,4})\b/gi,
    parse: (match: RegExpExecArray) => parseMonthNameDate(match[2], match[1], match[3]),
    confidence: 'medium' as const,
  },
];

function normalizeYear(year: string): number {
  const yearNum = parseInt(year, 10);
  if (year.length === 2) {
    // Two-digit year: 00-50 -> 2000-2050, 51-99 -> 1951-1999
    return yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum;
  }
  return yearNum;
}

function parseNumericDate(
  first: string,
  second: string,
  yearStr: string
): Date | null {
  const year = normalizeYear(yearStr);
  const a = parseInt(first, 10);
  const b = parseInt(second, 10);

  // Try MM/DD/YYYY first (US format)
  if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
    const date = new Date(year, a - 1, b);
    if (isValidDate(date, year, a - 1, b)) {
      return date;
    }
  }

  // Try DD/MM/YYYY (European format)
  if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
    const date = new Date(year, b - 1, a);
    if (isValidDate(date, year, b - 1, a)) {
      return date;
    }
  }

  return null;
}

function parseMonthNameDate(
  monthStr: string,
  dayStr: string,
  yearStr: string
): Date | null {
  const month = MONTH_NAMES[monthStr.toLowerCase()];
  if (month === undefined) return null;

  const day = parseInt(dayStr, 10);
  const year = normalizeYear(yearStr);

  if (day < 1 || day > 31) return null;

  const date = new Date(year, month, day);
  if (isValidDate(date, year, month, day)) {
    return date;
  }

  return null;
}

function parseISODate(
  yearStr: string,
  monthStr: string,
  dayStr: string
): Date | null {
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const date = new Date(year, month, day);
  if (isValidDate(date, year, month, day)) {
    return date;
  }

  return null;
}

function isValidDate(
  date: Date,
  year: number,
  month: number,
  day: number
): boolean {
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}

export function extractExpirationDate(ocrText: string): ParsedDate | null {
  const candidates: ParsedDate[] = [];

  // First, try labeled patterns (high confidence)
  for (const pattern of LABELED_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(ocrText)) !== null) {
      const date = pattern.parse(match);
      if (date) {
        candidates.push({
          date,
          confidence: pattern.confidence,
          rawMatch: match[0],
        });
      }
    }
  }

  // If we found high-confidence matches, use those
  if (candidates.length > 0) {
    return selectBestCandidate(candidates);
  }

  // Fall back to standalone patterns
  for (const pattern of STANDALONE_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(ocrText)) !== null) {
      const date = pattern.parse(match);
      if (date) {
        candidates.push({
          date,
          confidence: pattern.confidence,
          rawMatch: match[0],
        });
      }
    }
  }

  return selectBestCandidate(candidates);
}

function selectBestCandidate(candidates: ParsedDate[]): ParsedDate | null {
  if (candidates.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separate future and past dates
  const futureDates = candidates.filter((c) => c.date >= today);
  const pastDates = candidates.filter((c) => c.date < today);

  // Prefer future dates
  if (futureDates.length > 0) {
    // Sort by confidence (high first), then by date (nearest first)
    futureDates.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      if (confDiff !== 0) return confDiff;
      return a.date.getTime() - b.date.getTime();
    });
    return futureDates[0];
  }

  // If no future dates, return the most recent past date
  if (pastDates.length > 0) {
    pastDates.sort((a, b) => b.date.getTime() - a.date.getTime());
    return pastDates[0];
  }

  return null;
}

export function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseStoredDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateForDisplay(dateStr: string): string {
  const date = parseStoredDate(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
