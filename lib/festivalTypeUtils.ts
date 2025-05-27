// lib/festivalTypeUtils.ts

/**
 * Determines the festival type based on a genre string.
 * This version is specific to the "general" festivals.
 * @param genre - The genre string.
 * @returns The determined festival type (e.g., "Rock/Metal", "Electronic").
 */
export const determineGeneralFestivalType = (genre: string | null | undefined): string => {
  if (!genre) return "Verschiedene"; // Default if genre is not provided

  const lowerGenre = String(genre).toLowerCase();

  if (
    lowerGenre.includes("metal") ||
    lowerGenre.includes("rock") ||
    lowerGenre.includes("punk") ||
    lowerGenre.includes("hardcore") ||
    lowerGenre.includes("thrash")
  ) {
    return "Rock/Metal";
  } else if (
    lowerGenre.includes("electro") ||
    lowerGenre.includes("techno") ||
    lowerGenre.includes("house") ||
    lowerGenre.includes("trance") ||
    lowerGenre.includes("edm") ||
    lowerGenre.includes("dance")
  ) {
    return "Electronic";
  } else if (lowerGenre.includes("hip-hop") || lowerGenre.includes("rap")) {
    return "Hip-Hop";
  } else if (lowerGenre.includes("pop")) {
    return "Pop";
  } else if (lowerGenre.includes("jazz") || lowerGenre.includes("blues")) {
    return "Jazz/Blues";
  } else if (
    lowerGenre.includes("folk") ||
    lowerGenre.includes("country") ||
    lowerGenre.includes("mittelalter") || // Medieval
    lowerGenre.includes("weltmusik") || // World music
    lowerGenre.includes("genreübergreifend") // Cross-genre
  ) {
    return "Folk/World";
  } else if (lowerGenre.includes("klassik") || lowerGenre.includes("classic")) {
    return "Classical";
  } else if (lowerGenre.includes("reggae") || lowerGenre.includes("ska")) {
    return "Reggae/Ska";
  } else if (lowerGenre.includes("schlager")) {
    return "Schlager";
  }
  // Add more specific types or a broader "Other" category if needed
  return "Verschiedene"; // Default for genres not fitting above categories
};

/**
 * Determines the type for a city festival.
 * For now, most city festivals are of a general "Stadtfest" type.
 * This can be expanded if more specific city festival types are needed.
 * @param anmerkungen - Optional notes that might give clues about the type.
 * @returns The city festival type.
 */
export const determineCityFestivalType = (anmerkungen?: string): string => {
  if (anmerkungen) {
    const lowerAnmerkungen = anmerkungen.toLowerCase();
    if (lowerAnmerkungen.includes("historisch")) return "Historisches Stadtfest";
    if (lowerAnmerkungen.includes("markt")) return "Marktfest";
    // Add more specific types based on keywords if necessary
  }
  return "Stadtfest"; // Default type for city festivals
};

/**
 * A more generalized function to determine event type.
 * This could combine logic or use a mapping/strategy for different raw event types.
 * For now, it delegates to the more specific functions.
 * @param item - The event item, should have properties to infer type.
 * @param eventSourceType - 'generalFestival' or 'cityFestival' to guide logic.
 * @returns The determined event type.
 */
export const determineEventType = (
  item: { Genre?: string; Anmerkungen?: string }, // Example properties
  eventSourceType: 'generalFestival' | 'cityFestival'
): string => {
  if (eventSourceType === 'generalFestival') {
    return determineGeneralFestivalType(item.Genre);
  } else if (eventSourceType === 'cityFestival') {
    return determineCityFestivalType(item.Anmerkungen);
  }
  return "Unbekannt"; // Default fallback
};
