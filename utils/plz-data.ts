// PLZ-Referenzdaten für wichtige deutsche Städte
export interface CityPLZData {
  name: string
  primaryPlz: string
  plzRanges: string[]
  region: string
  coordinates?: {
    lat: number
    lon: number
  }
}

// Hauptstädte der Bundesländer und größte Städte Deutschlands
export const majorCities: CityPLZData[] = [
  {
    name: "Berlin",
    primaryPlz: "10115",
    plzRanges: ["10", "12", "13", "14"],
    region: "Ost",
    coordinates: { lat: 52.52, lon: 13.405 },
  },
  {
    name: "Hamburg",
    primaryPlz: "20095",
    plzRanges: ["20", "21", "22"],
    region: "Nord",
    coordinates: { lat: 53.5511, lon: 9.9937 },
  },
  {
    name: "München",
    primaryPlz: "80331",
    plzRanges: ["80", "81", "82"],
    region: "Süd",
    coordinates: { lat: 48.1351, lon: 11.582 },
  },
  {
    name: "Köln",
    primaryPlz: "50667",
    plzRanges: ["50", "51"],
    region: "West",
    coordinates: { lat: 50.9375, lon: 6.9603 },
  },
  {
    name: "Frankfurt am Main",
    primaryPlz: "60311",
    plzRanges: ["60", "61", "65"],
    region: "West",
    coordinates: { lat: 50.1109, lon: 8.6821 },
  },
  {
    name: "Stuttgart",
    primaryPlz: "70173",
    plzRanges: ["70", "71"],
    region: "Süd",
    coordinates: { lat: 48.7758, lon: 9.1829 },
  },
  {
    name: "Düsseldorf",
    primaryPlz: "40213",
    plzRanges: ["40", "41"],
    region: "West",
    coordinates: { lat: 51.2277, lon: 6.7735 },
  },
  {
    name: "Leipzig",
    primaryPlz: "04109",
    plzRanges: ["04"],
    region: "Ost",
    coordinates: { lat: 51.3397, lon: 12.3731 },
  },
  {
    name: "Dortmund",
    primaryPlz: "44135",
    plzRanges: ["44"],
    region: "West",
    coordinates: { lat: 51.5136, lon: 7.4653 },
  },
  {
    name: "Essen",
    primaryPlz: "45127",
    plzRanges: ["45"],
    region: "West",
    coordinates: { lat: 51.4556, lon: 7.0116 },
  },
  {
    name: "Bremen",
    primaryPlz: "28195",
    plzRanges: ["28"],
    region: "Nord",
    coordinates: { lat: 53.0793, lon: 8.8017 },
  },
  {
    name: "Dresden",
    primaryPlz: "01067",
    plzRanges: ["01"],
    region: "Ost",
    coordinates: { lat: 51.0504, lon: 13.7373 },
  },
  {
    name: "Hannover",
    primaryPlz: "30159",
    plzRanges: ["30"],
    region: "Nord",
    coordinates: { lat: 52.3759, lon: 9.732 },
  },
  {
    name: "Nürnberg",
    primaryPlz: "90402",
    plzRanges: ["90"],
    region: "Süd",
    coordinates: { lat: 49.4521, lon: 11.0767 },
  },
  {
    name: "Duisburg",
    primaryPlz: "47051",
    plzRanges: ["47"],
    region: "West",
    coordinates: { lat: 51.4344, lon: 6.7623 },
  },
  {
    name: "Kiel",
    primaryPlz: "24103",
    plzRanges: ["24"],
    region: "Nord",
    coordinates: { lat: 54.3233, lon: 10.1228 },
  },
  {
    name: "Wiesbaden",
    primaryPlz: "65183",
    plzRanges: ["65"],
    region: "West",
    coordinates: { lat: 50.0782, lon: 8.2398 },
  },
  {
    name: "Magdeburg",
    primaryPlz: "39104",
    plzRanges: ["39"],
    region: "Ost",
    coordinates: { lat: 52.1205, lon: 11.6276 },
  },
  {
    name: "Freiburg",
    primaryPlz: "79098",
    plzRanges: ["79"],
    region: "Süd",
    coordinates: { lat: 47.999, lon: 7.8421 },
  },
  {
    name: "Erfurt",
    primaryPlz: "99084",
    plzRanges: ["99"],
    region: "Ost",
    coordinates: { lat: 50.9847, lon: 11.0299 },
  },
  {
    name: "Rostock",
    primaryPlz: "18055",
    plzRanges: ["18"],
    region: "Nord",
    coordinates: { lat: 54.0924, lon: 12.0991 },
  },
  {
    name: "Mainz",
    primaryPlz: "55116",
    plzRanges: ["55"],
    region: "West",
    coordinates: { lat: 49.9929, lon: 8.2473 },
  },
  {
    name: "Saarbrücken",
    primaryPlz: "66111",
    plzRanges: ["66"],
    region: "West",
    coordinates: { lat: 49.2401, lon: 6.9969 },
  },
  {
    name: "Potsdam",
    primaryPlz: "14467",
    plzRanges: ["14"],
    region: "Ost",
    coordinates: { lat: 52.3906, lon: 13.0645 },
  },
  {
    name: "Münster",
    primaryPlz: "48143",
    plzRanges: ["48"],
    region: "West",
    coordinates: { lat: 51.9607, lon: 7.6261 },
  },
]

