// lib/descriptionUtils.ts
import { parseNumber } from "./dataParsingUtils"; // Assuming parseNumber is in dataParsingUtils.ts

interface FestivalItem {
  Name?: string;
  Datum?: string;
  Ort?: string;
  PLZ?: string;
  Genre?: string;
  Besucher?: string | number; // Can be string or number initially
  // Add other relevant fields if needed by generateDescription
}

interface CityFestivalItem {
  festName?: string;
  datumRaw?: string;
  stadt?: string;
  plz?: string;
  besucher?: number; // Already parsed to number
  anmerkungen?: string;
  // Add other relevant fields if needed by generateCityFestivalDescription
}

/**
 * Generates a descriptive text for a festival.
 * @param item - The festival data item.
 * @returns A string description of the festival.
 */
export const generateFestivalDescription = (item: FestivalItem): string => {
  let description = `${item.Name || "Das Festival"} findet`;

  if (item.Datum && item.Datum !== "k.A." && !item.Datum.toLowerCase().includes("abgesagt") && !item.Datum.toLowerCase().includes("tba")) {
    description += ` vom ${item.Datum}`;
  } else {
    description += ` voraussichtlich in 2025/2026`; // Generic placeholder
  }

  if (item.Ort && item.Ort !== "k.A.") {
    description += ` in ${item.Ort}`;
    if (item.PLZ && item.PLZ !== "k.A.") {
      description += ` (${item.PLZ})`;
    }
  }
  description += " statt";

  if (item.Genre && item.Genre !== "k.A.") {
    description += ` und bietet ${item.Genre} Musik`;
  }

  const visitors = parseNumber(item.Besucher); // Use imported parseNumber
  if (visitors > 0) {
    if (visitors < 1000) {
      description += `. Es ist ein eher kleines Festival mit rund ${visitors} Besuchern`;
    } else if (visitors < 10000) {
      description += `. Es ist ein mittelgroßes Festival mit rund ${visitors.toLocaleString()} Besuchern`;
    } else if (visitors < 50000) {
      description += `. Es ist ein großes Festival mit rund ${visitors.toLocaleString()} Besuchern`;
    } else {
      description += `. Es ist ein sehr großes Festival mit rund ${visitors.toLocaleString()} Besuchern`;
    }
  }
  description += ".";
  return description;
};


/**
 * Generates a descriptive text for a city festival.
 * @param item - The city festival data item.
 * @returns A string description of the city festival.
 */
export const generateCityFestivalDescription = (item: CityFestivalItem): string => {
  let description = `${item.festName || "Das Stadtfest"} findet`;
  
  if (item.datumRaw && item.datumRaw !== "k.A." && !String(item.datumRaw).toLowerCase().includes("tba") && !String(item.datumRaw).toLowerCase().includes("unbestimmt")) {
    description += ` am ${item.datumRaw}`;
  }
  
  if (item.stadt && item.stadt !== "k.A.") {
    description += ` in ${item.stadt}`;
    if (item.plz && item.plz !== "k.A.") {
      description += ` (${item.plz})`;
    }
  }
  description += " statt.";

  if (item.besucher && item.besucher > 0) {
    description += ` Es werden rund ${item.besucher.toLocaleString()} Besucher erwartet.`;
  }
  if (item.anmerkungen && item.anmerkungen !== "k.A." && item.anmerkungen.trim() !== "") {
    description += ` ${item.anmerkungen.trim()}`;
  }
  return description.trim();
};
