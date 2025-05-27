// lib/geocodingUtils.ts
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

export const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  if (!address || address.trim() === "") return null;
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) || null; // Return null if cache entry is undefined
  }
  try {
    // Use a unique User-Agent for your application
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "BehnFestivalDashboardApp/1.0" } }, // General User-Agent
    );

    if (response.status === 429) { // Too Many Requests
      console.warn(`Rate limit reached for geocoding address: "${address}". Retrying after 1 second.`);
      // Optionally, implement a more sophisticated retry mechanism or backoff strategy
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      // For this example, we'll cache null and not retry immediately to avoid hammering the service.
      // A more robust solution might retry a few times with exponential backoff.
      geocodeCache.set(address, null);
      return null;
    }

    if (!response.ok) {
      console.error(`Geocoding error for "${address}": ${response.status} ${response.statusText}`);
      geocodeCache.set(address, null); // Cache null for failed attempts to avoid retrying failing requests
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      const result = {
        lat: Number.parseFloat(data[0].lat),
        lon: Number.parseFloat(data[0].lon),
      };
      geocodeCache.set(address, result);
      return result;
    }
    
    // No results found or data is malformed
    geocodeCache.set(address, null);
    return null;
  } catch (error) {
    console.error(`Exception during geocoding for "${address}":`, error);
    geocodeCache.set(address, null); // Cache null on exception
    return null;
  }
};

// Function to clear the cache, potentially useful for testing or specific scenarios
export const clearGeocodeCache = () => {
  geocodeCache.clear();
  console.log("Geocode cache cleared.");
};

// Function to get cache size, for debugging or monitoring
export const getGeocodeCacheSize = () => {
  return geocodeCache.size;
};
