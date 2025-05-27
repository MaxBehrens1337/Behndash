// lib/dataParsingUtils.ts

/**
 * Determines the region based on a German postal code (PLZ).
 * @param plz - The postal code string.
 * @returns The region ("Ost", "Nord", "West", "Süd") or "Unknown".
 */
export const determineRegion = (plz: string | null | undefined): string => {
  if (!plz) return "Unknown";

  const cleanedPlz = String(plz).replace(/[^0-9]/g, "");
  if (!cleanedPlz) return "Unknown";

  // Special handling for Berlin postal codes
  if (
    String(plz).toLowerCase().includes("berlin") || // Check if "berlin" is in the original string
    cleanedPlz.startsWith("10") ||
    cleanedPlz.startsWith("12") ||
    cleanedPlz.startsWith("13") ||
    cleanedPlz.startsWith("14") 
  ) {
    return "Ost";
  }

  const firstDigit = cleanedPlz.charAt(0);

  if (firstDigit === "0" || firstDigit === "1") return "Ost";
  if (firstDigit === "2") return "Nord";
  if (firstDigit === "3" || firstDigit === "4" || firstDigit === "5") return "West";
  if (firstDigit === "6" || firstDigit === "7" || firstDigit === "8" || firstDigit === "9") return "Süd";
  
  return "Unknown";
};

/**
 * Extracts the month from a date string.
 * Handles various formats including ranges, specific keywords, and DD.MM.YYYY patterns.
 * @param dateStr - The date string.
 * @returns The month number (1-12) or 0 if not determinable.
 */
export const extractMonth = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;

  const lowerDateStr = String(dateStr).toLowerCase();

  if (
    lowerDateStr === "k.a." ||
    lowerDateStr === "t.b.a" ||
    lowerDateStr === "tba" ||
    lowerDateStr.includes("noch nicht bekannt") ||
    lowerDateStr.includes("abgesagt") ||
    lowerDateStr.includes("unbestimmt")
  ) {
    return 0;
  }

  let processedDateStr = lowerDateStr;
  // Handle date ranges (take the first date part)
  if (processedDateStr.includes("–") || processedDateStr.includes("-")) {
    processedDateStr = processedDateStr.split(/[–-]/)[0].trim();
  }
  
  // Month names and common abbreviations
  const monthKeywords: Record<string, number> = {
    "jan": 1, "januar": 1, "jän": 1,
    "feb": 2, "februar": 2,
    "mär": 3, "märz": 3, "mar": 3,
    "apr": 4, "april": 4,
    "mai": 5,
    "jun": 6, "juni": 6,
    "jul": 7, "juli": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "okt": 10, "oktober": 10, "oct": 10,
    "nov": 11, "november": 11,
    "dez": 12, "dezember": 12, "dec": 12,
  };

  for (const [keyword, monthNum] of Object.entries(monthKeywords)) {
    if (processedDateStr.includes(keyword)) {
      return monthNum;
    }
  }

  // Try to find a pattern like DD.MM.YYYY or DD.MM.YY
  let match = processedDateStr.match(/\d{1,2}\.(\d{1,2})\.(\d{2,4})?/);
  if (match && match[1]) {
    const monthPart = Number.parseInt(match[1]); // Use the first captured group if it's the month (e.g. from M.D.YYYY)
    if (monthPart >= 1 && monthPart <= 12) return monthPart;
    if (match[2]) { // If there's a second capture group, it's more likely DD.MM
        const monthPart2 = Number.parseInt(match[2]);
         if (monthPart2 >= 1 && monthPart2 <= 12) return monthPart2;
    }
  }
  
  // Try DD.MM or MM.DD (less specific, higher chance of error if format is ambiguous)
  match = processedDateStr.match(/(\d{1,2})\.(\d{1,2})/);
    if (match) {
        // Check if second part is a valid month
        const monthPart2 = parseInt(match[2], 10);
        if (monthPart2 >= 1 && monthPart2 <= 12) {
            // Check if first part could also be a month, if so, it's ambiguous without more context
            // For now, assume DD.MM
            return monthPart2;
        }
        // Check if first part is a valid month (e.g. MM.DD)
        const monthPart1 = parseInt(match[1], 10);
        if (monthPart1 >= 1 && monthPart1 <= 12) {
            return monthPart1;
        }
    }


  // Try to extract month if only a number is present (e.g. "6" for June)
  match = processedDateStr.match(/^(\d{1,2})$/);
  if (match) {
    const monthPart = Number.parseInt(match[1]);
    if (monthPart >= 1 && monthPart <= 12) {
      return monthPart;
    }
  }

  return 0; // Fallback
};


/**
 * Parses a number from a string, handling various formats like ranges, "ca.", and units.
 * @param value - The string or number to parse.
 * @returns The parsed number, or 0 if not parsable or invalid.
 */
export const parseNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || String(value).trim() === "") return 0;
  
  let numStr = String(value).toLowerCase();

  if (
    numStr === "k.a." ||
    numStr === "n.a" ||
    numStr === "n/a" ||
    numStr.includes("variiert stark") ||
    numStr.includes("nicht gefunden") ||
    numStr.includes("abgesagt") ||
    numStr.includes("tba") ||
    numStr.includes("unbestimmt")
  ) {
    return 0;
  }

  numStr = numStr.replace(/ca\.?|zirca|etwa|rund/gi, "").trim(); // Added "rund"

  // Handle ranges like "10000-15000" or "10.000 – 20.000"
  if (numStr.includes("–") || numStr.includes("-")) {
    const parts = numStr.split(/[–-]/);
    if (parts.length === 2) {
      const start = parseNumber(parts[0]); // Recursive call for each part
      const end = parseNumber(parts[1]);
      // Return average if both are valid, otherwise the valid one, or 0
      if (start > 0 && end > 0) return Math.round((start + end) / 2);
      return start > 0 ? start : (end > 0 ? end : 0);
    }
  }
  
  // Remove units like "Tage", "Besucher" etc.
  numStr = numStr.replace(/(\s*(tage|besucher|follower|jahre|stunden|minuten|sekunden|million|mio\.?)).*/gi, "").trim();

  // Clean string for parsing: remove thousands separators (.), replace decimal comma (,)
  // This regex also removes any remaining non-numeric characters except a potential decimal point
  const cleaned = numStr
    .replace(/\.(?=\d{3}(?!\d))/g, "") // Remove dots used as thousands separators
    .replace(/,/g, ".") // Replace comma with dot for decimal point
    .replace(/[^0-9.]/g, ""); // Remove any other non-numeric characters

  if (cleaned === "") return 0;

  const num = Number.parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num); // Round, as visitor numbers are typically whole
};
