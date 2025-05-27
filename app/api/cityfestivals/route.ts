import { NextResponse } from "next/server"
import Papa from "papaparse"
import fs from "fs"
import path from "path"
import { geocodeAddress } from "@/lib/geocodingUtils"
import { determineRegion, extractMonth, parseNumber } from "@/lib/dataParsingUtils"
import { generateCityFestivalDescription } from "@/lib/descriptionUtils"
import { determineCityFestivalType } from "@/lib/festivalTypeUtils"

export async function GET() {
  try {
    const csvFilePath = path.join(process.cwd(), "public", "data", "cityfestivals.csv")
    const csvText = fs.readFileSync(csvFilePath, { encoding: "utf-8" })

    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Wichtig: auf false setzen für manuelle Konvertierung
    })

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error("CSV parsing errors:", parseResult.errors)
      // Ggf. Fehler werfen oder anders behandeln
    }

    const cityFestivalData = parseResult.data as Record<string, any>[]

    const processedFestivals = await Promise.all(
      cityFestivalData.map(async (item, index) => {
        const stadt = item["Stadt"] || "Unbekannt"
        const plz = item["PLZ (Veranstaltungsort)"] || ""
        const festName = item["Festname"] || `Stadtfest ${index + 1}`
        
        let lat = null
        let lon = null
        const addressString = `${stadt} ${plz}`.trim()
        if (addressString) {
          const geo = await geocodeAddress(addressString)
          if (geo) {
            lat = geo.lat
            lon = geo.lon
          }
        }

        const besucherAnzahlRaw = item["Besucheranzahl (geschätzt)"]
        const besucher = parseNumber(besucherAnzahlRaw)
        const datumRoh = item["Datum (2025/2026)"] || ""
        const monat = extractMonth(datumRoh)
        const region = determineRegion(plz || stadt) // Ensure region is determined
        const eventType = determineCityFestivalType(item["Anmerkungen"] || "")


        const festivalObject = {
          id: index + 1,
          bundesland: item["Bundesland"] || "Unbekannt",
          stadt: stadt,
          festName: festName,
          plz: plz,
          datumRaw: datumRoh,
          besucher: besucher,
          anmerkungen: item["Anmerkungen"] || "",
          lat: lat,
          lon: lon,
          monat: monat,
          region: region, // Use determined region
          beschreibung: "", 
          eventType: eventType, // Use determined event type
        }
        // Generate description using the processed and structured festivalObject
        festivalObject.beschreibung = generateCityFestivalDescription(festivalObject)

        return festivalObject
      }),
    )

    return NextResponse.json({ cityFestivals: processedFestivals })
  } catch (error) {
    console.error("Error processing city festival data:", error) // Keep for server-side logging
    return NextResponse.json(
      { error: "Failed to process city festival data", details: (error as Error).message },
      { status: 500 },
    )
  }
}
