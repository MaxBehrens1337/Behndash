// Typdefinitionen
export interface SalesRepresentative {
  id: string
  name: string
  plzAreas: string[]
}

// Liste der bekannten Mitarbeiternummern
export const KNOWN_SALES_REP_IDS = [
  "111",
  "112",
  "113",
  "115",
  "117",
  "119",
  "127",
  "131",
  "134",
  "135",
  "136",
  "141",
  "243",
  "244",
  "245",
  "246",
  "252",
  "256",
  "258",
  "259",
  "261",
  "262",
  "266",
]

// Funktion zum Laden und Verarbeiten der CSV-Daten
export async function loadSalesRepresentatives(): Promise<SalesRepresentative[]> {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/PLZ-LISTE%20ab%202025%2001%2001%20Event%20und%20Handel.xlsx%20-%20Tabelle1%20%281%29-HyHQCasWlczAL8FnDXI4KkNO4kBu0t.csv",
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch sales rep data: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    const salesReps = processSalesRepData(csvText)
    return salesReps
  } catch (error) {
    console.error("Fehler beim Laden der Vertriebsmitarbeiter-Daten:", error)
    return []
  }
}

// Funktion zum Verarbeiten der CSV-Daten
function processSalesRepData(csvText: string): SalesRepresentative[] {
  // CSV-Zeilen aufteilen
  const lines = csvText.split("\n")

  // Erste Zeile enthält die Header
  const headers = lines[0].split(",").map((header) => header.trim())

  // Indizes für die relevanten Spalten finden
  const plzIndex = headers.findIndex((h) => h === "PLZ")
  const bezWertHIndex = headers.findIndex((h) => h === "BezWertH")

  if (plzIndex === -1 || bezWertHIndex === -1) {
    console.error("CSV-Format nicht wie erwartet. Konnte PLZ oder BezWertH nicht finden.")
    return []
  }

  // Temporäre Map zum Sammeln der PLZ-Bereiche pro Vertriebsmitarbeiter
  const salesRepMap = new Map<string, string[]>()

  // Initialisiere alle bekannten Mitarbeiter-IDs
  KNOWN_SALES_REP_IDS.forEach((id) => {
    salesRepMap.set(id, [])
  })

  // Daten verarbeiten (ab Zeile 1, da Zeile 0 die Header sind)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Zeile in Felder aufteilen
    const fields = line.split(",").map((field) => field.trim())

    if (fields.length <= Math.max(plzIndex, bezWertHIndex)) continue

    const plz = fields[plzIndex]
    const bezWertH = fields[bezWertHIndex]

    // Nur bekannte Mitarbeiter-IDs berücksichtigen
    if (plz && bezWertH && KNOWN_SALES_REP_IDS.includes(bezWertH)) {
      // Füge PLZ zum entsprechenden Vertriebsmitarbeiter hinzu
      if (!salesRepMap.has(bezWertH)) {
        salesRepMap.set(bezWertH, [])
      }
      salesRepMap.get(bezWertH)?.push(plz)
    }
  }

  // Konvertiere Map in Array von SalesRepresentative-Objekten
  const salesReps: SalesRepresentative[] = []
  salesRepMap.forEach((plzAreas, id) => {
    salesReps.push({
      id,
      name: `Mitarbeiter ${id}`,
      plzAreas,
    })
  })

  // Sortiere nach ID
  return salesReps.sort((a, b) => a.id.localeCompare(b.id))
}

// Funktion zum Prüfen, ob ein Event im Zuständigkeitsbereich eines Vertriebsmitarbeiters liegt (umbenannt)
export function isEventInSalesRepArea(event: { plz: string }, salesRep: SalesRepresentative): boolean {
  if (!event.plz || !salesRep.plzAreas.length) return false;

  const eventPlz = String(event.plz).replace(/[^0-9]/g, "");
  if (!eventPlz) return false;

  for (const plzArea of salesRep.plzAreas) {
    if (plzArea.endsWith("*")) {
      const prefix = plzArea.slice(0, -1); // Remove *
      if (eventPlz.startsWith(prefix)) return true;
    } else if (plzArea.endsWith("xx")) { // Handles cases like 300xx
        const prefix = plzArea.slice(0, -2);
        if (eventPlz.startsWith(prefix)) return true;
    } else if (plzArea.endsWith("x")) { // Handles cases like 30xxx or 3xxxx
        const prefix = plzArea.substring(0, plzArea.indexOf("x"));
        if (eventPlz.startsWith(prefix)) return true;
    } else if (plzArea.includes("-")) {
      const [startStr, endStr] = plzArea.split("-");
      // Ensure PLZ is long enough for meaningful prefix comparison if ranges are like "300-399" for "30000-39999"
      // This part needs careful handling based on how PLZ ranges are defined and used.
      // Assuming PLZs are full length for range checks for now.
      const eventPlzNum = parseInt(eventPlz, 10);
      const startNum = parseInt(startStr.replace(/[^0-9]/g, ""), 10);
      const endNum = parseInt(endStr.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(eventPlzNum) && !isNaN(startNum) && !isNaN(endNum) && eventPlzNum >= startNum && eventPlzNum <= endNum) {
        return true;
      }
    } else if (eventPlz === plzArea.replace(/[^0-9]/g, "")) { // Exact match after cleaning
      return true;
    } else if (eventPlz.startsWith(plzArea.replace(/[^0-9]/g, ""))) { // Prefix match for areas like "30" meaning all 30xxx
        return true;
    }
  }
  return false;
}

// Funktion zum Abrufen der Anzahl der Events pro Vertriebsmitarbeiter (umbenannt)
export function countEventsPerSalesRep(
  events: Array<{ plz: string }>, // Akzeptiert eine Liste von Objekten mit 'plz'
  salesReps: SalesRepresentative[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  salesReps.forEach((rep) => {
    counts[rep.id] = events.filter((event) => isEventInSalesRepArea(event, rep)).length;
  });

  return counts;
}