// Funktion zum Finden einer Stadt anhand des Namens (unabhängig von Groß-/Kleinschreibung)
export const findCityByName = (name: string): CityPLZData | undefined => {
  if (!name) return undefined

  const normalizedName = name.toLowerCase().trim()

  return majorCities.find(
    (city) => city.name.toLowerCase() === normalizedName || normalizedName.includes(city.name.toLowerCase()),
  )
}

// Funktion zum Finden einer Stadt anhand der PLZ
export const findCityByPLZ = (plz: string): CityPLZData | undefined => {
  if (!plz) return undefined

  const cleanPlz = plz.toString().replace(/[^0-9]/g, "")
  if (!cleanPlz) return undefined

  // Exakte PLZ-Übereinstimmung
  const exactMatch = majorCities.find((city) => city.primaryPlz === cleanPlz)
  if (exactMatch) return exactMatch

  // Übereinstimmung mit PLZ-Bereich
  const plzPrefix = cleanPlz.substring(0, 2)
  return majorCities.find((city) => city.plzRanges.some((range) => plzPrefix.startsWith(range)))
}

// Funktion zur Berechnung der Entfernung zwischen zwei PLZ-Bereichen
export const calculatePLZDistance = (plz1: string, plz2: string): number => {
  if (!plz1 || !plz2) return 999

  const clean1 = plz1.toString().replace(/[^0-9]/g, "")
  const clean2 = plz2.toString().replace(/[^0-9]/g, "")

  if (!clean1 || !clean2) return 999

  // Sehr nahe (0-30km): Wenn die ersten 2 Ziffern identisch sind
  if (clean1.substring(0, 2) === clean2.substring(0, 2)) {
    return 0
  }

  // Nah (30-100km): Wenn die erste Ziffer identisch ist
  if (clean1.substring(0, 1) === clean2.substring(0, 1)) {
    return 1
  }

  // Sonstige Entfernungen: Differenz der ersten beiden Ziffern berechnen
  const num1 = Number.parseInt(clean1.substring(0, 2))
  const num2 = Number.parseInt(clean2.substring(0, 2))

  // Spezielle Behandlung für PLZ-Bereiche, die geografisch näher sind als ihre Nummern vermuten lassen
  const specialCases = [
    { pair: ["99", "04"], distance: 2 }, // Erfurt - Leipzig
    { pair: ["01", "04"], distance: 1 }, // Dresden - Leipzig
    { pair: ["99", "01"], distance: 2 }, // Erfurt - Dresden
    { pair: ["80", "90"], distance: 2 }, // München - Nürnberg
    { pair: ["50", "60"], distance: 2 }, // Köln - Frankfurt
    { pair: ["20", "30"], distance: 2 }, // Hamburg - Hannover
    { pair: ["40", "44"], distance: 1 }, // Düsseldorf - Dortmund
    { pair: ["44", "45"], distance: 1 }, // Dortmund - Essen
    { pair: ["40", "47"], distance: 1 }, // Düsseldorf - Duisburg
    { pair: ["40", "50"], distance: 1 }, // Düsseldorf - Köln
  ]

  const prefix1 = clean1.substring(0, 2)
  const prefix2 = clean2.substring(0, 2)

  // Prüfen, ob es sich um einen Spezialfall handelt
  const specialCase = specialCases.find(
    (sc) => (sc.pair[0] === prefix1 && sc.pair[1] === prefix2) || (sc.pair[0] === prefix2 && sc.pair[1] === prefix1),
  )

  if (specialCase) {
    return specialCase.distance
  }

  // Standardberechnung: Differenz der ersten beiden Ziffern mit Skalierungsfaktor
  const difference = Math.abs(num1 - num2)
  if (difference <= 5) return 2 // Mittel (100-150km)
  if (difference <= 15) return 3 // Weit (150-200km)
  return 4 // Sehr weit (>200km)
}

// Funktion zur Berechnung der Entfernung zwischen zwei Städten
export const calculateCityDistance = (city1: string, city2: string): number => {
  const cityData1 = findCityByName(city1)
  const cityData2 = findCityByName(city2)

  if (!cityData1 || !cityData2) return 999

  return calculatePLZDistance(cityData1.primaryPlz, cityData2.primaryPlz)
}

// Funktion zur Berechnung der Entfernung zwischen einer Stadt und einer PLZ
export const calculateCityToPLZDistance = (city: string, plz: string): number => {
  const cityData = findCityByName(city)

  if (!cityData) return 999

  return calculatePLZDistance(cityData.primaryPlz, plz)
}

// Ändern Sie die getDistanceLabel Funktion, um nur die beiden Entfernungsstufen anzuzeigen
export const getDistanceLabel = (distance: number): string => {
  if (distance === 0) return "Sehr nah (0-20km)"
  if (distance === 1) return "Nah (20-50km)"
  return "Außerhalb des Suchradius"
}

// Ändern Sie die radiusToMaxDistance Funktion, um nur die beiden Entfernungsstufen zu berücksichtigen
export const radiusToMaxDistance = (radiusKm: number): number => {
  if (radiusKm <= 20) return 0 // Sehr nah (0-20km)
  if (radiusKm <= 50) return 1 // Nah (20-50km)
  return 2 // Außerhalb des Suchradius
}

// Ändern Sie die getDistanceClass Funktion, um nur die beiden Entfernungsstufen zu berücksichtigen
export const getDistanceClass = (distance: number): string => {
  if (distance === 0) return "very-close"
  if (distance === 1) return "close"
  return "far"
}
