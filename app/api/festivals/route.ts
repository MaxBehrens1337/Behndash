import { NextResponse } from "next/server"
import Papa from "papaparse"
import { geocodeAddress } from "@/lib/geocodingUtils" // Updated import
import { determineRegion, extractMonth, parseNumber } from "@/lib/dataParsingUtils" // Updated import
import { generateFestivalDescription } from "@/lib/descriptionUtils" // Updated import
import { determineGeneralFestivalType } from "@/lib/festivalTypeUtils" // Updated import

export async function GET() {
  try {
    // Fetch the CSV file from the provided URL
    const csvUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Unbenannte%20Tabelle%20-%20Tabellenblatt1-jRVLuFgapHaOy9sOsKVsd8WCMoU8Ha.csv"
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    const parseResult = Papa.parse(csvText, {
      header: true, // Uses the first CSV row as object keys
      skipEmptyLines: true, // Skips empty lines
      dynamicTyping: true, // Attempts to convert strings to numbers/booleans
    })

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors)
      // Consider whether to throw an error or proceed
    }
    
    // Type assertion for the data from papaparse
    const parsedCsv = parseResult.data as Record<string, any>[]

    // Process the parsed CSV data, now including geocoding
    const festivals = await Promise.all(parsedCsv.map(async (item, index) => {
      // Extract estimated duration from date if available
      let calculatedDuration = 1
      if (item.Datum && (item.Datum.includes("–") || item.Datum.includes("-"))) {
        const dates = item.Datum.split(/[–-]/).map((d) => d.trim())
        if (dates.length === 2) {
          // Try to extract dates
          const startMatch = dates[0].match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
          const endMatch = dates[1].match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)

          if (startMatch && endMatch) {
            const startDay = Number.parseInt(startMatch[1])
            const startMonth = Number.parseInt(startMatch[2])
            const startYear = Number.parseInt(startMatch[3])

            const endDay = Number.parseInt(endMatch[1])
            const endMonth = Number.parseInt(endMatch[2])
            const endYear = Number.parseInt(endMatch[3])

            if (
              !isNaN(startDay) &&
              !isNaN(endDay) &&
              !isNaN(startMonth) &&
              !isNaN(endMonth) &&
              !isNaN(startYear) &&
              !isNaN(endYear)
            ) {
              const startDate = new Date(startYear, startMonth - 1, startDay)
              const endDate = new Date(endYear, endMonth - 1, endDay)
              const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end days

              calculatedDuration = diffDays
            }
          }
        }
      }

      // Determine festival type
      const festivalType = determineGeneralFestivalType(item.Genre || "") // Updated function call
      const region = determineRegion(item.PLZ || item.Ort || "")

      let lat = null;
      let lon = null;
      const city = item.Ort || "";
      const postalCode = item.PLZ || "";
      
      // Only attempt to geocode if there's a city or postal code
      if (city || postalCode) {
        // Construct address, prefer city if available, otherwise use postal code.
        const addressForGeocoding = `${city} ${postalCode}`.trim();
        if (addressForGeocoding) {
          const geo = await geocodeAddress(addressForGeocoding);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
          }
        }
      }

      // Process into our required format
      return {
        id: index + 1,
        name: item.Name || `Festival ${index + 1}`,
        location: city,
        plz: postalCode,
        date: item.Datum || "",
        month: extractMonth(item.Datum),
        duration: parseNumber(item.Dauer) || calculatedDuration,
        genre: item.Genre || "Unknown",
        visitors: parseNumber(item.Besucher),
        instaFollowers: parseNumber(item["Instagram Follower April 25"]),
        region: region,
        website: `www.${item.Name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}.de`,
        contact: `info@${item.Name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}.de`,
        festivalType: festivalType,
        description: generateFestivalDescription(item), // Updated function call
        lat: lat,
        lon: lon,
      }
    }))

    return NextResponse.json({ festivals })
  } catch (error) {
    console.error("Error processing festival data:", error) // Keep this for server-side logging
    return NextResponse.json(
      { error: "Failed to process festival data", details: (error as Error).message },
      { status: 500 },
    )
  }
}
