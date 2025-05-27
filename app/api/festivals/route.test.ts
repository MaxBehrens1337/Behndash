import { GET } from './route'; // Adjust path if necessary
import { NextResponse } from 'next/server';

// Mock next/server NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ // Make it return a simple object for easier inspection
      data,
      status: options?.status || 200,
    })),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

const mockCsvData = `Name,Ort,PLZ,Datum,Dauer,Genre,Besucher,Instagram Follower April 25
Festival A,City A,12345,01.07.2025-03.07.2025,3 Tage,Rock,1000,500
Festival B,City B,67890,15.08.2025,,Electronic,5000,2000
Festival C,Remote Town,,T.B.A,,Mixed,k.A.,100`;

describe('GET /api/festivals', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as jest.Mock).mockClear();
    (NextResponse.json as jest.Mock).mockClear(); 
    // Clear the geocodeCache for each test. This is crucial.
    // Since geocodeCache is a Map defined in route.ts, we need a way to clear it.
    // One way is to re-import the module or expose a reset function.
    // For now, assume the worker can handle this or note if it's a limitation.
    // A simple approach if the cache is not directly clearable from here:
    // jest.resetModules(); // This would reset all modules, use with caution.
    // For this specific subtask, we will rely on the worker to manage or report on cache state.
  });

  it('should fetch, parse, and geocode festival data correctly', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ // First call: CSV fetch
        ok: true,
        text: async () => mockCsvData,
      })
      .mockResolvedValueOnce({ // Second call: Geocoding for "City A 12345"
        ok: true,
        json: async () => [{ lat: '10.0', lon: '20.0' }], // Nominatim returns strings
        status: 200,
      })
      .mockResolvedValueOnce({ // Third call: Geocoding for "City B 67890"
        ok: true,
        json: async () => [{ lat: '30.0', lon: '40.0' }],
        status: 200,
      })
      .mockResolvedValueOnce({ // Fourth call: Geocoding for "Remote Town " (note the trailing space if PLZ is empty)
        ok: true,
        json: async () => [], // Nominatim returns empty array for no result
        status: 200,
      });

    await GET(); // Call the actual GET handler
    const responseData = (NextResponse.json as jest.Mock).mock.calls[0][0]; 

    expect(fetch).toHaveBeenCalledTimes(4); // 1 for CSV, 3 for geocoding attempts
    expect(NextResponse.json).toHaveBeenCalledTimes(1);
    
    expect(responseData).toBeDefined();
    expect(responseData.festivals).toHaveLength(3);

    // Check Festival A
    const festivalA = responseData.festivals.find(f => f.name === 'Festival A');
    expect(festivalA.location).toBe('City A');
    expect(festivalA.plz).toBe('12345');
    expect(festivalA.lat).toBe(10.0); // Parsed to number
    expect(festivalA.lon).toBe(20.0); // Parsed to number
    expect(festivalA.month).toBe(7); 
    expect(festivalA.duration).toBe(3); 

    // Check Festival B
    const festivalB = responseData.festivals.find(f => f.name === 'Festival B');
    expect(festivalB.location).toBe('City B');
    expect(festivalB.plz).toBe('67890');
    expect(festivalB.lat).toBe(30.0);
    expect(festivalB.lon).toBe(40.0);
    expect(festivalB.month).toBe(8); 
    
    // Check Festival C
    const festivalC = responseData.festivals.find(f => f.name === 'Festival C');
    expect(festivalC.location).toBe('Remote Town');
    expect(festivalC.plz).toBe('');
    expect(festivalC.lat).toBeNull(); 
    expect(festivalC.lon).toBeNull();
    expect(festivalC.month).toBe(0); 
  });

  it('should handle CSV fetch failure gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    });

    await GET(); 
    const responseData = (NextResponse.json as jest.Mock).mock.calls[0][0];
    const responseOptions = (NextResponse.json as jest.Mock).mock.calls[0][1];

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to process festival data',
        details: expect.stringContaining('Failed to fetch CSV: 500 Server Error'),
      }),
      { status: 500 }
    );
    expect(responseOptions.status).toBe(500);
  });
});
