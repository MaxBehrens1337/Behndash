"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Map,
  Info,
  Users,
  Instagram,
  Music,
  MapPin,
  List,
  BarChart2,
  Moon,
  Sun,
  Maximize,
  Minimize,
  HelpCircle,
  Search,
  RefreshCw,
  Bookmark,
  BookmarkPlus,
  Share2,
} from "lucide-react"
import Image from "next/image"

import FestivalCalendar from "./festival-calendar"
import { findCityByName, calculatePLZDistance } from "../utils/plz-data"
import { useTheme } from "@/contexts/theme-context"
import { useFullscreen } from "@/hooks/use-fullscreen"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { useNotification } from "@/components/notification"

// Importiere die neuen Funktionen für Vertriebsmitarbeiter
import {
  loadSalesRepresentatives,
  isEventInSalesRepArea, // Updated function name
  countEventsPerSalesRep, // Updated function name
  type SalesRepresentative,
} from "../utils/event-rep-data" // Updated file name

// Importiere die neue Komponente:
import { SalesRepOverview } from "./sales-rep-overview"
import CityFestivalTable from './city-festival-table'; // Import der neuen Komponente
import dynamic from 'next/dynamic';

const EventsMap = dynamic(() => import('./events-map'), {
  ssr: false,
  loading: () => <p className="text-center p-10">Karte wird geladen...</p>,
});

// Typdefinitionen
interface Festival {
  id: number
  name: string
  location: string
  plz: string
  date: string
  month: number
  duration: number
  genre: string
  visitors: number
  instaFollowers: number
  region: string
  website: string
  contact: string
  festivalType: string
  description: string
}

// Added CityFestival Interface
interface CityFestival {
  id: number;
  bundesland: string;
  stadt: string;
  festName: string;
  plz: string;
  datumRaw: string; // Raw date string from CSV
  besucher: number; // Parsed number
  anmerkungen: string;
  lat: number | null;
  lon: number | null;
  monat: number; // Extracted month (1-12, or 0 if not parsable)
  region: string;
  beschreibung: string;
  eventType: string; // e.g., "Stadtfest"
}

interface SortConfig {
  key: keyof Festival | ""
  direction: "ascending" | "descending"
}

interface City {
  name: string
  fullName: string
  lat: number
  lon: number
  type: string
  postcode: string
}

interface Stats {
  regionDistribution: Array<{ name: string; value: number; color?: string }>
  monthDistribution: Array<{ name: string; festivals: number }>
  genreDistribution: Array<{ name: string; value: number }>
  typeDistribution: Array<{ name: string; value: number }>
  sizeDistribution: Array<{ name: string; value: number }>
  totalFestivals: number
  averageVisitors: number
  festivalsWithVisitorCount: number
}

// Konstanten
const REGIONS = ["Ost", "Nord", "West", "Süd"]
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
]
const VISITOR_RANGES = [
  { label: "Alle Größen", min: 0, max: Number.POSITIVE_INFINITY },
  { label: "Klein (< 1.000)", min: 0, max: 1000 },
  { label: "Mittel (1.000 - 10.000)", min: 1000, max: 10000 },
  { label: "Groß (10.000 - 50.000)", min: 10000, max: 50000 },
  { label: "Sehr groß (> 50.000)", min: 50000, max: Number.POSITIVE_INFINITY },
]

const FESTIVAL_TYPES = [
  "Alle Typen",
  "Rock/Metal",
  "Electronic",
  "Hip-Hop",
  "Pop",
  "Jazz/Blues",
  "Folk/World",
  "Classical",
  "Reggae/Ska",
  "Schlager",
  "Verschiedene",
]

const RADIUS_OPTIONS = [
  { label: "20 km", value: 20 },
  { label: "50 km", value: 50 },
]

// Region-Farben für konsistentes Styling
const REGION_COLORS = {
  Ost: { bg: "bg-red-100", text: "text-red-800", color: "#B01E28" },
  Nord: { bg: "bg-red-50", text: "text-red-700", color: "#C12A34" },
  West: { bg: "bg-red-100", text: "text-red-800", color: "#A01822" },
  Süd: { bg: "bg-red-200", text: "text-red-900", color: "#8A1219" },
  Unknown: { bg: "bg-gray-100", text: "text-gray-800", color: "#6B7280" },
}

const FestivalDashboard: React.FC = () => {
  // Theme und Fullscreen Hooks
  const { theme, toggleTheme } = useTheme()
  const { isFullscreen, toggleFullscreen, fullscreenEnabled } = useFullscreen()
  const { showNotification } = useNotification()

  // Hauptstatus
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [filteredFestivals, setFilteredFestivals] = useState<Festival[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // New state variables for CityFestivals
  const [cityFestivals, setCityFestivals] = useState<CityFestival[]>([]);
  const [filteredCityFestivals, setFilteredCityFestivals] = useState<CityFestival[]>([]);
  const [isLoadingCityFestivals, setIsLoadingCityFestivals] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<"festivals" | "cityFestivals" | "both">("festivals"); // Default to festivals
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false); // State for heatmap visibility
  const [heatmapMode, setHeatmapMode] = useState<"density" | "visitors">("density"); // Standard: Dichte
  const [view, setView] = useState<"table" | "charts" | "calendar" | "salesreps" | "map">("table") // Added "map" view
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(true)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  // Füge den State für Vertriebsmitarbeiter hinzu (nach den anderen State-Definitionen)
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([])
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRepresentative | null>(null)
  const [isSalesRepsLoading, setIsSalesRepsLoading] = useState(false)
  const [eventsPerSalesRep, setEventsPerSalesRep] = useState<Record<string, number>>({}) // Renamed state

  // Filter und Sortierung
  const [selectedRegion, setSelectedRegion] = useState("Alle")
  const [selectedMonth, setSelectedMonth] = useState("Alle")
  const [selectedGenre, setSelectedGenre] = useState("Alle")
  const [selectedVisitorRange, setSelectedVisitorRange] = useState("Alle Größen")
  const [selectedFestivalType, setSelectedFestivalType] = useState("Alle Typen")
  const [genres, setGenres] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "ascending" })
  const [searchTerm, setSearchTerm] = useState("")
  const [showEmptyValues, setShowEmptyValues] = useState(true)

  // Radius-Suche
  const [citySearchTerm, setCitySearchTerm] = useState("")
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedRadius, setSelectedRadius] = useState(20)
  const [citySearchResults, setCitySearchResults] = useState<City[]>([])
  const [isSearchingCity, setIsSearchingCity] = useState(false)
  const [showCitySearchResults, setShowCitySearchResults] = useState(false)
  const [festivalDistances, setFestivalDistances] = useState<Record<number, number>>({})

  // Kalender-State
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return today.getMonth() + 1 // JavaScript Monate sind 0-basiert, wir verwenden 1-basiert
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Statistik-Daten
  const [stats, setStats] = useState<Stats>({
    regionDistribution: [],
    monthDistribution: [],
    genreDistribution: [],
    typeDistribution: [],
    sizeDistribution: [],
    totalFestivals: 0,
    averageVisitors: 0,
    festivalsWithVisitorCount: 0,
  })

  // State für Filter-Loading
  const [isFiltering, setIsFiltering] = useState(false)

  // Refs
  const tableRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Lade Favoriten aus dem localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("festivalFavorites")
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error("Fehler beim Laden der Favoriten:", error)
      }
    }
  }, [])

  // Speichere Favoriten im localStorage
  useEffect(() => {
    localStorage.setItem("festivalFavorites", JSON.stringify(favorites))
  }, [favorites])

  // CSV-Export-Funktion
  const exportToCSV = useCallback(() => {
    // Header-Zeile
    const headers = [
      "Name",
      "Ort",
      "PLZ",
      "Region",
      "Datum",
      "Dauer (Tage)",
      "Genre",
      "Besucher",
      "Instagram-Follower",
      "Website",
      "Kontakt",
    ]

    // Daten formatieren
    const csvData = filteredFestivals.map((festival) => [
      festival.name,
      festival.location,
      festival.plz,
      festival.region,
      festival.date,
      festival.duration,
      festival.genre,
      festival.visitors,
      festival.instaFollowers,
      festival.website,
      festival.contact,
    ])

    // CSV-String erstellen
    let csvContent = headers.join(";") + "\n"
    csvData.forEach((row) => {
      csvContent += row.join(";") + "\n"
    })

    // Download initiieren
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Festivals-Export-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showNotification({
      type: "success",
      title: "Export erfolgreich",
      message: `${filteredFestivals.length} Festivals wurden als CSV exportiert.`,
      duration: 3000,
    })
  }, [filteredFestivals, showNotification])

  // Reset-Filter-Funktion
  const resetFilters = useCallback(() => {
    setSelectedRegion("Alle")
    setSelectedMonth("Alle")
    setSelectedGenre("Alle")
    setSelectedVisitorRange("Alle Größen")
    setSelectedFestivalType("Alle Typen")
    setSearchTerm("")
    setShowEmptyValues(true)
    setSelectedCity(null)
    setSelectedRadius(20)
    setCitySearchTerm("")
    setCitySearchResults([])
    setShowOnlyFavorites(false)
    setSortConfig({ key: "name", direction: "ascending" })
    setSelectedSalesRep(null)

    showNotification({
      type: "info",
      title: "Filter zurückgesetzt",
      message: "Alle Filter wurden zurückgesetzt.",
      duration: 3000,
    })
  }, [showNotification])

  // Keyboard-Shortcuts definition moved after exportToCSV is defined
  const KEYBOARD_SHORTCUTS = [
    { key: "f", description: "Vollbildmodus umschalten" },
    { key: "d", description: "Dark Mode umschalten" },
    { key: "s", description: "Suche fokussieren" },
    { key: "e", description: "Daten exportieren" },
    { key: "r", description: "Filter zurücksetzen" },
    { key: "t", description: "Tabellenansicht" },
    { key: "c", description: "Kalenderansicht" },
    { key: "g", description: "Statistikansicht" },
    { key: "h", description: "Hilfe anzeigen" },
    { key: "Escape", description: "Modals schließen" },
  ]

  // Keyboard-Shortcuts definieren
  const shortcuts = useMemo(
    () => [
      {
        key: "f",
        action: () => {
          if (fullscreenEnabled) {
            toggleFullscreen()
            showNotification({
              type: "info",
              title: isFullscreen ? "Vollbildmodus beendet" : "Vollbildmodus aktiviert",
              message: isFullscreen
                ? "Sie haben den Vollbildmodus verlassen."
                : "Sie befinden sich jetzt im Vollbildmodus. Drücken Sie F oder ESC zum Beenden.",
              duration: 3000,
            })
          }
        },
        description: "Vollbildmodus umschalten",
      },
      {
        key: "d",
        action: () => {
          toggleTheme()
          showNotification({
            type: "info",
            title: theme === "light" ? "Dark Mode aktiviert" : "Light Mode aktiviert",
            message:
              theme === "light"
                ? "Das Dashboard wird jetzt im dunklen Design angezeigt."
                : "Das Dashboard wird jetzt im hellen Design angezeigt.",
            duration: 3000,
          })
        },
        description: "Dark Mode umschalten",
      },
      {
        key: "s",
        action: () => {
          searchInputRef.current?.focus()
        },
        description: "Suche fokussieren",
      },
      {
        key: "e",
        action: exportToCSV,
        description: "Daten exportieren",
      },
      {
        key: "r",
        action: resetFilters,
        description: "Filter zurücksetzen",
      },
      {
        key: "t",
        action: () => setView("table"),
        description: "Tabellenansicht",
      },
      {
        key: "c",
        action: () => setView("calendar"),
        description: "Kalenderansicht",
      },
      {
        key: "g",
        action: () => setView("charts"),
        description: "Statistikansicht",
      },
      {
        key: "h",
        action: () => setShowHelpModal(true),
        description: "Hilfe anzeigen",
      },
      {
        key: "Escape",
        action: () => {
          if (showDetailModal) setShowDetailModal(false)
          else if (showHelpModal) setShowHelpModal(false)
          else if (showShareModal) setShowShareModal(false)
        },
        description: "Modals schließen",
      },
    ],
    [
      fullscreenEnabled,
      toggleFullscreen,
      isFullscreen,
      toggleTheme,
      theme,
      exportToCSV,
      resetFilters,
      showDetailModal,
      showHelpModal,
      showShareModal,
      showNotification,
    ],
  )

  // Daten laden
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/festivals")

        if (!response.ok) {
          throw new Error(`Failed to fetch festival data: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        if (data?.festivals?.length > 0) {
          setFestivals(data.festivals)
          setFilteredFestivals(data.festivals)

          // Extrahiere einzigartige Genres
          const allGenres: string[] = []
          data.festivals.forEach((festival: Festival) => {
            if (festival.genre) {
              const festivalGenres = festival.genre.split(/[,/]/).map((g) => g.trim())
              festivalGenres.forEach((genre) => {
                if (genre && !allGenres.includes(genre) && genre !== "k.A." && genre !== "N/A") {
                  allGenres.push(genre)
                }
              })
            }
          })

          setGenres(allGenres.sort())
          calculateStats(data.festivals)

          showNotification({
            type: "success",
            title: "Daten geladen",
            message: `${data.festivals.length} Festivals wurden erfolgreich geladen.`,
            duration: 3000,
          })
        } else {
          throw new Error("No festival data found")
        }
      } catch (error) {
        console.error("Fehler beim Laden der Festivaldaten:", error)
        showNotification({
          type: "error",
          title: "Fehler beim Laden",
          message: "Die Festivaldaten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
          duration: 5000,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [showNotification])

  // useEffect Hook for CityFestival Data Fetching
  useEffect(() => {
    const loadCityFestivalData = async () => {
      try {
        setIsLoadingCityFestivals(true);
        const response = await fetch("/api/cityfestivals"); // New endpoint

        if (!response.ok) {
          throw new Error(`Failed to fetch city festival data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data?.cityFestivals?.length > 0) {
          setCityFestivals(data.cityFestivals);
          // Initial also set the filtered list, further filtering comes later
          setFilteredCityFestivals(data.cityFestivals); 
          
          // Optional: Notification, if desired (analogous to festival data)
          // showNotification({
          //   type: "success",
          //   title: "Stadtfest-Daten geladen",
          //   message: `${data.cityFestivals.length} Stadtfeste wurden erfolgreich geladen.`,
          //   duration: 3000,
          // });
        } else {
          // Do not throw errors if no data is present, but log it.
          console.log("No city festival data found or data is empty.");
          setCityFestivals([]);
          setFilteredCityFestivals([]);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Stadtfest-Daten:", error);
        // showNotification({
        //   type: "error",
        //   title: "Fehler beim Laden der Stadtfeste",
        //   message: "Die Stadtfest-Daten konnten nicht geladen werden.",
        //   duration: 5000,
        // });
         setCityFestivals([]);
         setFilteredCityFestivals([]);
      } finally {
        setIsLoadingCityFestivals(false);
      }
    };

    loadCityFestivalData();
  }, [showNotification]); // showNotification as dependency, if used for notifications

  // Füge einen useEffect-Hook hinzu, um die Vertriebsmitarbeiter zu laden (nach dem useEffect für das Laden der Festivals)
  useEffect(() => {
    const loadSalesReps = async () => {
      setIsSalesRepsLoading(true)
      try {
        const reps = await loadSalesRepresentatives()
        setSalesReps(reps)

        // Berechne die Anzahl der Events pro Vertriebsmitarbeiter, basierend auf eventTypeFilter
        let eventsToCount: Array<{ plz: string }> = [];
        if (eventTypeFilter === "festivals") {
          eventsToCount = festivals;
        } else if (eventTypeFilter === "cityFestivals") {
          eventsToCount = cityFestivals;
        } else if (eventTypeFilter === "both") {
          // Stelle sicher, dass beide Listen PLZ-Eigenschaften haben
          eventsToCount = [
            ...festivals.map(f => ({ plz: f.plz, id: `f-${f.id}` })), // Add type prefix to id for uniqueness if needed later
            ...cityFestivals.map(cf => ({ plz: cf.plz, id: `cf-${cf.id}`}))
          ];
        }

        if (eventsToCount.length > 0 && reps.length > 0) {
          const counts = countEventsPerSalesRep(eventsToCount, reps);
          setEventsPerSalesRep(counts);
        } else {
          // Set counts to 0 if no events or no reps
           const zeroCounts: Record<string, number> = {};
           reps.forEach(rep => zeroCounts[rep.id] = 0);
           setEventsPerSalesRep(zeroCounts);
        }

        // Zeige Benachrichtigung, wenn Vertriebsmitarbeiter geladen wurden
        if (reps.length > 0) {
          showNotification({
            type: "success",
            title: "Vertriebsmitarbeiter geladen",
            message: `${reps.length} Vertriebsmitarbeiter wurden erfolgreich geladen.`,
            duration: 3000,
          })
        }
      } catch (error) {
        console.error("Fehler beim Laden der Vertriebsmitarbeiter:", error)
        showNotification({
          type: "error",
          title: "Fehler beim Laden",
          message: "Die Vertriebsmitarbeiter konnten nicht geladen werden.",
          duration: 5000,
        })
      } finally {
        setIsSalesRepsLoading(false)
      }
    }

    loadSalesReps()
  }, [festivals, cityFestivals, eventTypeFilter, showNotification]) // Added cityFestivals and eventTypeFilter dependencies

  // Berechnet statistische Daten für Charts
  const calculateStats = useCallback((data: Festival[]) => {
    // Region-Verteilung
    const regionCounts: Record<string, number> = {}
    REGIONS.forEach((region) => (regionCounts[region] = 0))

    data.forEach((festival) => {
      if (regionCounts[festival.region] !== undefined) {
        regionCounts[festival.region]++
      }
    })

    const regionDistribution = Object.keys(regionCounts).map((region) => ({
      name: region,
      value: regionCounts[region],
      color: REGION_COLORS[region as keyof typeof REGION_COLORS]?.color,
    }))

    // Monats-Verteilung
    const monthCounts = Array(12).fill(0)

    data.forEach((festival) => {
      if (festival.month > 0 && festival.month <= 12) {
        monthCounts[festival.month - 1]++
      }
    })

    const monthDistribution = monthCounts.map((count, index) => ({
      name: MONTHS[index],
      festivals: count,
    }))

    // Genre-Verteilung (Top 10)
    const genreCounts: Record<string, number> = {}

    data.forEach((festival) => {
      if (festival.genre) {
        const festivalGenres = festival.genre.split(/[,/]/).map((g) => g.trim())
        festivalGenres.forEach((genre) => {
          if (genre && genre !== "k.A." && genre !== "N/A" && genre !== "Unknown") {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1
          }
        })
      }
    })

    const genreDistribution = Object.keys(genreCounts)
      .map((genre) => ({ name: genre, value: genreCounts[genre] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Festival-Typ-Verteilung
    const typeCounts: Record<string, number> = {}
    FESTIVAL_TYPES.slice(1).forEach((type) => (typeCounts[type] = 0)) // Skip "Alle Typen"

    data.forEach((festival) => {
      if (festival.festivalType && typeCounts[festival.festivalType] !== undefined) {
        typeCounts[festival.festivalType]++
      }
    })

    const typeDistribution = Object.keys(typeCounts)
      .map((type) => ({ name: type, value: typeCounts[type] }))
      .sort((a, b) => b.value - a.value)

    // Größen-Verteilung
    const sizeCounts = [0, 0, 0, 0] // Klein, Mittel, Groß, Sehr groß
    let totalVisitors = 0
    let festivalsWithVisitorCount = 0

    data.forEach((festival) => {
      if (festival.visitors > 0) {
        totalVisitors += festival.visitors
        festivalsWithVisitorCount++

        if (festival.visitors < 1000) {
          sizeCounts[0]++
        } else if (festival.visitors < 10000) {
          sizeCounts[1]++
        } else if (festival.visitors < 50000) {
          sizeCounts[2]++
        } else {
          sizeCounts[3]++
        }
      }
    })

    const sizeLabels = ["Klein (<1.000)", "Mittel (1.000-10.000)", "Groß (10.000-50.000)", "Sehr groß (>50.000)"]
    const sizeDistribution = sizeCounts.map((count, index) => ({
      name: sizeLabels[index],
      value: count,
    }))

    // Berechne den Durchschnitt der Besucher
    const averageVisitors = festivalsWithVisitorCount > 0 ? Math.round(totalVisitors / festivalsWithVisitorCount) : 0

    setStats({
      regionDistribution,
      monthDistribution,
      genreDistribution,
      typeDistribution,
      sizeDistribution,
      totalFestivals: data.length,
      averageVisitors,
      festivalsWithVisitorCount,
    })
  }, [])

  // Funktion zum Suchen von Städten mit der OpenStreetMap Nominatim API
  const searchCity = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setCitySearchResults([])
      return
    }

    setIsSearchingCity(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ", Deutschland",
        )}&limit=5&addressdetails=1&countrycodes=de`,
        {
          headers: {
            "User-Agent": "BehnFestivalDashboard/1.0",
          },
        },
      )

      if (response.status === 429) {
        console.log("Rate limit erreicht, bitte warten Sie einen Moment und versuchen Sie es erneut.")
        setCitySearchResults([])
        return
      }

      const data = await response.json()

      // Filtern nach Städten in Deutschland
      const cities = data
        .filter(
          (item: any) =>
            item.address && (item.address.city || item.address.town || item.address.village || item.address.hamlet),
        )
        .map((item: any) => ({
          name: item.display_name.split(",")[0],
          fullName: item.display_name,
          lat: Number.parseFloat(item.lat),
          lon: Number.parseFloat(item.lon),
          type: item.type,
          postcode: item.address.postcode || "",
        }))

      setCitySearchResults(cities)
    } catch (error) {
      console.error("Fehler beim Suchen der Stadt:", error)
      setCitySearchResults([])
    } finally {
      setIsSearchingCity(false)
    }
  }, [])

  // Umkreissuche-Funktion
  const filterByProximity = useCallback((festivals: Festival[], selectedCity: City, selectedRadius: number) => {
    if (!selectedCity) return festivals

    // Konvertiere den ausgewählten Radius in km in unsere Distanzskala
    let maxDistance
    if (selectedRadius <= 20)
      maxDistance = 0 // Sehr nah (0-20km)
    else if (selectedRadius <= 50)
      maxDistance = 1 // Nah (20-50km)
    else maxDistance = 1 // Standardmäßig auf Nah (20-50km) begrenzen

    // Berechne Distanzen für alle Festivals
    const distances: Record<number, number> = {}

    // Finde Referenz-PLZ für die ausgewählte Stadt
    const cityData = findCityByName(selectedCity.name)
    const referencePLZ = cityData ? cityData.primaryPlz : selectedCity.postcode

    if (!referencePLZ) {
      // Fallback, wenn keine Referenz-PLZ gefunden wird - verwende Namensabgleich
      return festivals.filter(
        (festival) => festival.location && festival.location.toLowerCase().includes(selectedCity.name.toLowerCase()),
      )
    }

    // Berechne Distanz für jedes Festival
    festivals.forEach((festival) => {
      if (festival.plz) {
        // Verwende unsere PLZ-basierte Distanzberechnung
        const distance = calculatePLZDistance(referencePLZ, festival.plz)
        // Begrenze die Distanz auf maximal 1 (Nah)
        distances[festival.id] = distance > 1 ? 2 : distance
      }
    })

    // Aktualisiere den State mit berechneten Distanzen
    setFestivalDistances(distances)

    // Filtere und sortiere nach Distanz
    const filtered = festivals
      .filter((festival) => {
        if (!festival.plz) return false
        const distance = distances[festival.id]
        return distance !== undefined && distance <= maxDistance
      })
      .sort((a, b) => {
        const distanceA = distances[a.id] || 999
        const distanceB = distances[b.id] || 999
        return distanceA - distanceB
      })

    return filtered
  }, [])

  // Filter-Funktion für Festivals
  useEffect(() => {
    const filterData = async () => {
      setIsFiltering(true);

      // Synchronisiere den Kalendermonat mit dem Monatsfilter, wenn ein Monat ausgewählt ist
      if (selectedMonth !== "Alle" && view === "calendar") {
        const monthIndex = MONTHS.indexOf(selectedMonth);
        setCurrentMonth(monthIndex + 1);
      }

      // Verzögerung hinzufügen, um die UI nicht zu blockieren
      await new Promise((resolve) => setTimeout(resolve, 10));

      let currentFilteredFestivals = [...festivals];
      let currentFilteredCityFestivals = [...cityFestivals];

      // Nur Favoriten anzeigen, wenn aktiviert (nur für Haupt-Festivals implementiert)
      if (showOnlyFavorites) {
        currentFilteredFestivals = currentFilteredFestivals.filter((festival) => favorites.includes(festival.id));
        // Favoriten für Stadtfeste sind hier nicht implementiert, könnten aber analog hinzugefügt werden
      }

      // Nach Vertriebsmitarbeiter filtern
      if (selectedSalesRep) {
        if (eventTypeFilter === "festivals" || eventTypeFilter === "both") {
          currentFilteredFestivals = currentFilteredFestivals.filter((festival) => isEventInSalesRepArea(festival, selectedSalesRep!));
        }
        if (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") {
          currentFilteredCityFestivals = currentFilteredCityFestivals.filter((cityFestival) => isEventInSalesRepArea(cityFestival, selectedSalesRep!));
        }
      }

      // ZUERST nach Radius um eine Stadt filtern, wenn eine Stadt ausgewählt ist
      // Diese Filterung wird hier nur auf currentFilteredFestivals angewendet.
      // Um sie auch auf Stadtfeste anzuwenden, müsste die Logik erweitert oder dupliziert werden.
      if (selectedCity) {
        currentFilteredFestivals = filterByProximity(currentFilteredFestivals, selectedCity, selectedRadius);
        // TODO: Ggf. filterByProximity auch für Stadtfeste anpassen, wenn benötigt
        // Für Stadtfeste könnte eine ähnliche Logik hier stehen:
        // currentFilteredCityFestivals = filterByProximityCity(currentFilteredCityFestivals, selectedCity, selectedRadius);
      }

      // Filter für Haupt-Festivals
      if (eventTypeFilter === "festivals" || eventTypeFilter === "both") {
        if (selectedRegion !== "Alle") {
          currentFilteredFestivals = currentFilteredFestivals.filter((festival) => festival.region === selectedRegion);
        }
        if (selectedMonth !== "Alle") {
          const monthIndex = MONTHS.indexOf(selectedMonth);
          currentFilteredFestivals = currentFilteredFestivals.filter((festival) => festival.month === monthIndex + 1);
        }
        if (selectedFestivalType !== "Alle Typen") {
          currentFilteredFestivals = currentFilteredFestivals.filter((festival) => festival.festivalType === selectedFestivalType);
        }
        if (selectedVisitorRange !== "Alle Größen") {
          const range = VISITOR_RANGES.find((r) => r.label === selectedVisitorRange);
          if (range) {
            currentFilteredFestivals = currentFilteredFestivals.filter((f) => f.visitors >= range.min && f.visitors < range.max);
          }
        }
        if (!showEmptyValues) {
          currentFilteredFestivals = currentFilteredFestivals.filter((festival) => festival.visitors > 0);
        }
        if (searchTerm) {
          const lowerSearchTerm = searchTerm.toLowerCase();
          currentFilteredFestivals = currentFilteredFestivals.filter(
            (f) =>
              f.name.toLowerCase().includes(lowerSearchTerm) ||
              f.location.toLowerCase().includes(lowerSearchTerm) ||
              (f.plz && f.plz.toLowerCase().includes(lowerSearchTerm)) ||
              (f.festivalType && f.festivalType.toLowerCase().includes(lowerSearchTerm)),
          );
        }
        if (sortConfig.key) { // Annahme: sortConfig.key ist vom Typ keyof Festival
          currentFilteredFestivals.sort((a, b) => {
            const valA = a[sortConfig.key as keyof Festival];
            const valB = b[sortConfig.key as keyof Festival];
            if (sortConfig.key === "month") {
              if ((valA as number) === 0 && (valB as number) !== 0) return sortConfig.direction === "ascending" ? 1 : -1;
              if ((valA as number) !== 0 && (valB as number) === 0) return sortConfig.direction === "ascending" ? -1 : 1;
            }
            if (valA < valB) return sortConfig.direction === "ascending" ? -1 : 1;
            if (valA > valB) return sortConfig.direction === "ascending" ? 1 : -1;
            return 0;
          });
        }
      }
      
      // Filter für Stadtfeste (analog zu Haupt-Festivals, aber mit CityFestival-Feldern)
      if (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") {
        if (selectedRegion !== "Alle") {
           currentFilteredCityFestivals = currentFilteredCityFestivals.filter((cf) => cf.region === selectedRegion);
        }
        if (selectedMonth !== "Alle") {
          const monthIndex = MONTHS.indexOf(selectedMonth);
          currentFilteredCityFestivals = currentFilteredCityFestivals.filter((cf) => cf.monat === monthIndex + 1);
        }
        // Kein 'selectedFestivalType' Filter für Stadtfeste, da sie ihren eigenen Typ haben ('eventType')
        if (selectedVisitorRange !== "Alle Größen") {
          const range = VISITOR_RANGES.find((r) => r.label === selectedVisitorRange);
          if (range) {
            currentFilteredCityFestivals = currentFilteredCityFestivals.filter((cf) => cf.besucher >= range.min && cf.besucher < range.max);
          }
        }
        if (!showEmptyValues) { // Annahme: showEmptyValues gilt auch für Stadtfeste (Besucher)
          currentFilteredCityFestivals = currentFilteredCityFestivals.filter((cf) => cf.besucher > 0);
        }
        if (searchTerm) {
          const lowerSearchTerm = searchTerm.toLowerCase();
          currentFilteredCityFestivals = currentFilteredCityFestivals.filter(
            (cf) =>
              cf.festName.toLowerCase().includes(lowerSearchTerm) ||
              cf.stadt.toLowerCase().includes(lowerSearchTerm) ||
              (cf.plz && cf.plz.toLowerCase().includes(lowerSearchTerm)) ||
              (cf.bundesland && cf.bundesland.toLowerCase().includes(lowerSearchTerm)),
          );
        }
        // Sortierung für Stadtfeste ist hier nicht implementiert, könnte aber analog zu Haupt-Festivals hinzugefügt werden
        // if (sortConfig.key) { ... } // Beachten, dass sortConfig.key auf CityFestival Felder angepasst werden müsste
      }

      setFilteredFestivals(currentFilteredFestivals);
      setFilteredCityFestivals(currentFilteredCityFestivals);
      
      // Aktualisiere Statistiken basierend auf dem eventTypeFilter
      if(eventTypeFilter === "festivals") {
        calculateStats(currentFilteredFestivals);
      } else if (eventTypeFilter === "cityFestivals") {
        // calculateStats erwartet Festival[], daher ggf. anpassen oder separate Statistikfunktion für Stadtfeste
        // Fürs Erste keine Statistiken für reine Stadtfest-Ansicht, oder eine angepasste Logik wäre nötig.
        // Um Fehler zu vermeiden, könnten wir eine leere Statistik setzen oder eine angepasste Logik implementieren
        // setStats(initialStats); // oder eine leere Statistik
      } else { // "both"
         // Wenn "both", könnten Statistiken für Festivals angezeigt werden, oder eine kombinierte Statistik
         calculateStats(currentFilteredFestivals); 
      }
      setCurrentPage(1) // Bei Filter-Änderung zurück zur ersten Seite
      setIsFiltering(false)
    }

    filterData()
  }, [
    festivals, cityFestivals, eventTypeFilter, // Added cityFestivals and eventTypeFilter
    selectedRegion,
    selectedMonth,
    selectedFestivalType,
    selectedVisitorRange,
    showEmptyValues,
    searchTerm,
    sortConfig,
    selectedCity,
    selectedRadius,
    view,
    calculateStats,
    filterByProximity,
    favorites,
    showOnlyFavorites,
    selectedSalesRep, 
    // showNotification // Entfernt, da es nicht direkt in der Filterlogik verwendet wird
  ])

  // Sortierfunktion für Tabellenspalten
  const requestSort = useCallback(
    (key: keyof Festival) => {
      let direction: "ascending" | "descending" = "ascending"
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending"
      }
      setSortConfig({ key, direction })
    },
    [sortConfig],
  )

  // Pagination berechnen
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = useMemo(() => {
    return filteredFestivals.slice(indexOfFirstItem, indexOfLastItem)
  }, [filteredFestivals, indexOfFirstItem, indexOfLastItem])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredFestivals.length / itemsPerPage)
  }, [filteredFestivals.length, itemsPerPage])

  // Pagination-Steuerung
  const paginate = useCallback((pageNumber: number) => setCurrentPage(pageNumber), [])
  const nextPage = useCallback(() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)), [totalPages])
  const prevPage = useCallback(() => setCurrentPage((prev) => Math.max(prev - 1, 1)), [])

  // Pagination-Anzeige optimieren für große Datensätze
  const renderPaginationButtons = useCallback(() => {
    const buttons = []

    // Immer die erste Seite anzeigen
    buttons.push(
      <button
        key={1}
        onClick={() => paginate(1)}
        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
          currentPage === 1
            ? "z-10 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            : "text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        1
      </button>,
    )

    // Ellipsis hinzufügen, wenn die aktuelle Seite weit von der ersten entfernt ist
    if (currentPage > 3) {
      buttons.push(
        <span
          key="ellipsis-1"
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          ...
        </span>,
      )
    }

    // Seiten um die aktuelle Seite herum anzeigen
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue // Erste und letzte Seite werden separat hinzugefügt

      buttons.push(
        <button
          key={i}
          onClick={() => paginate(i)}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
            currentPage === i
              ? "z-10 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {i}
        </button>,
      )
    }

    // Ellipsis hinzufügen, wenn die aktuelle Seite weit von der letzten entfernt ist
    if (currentPage < totalPages - 2) {
      buttons.push(
        <span
          key="ellipsis-2"
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          ...
        </span>,
      )
    }

    // Immer die letzte Seite anzeigen, wenn es mehr als eine Seite gibt
    if (totalPages > 1) {
      buttons.push(
        <button
          key={totalPages}
          onClick={() => paginate(totalPages)}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
            currentPage === totalPages
              ? "z-10 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {totalPages}
        </button>,
      )
    }

    return buttons
  }, [currentPage, totalPages, paginate])

  // Reset-Filter-Funktion

  // Festival-Detail-Modal öffnen
  const openFestivalDetail = useCallback((festival: Festival) => {
    setSelectedFestival(festival)
    setShowDetailModal(true)
  }, [])

  // Festival-Detail-Modal schließen
  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false)
  }, [])

  // Kalender-Monat ändern
  const handleCalendarMonthChange = useCallback((month: number) => {
    setCurrentMonth(month)
  }, [])

  // Favoriten-Funktion
  const toggleFavorite = useCallback((festivalId: number) => {
    setFavorites((prevFavorites) => {
      const isCurrentlyFavorite = prevFavorites.includes(festivalId)
      let updatedFavorites

      if (isCurrentlyFavorite) {
        // Entferne aus Favoriten
        updatedFavorites = prevFavorites.filter((id) => id !== festivalId)
      } else {
        // Füge zu Favoriten hinzu
        updatedFavorites = [...prevFavorites, festivalId]
      }

      return updatedFavorites
    })
  }, [])

  // Prüfen, ob Festival ein Favorit ist
  const isFavorite = useCallback(
    (festivalId: number) => {
      return favorites.includes(festivalId)
    },
    [favorites],
  )

  // Festival teilen
  const shareFestival = useCallback((festival: Festival) => {
    setSelectedFestival(festival)
    setShowShareModal(true)
  }, [])

  return (
    <>
      <KeyboardShortcuts shortcuts={shortcuts} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Image
                src="/images/waldemar-behn-logo.png"
                alt="Waldemar Behn Logo"
                width={200}
                height={80}
                className="mr-4"
              />
              <div>
                <h1 className="text-2xl font-semibold">Festival-Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Übersicht über alle Festivals im Vertriebsgebiet der Waldemar Behn GmbH
                </p>
              </div>
            </div>

            <div className="space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label="Dark Mode umschalten"
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {fullscreenEnabled && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Vollbildmodus umschalten"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              )}
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label="Hilfe anzeigen"
              >
                <HelpCircle size={20} />
              </button>
            </div>
          </div>

          {/* Suchleiste und Filter-Button */}
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-full md:w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <input
                type="search"
                id="default-search"
                className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-red-500 dark:focus:border-red-500"
                placeholder="Festival suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
              />
            </div>

            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-lg text-sm px-5 py-3"
              type="button"
              aria-label="Filter öffnen/schließen"
            >
              Filter
              {isFilterMenuOpen ? (
                <ChevronUp className="inline ml-2" size={16} />
              ) : (
                <ChevronDown className="inline ml-2" size={16} />
              )}
            </button>
          </div>

          {/* Filter-Menü (ausblendbar) */}
          {isFilterMenuOpen && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/30 mb-6 transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Region-Filter */}
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Region
                  </label>
                  <select
                    id="region"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                  >
                    <option>Alle</option>
                    {REGIONS.map((region) => (
                      <option key={region}>{region}</option>
                    ))}
                  </select>
                </div>

                {/* Monats-Filter */}
                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Monat
                  </label>
                  <select
                    id="month"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    <option>Alle</option>
                    {MONTHS.map((month) => (
                      <option key={month}>{month}</option>
                    ))}
                  </select>
                </div>

                {/* Festival-Typ-Filter */}
                <div>
                  <label htmlFor="festivalType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Festival-Typ
                  </label>
                  <select
                    id="festivalType"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                    value={selectedFestivalType}
                    onChange={(e) => setSelectedFestivalType(e.target.value)}
                  >
                    {FESTIVAL_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Besucherzahl-Filter */}
                <div>
                  <label htmlFor="visitors" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Besucherzahl
                  </label>
                  <select
                    id="visitors"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                    value={selectedVisitorRange}
                    onChange={(e) => setSelectedVisitorRange(e.target.value)}
                  >
                    {VISITOR_RANGES.map((range) => (
                      <option key={range.label}>{range.label}</option>
                    ))}
                  </select>
                </div>

                {/* Umkreissuche */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                  <label htmlFor="citySearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Umkreissuche
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="citySearch"
                      className="block w-full p-3 text-sm text-gray-900 border border-gray-300 rounded-md bg-gray-50 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-red-500 dark:focus:border-red-500"
                      placeholder="Stadt suchen..."
                      value={citySearchTerm}
                      onChange={(e) => {
                        setCitySearchTerm(e.target.value)
                        searchCity(e.target.value)
                        setShowCitySearchResults(true)
                      }}
                      onFocus={() => setShowCitySearchResults(true)}
                      onBlur={() => setTimeout(() => setShowCitySearchResults(false), 100)}
                    />
                    {isSearchingCity && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <RefreshCw className="animate-spin w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    {citySearchResults.length > 0 && showCitySearchResults && (
                      <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {citySearchResults.map((city) => (
                          <li
                            key={city.fullName}
                            className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                            onClick={() => {
                              setSelectedCity(city)
                              setCitySearchTerm(city.name)
                              setCitySearchResults([])
                              setShowCitySearchResults(false)
                            }}
                          >
                            {city.fullName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedCity && (
                    <div className="mt-2 flex items-center space-x-2">
                      <MapPin className="text-gray-500 dark:text-gray-400" size={16} />
                      <p className="text-sm text-gray-700 dark:text-gray-300">Ausgewählte Stadt: {selectedCity.name}</p>
                      <select
                        className="ml-auto py-1 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                        value={selectedRadius}
                        onChange={(e) => setSelectedRadius(Number(e.target.value))}
                      >
                        {RADIUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Option um Festivals ohne Besucherzahlen auszufiltern */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                  <label className="inline-flex items-center mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-red-600 dark:text-red-400 rounded border-gray-300 dark:border-gray-700 focus:ring-red-500 dark:focus:ring-red-400 dark:bg-gray-800"
                      checked={showEmptyValues}
                      onChange={(e) => setShowEmptyValues(e.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Festivals ohne Besucherzahlen anzeigen
                    </span>
                  </label>
                </div>

                {/* Option um nur Favoriten anzuzeigen */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                  <label className="inline-flex items-center mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-red-600 dark:text-red-400 rounded border-gray-300 dark:border-gray-700 focus:ring-red-500 dark:focus:ring-red-400 dark:bg-gray-800"
                      checked={showOnlyFavorites}
                      onChange={(e) => setShowOnlyFavorites(e.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nur Favoriten anzeigen
                    </span>
                  </label>
                </div>

                {/* Vertriebsmitarbeiter-Filter */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event-Typen anzeigen</label>
                  <div className="mt-1 space-y-2 sm:space-y-0 sm:flex sm:space-x-4">
                    {[
                      { label: "Nur Festivals", value: "festivals" },
                      { label: "Nur Stadtfeste", value: "cityFestivals" },
                      { label: "Beide anzeigen", value: "both" },
                    ].map((option) => (
                      <label key={option.value} className="inline-flex items-center cursor-pointer">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-700 focus:ring-red-500 dark:focus:ring-red-400 bg-gray-100 dark:bg-gray-900"
                          name="eventTypeFilter"
                          value={option.value}
                          checked={eventTypeFilter === option.value}
                          onChange={(e) => setEventTypeFilter(e.target.value as "festivals" | "cityFestivals" | "both")}
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 lg:col-span-4"> {/* Ensure this wraps correctly or adjust grid */}
                  <label htmlFor="salesRep" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vertriebsmitarbeiter
                  </label>
                  <select
                    id="salesRep"
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-gray-900 dark:text-gray-100"
                    value={selectedSalesRep?.id || ""}
                    onChange={(e) => {
                      const repId = e.target.value
                      if (repId === "") {
                        setSelectedSalesRep(null)
                      } else {
                        const rep = salesReps.find((r) => r.id === repId)
                        if (rep) setSelectedSalesRep(rep)
                      }
                    }}
                    disabled={isSalesRepsLoading}
                  >
                    <option value="">Alle Vertriebsgebiete</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        Mitarbeiter {rep.id} ({eventsPerSalesRep[rep.id] || 0} Events) {/* Renamed */}
                      </option>
                    ))}
                  </select>
                  {isSalesRepsLoading && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Vertriebsmitarbeiter werden geladen...
                    </p>
                  )}
                  {selectedSalesRep && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {selectedSalesRep.plzAreas.length} PLZ-Bereiche zugewiesen •{" "}
                      {eventsPerSalesRep[selectedSalesRep.id] || 0} Events im Gebiet {/* Renamed */}
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons zum Zurücksetzen und Anwenden der Filter */}
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={resetFilters}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm px-5 py-2.5"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          )}

          {/* Content-Tabs */}
          <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">
              Select a tab
            </label>
            <select
              id="tabs"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5 dark:placeholder-gray-400"
              value={view}
              onChange={(e) => setView(e.target.value as "table" | "charts" | "calendar" | "salesreps" | "map")}
            >
              <option value="table">Tabelle</option>
              <option value="calendar">Kalender</option>
              <option value="charts">Statistiken</option>
              <option value="salesreps">Vertriebsmitarbeiter</option>
              <option value="map">Karte</option> {/* Added Map option */}
            </select>
          </div>
          <ul className="hidden sm:flex flex-wrap mb-4">
            <li>
              <button
                onClick={() => setView("table")}
                className={`inline-block p-4 rounded-lg hover:text-red-600 dark:hover:text-red-500 ${
                  view === "table"
                    ? "text-red-600 dark:text-red-500 bg-gray-50 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <List className="inline mr-2" size={16} />
                Tabelle
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("calendar")}
                className={`inline-block p-4 rounded-lg hover:text-red-600 dark:hover:text-red-500 ${
                  view === "calendar"
                    ? "text-red-600 dark:text-red-500 bg-gray-50 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Calendar className="inline mr-2" size={16} />
                Kalender
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("charts")}
                className={`inline-block p-4 rounded-lg hover:text-red-600 dark:hover:text-red-500 ${
                  view === "charts"
                    ? "text-red-600 dark:text-red-500 bg-gray-50 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <BarChart2 className="inline mr-2" size={16} />
                Statistiken
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("salesreps")}
                className={`inline-block p-4 rounded-lg hover:text-red-600 dark:hover:text-red-500 ${
                  view === "salesreps"
                    ? "text-red-600 dark:text-red-500 bg-gray-50 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Users className="inline mr-2" size={16} />
                Vertriebsmitarbeiter
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("map")}
                className={`inline-block p-4 rounded-lg hover:text-red-600 dark:hover:text-red-500 ${
                  view === "map"
                    ? "text-red-600 dark:text-red-500 bg-gray-50 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <MapPin className="inline mr-2" size={16} /> {/* Changed Icon to MapPin for "Karte" */}
                Karte
              </button>
            </li>
          </ul>

          {/* Content-Bereich (Tabelle, Kalender oder Statistiken) */}
          <div>
            {isLoading && (eventTypeFilter === "festivals" || eventTypeFilter === "both") ? ( /* Adjusted loading check for map view */
              <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 transition-colors duration-300">
                <p>Daten werden geladen...</p>
              </div>
            ) : view === "table" ? (
              <div> {/* Wrapper div für Tabellen */}
                {(eventTypeFilter === "festivals" || eventTypeFilter === "both") && !isLoading && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 overflow-hidden transition-colors duration-300">
                    <h2 className="text-xl font-semibold p-4 text-gray-900 dark:text-gray-100">Festivals</h2>
                    {isFiltering && eventTypeFilter !== "cityFestivals" ? (
                      <div className="text-center p-6">
                        <p>Festival-Daten werden gefiltert...</p>
                      </div>
                    ) : filteredFestivals.length > 0 || isLoading ? (
                      <div>
                        <div className="overflow-x-auto">
                          <table ref={tableRef} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                >
                                  Favorit
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("name")}
                                >
                                  Name
                                  {sortConfig.key === "name" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("location")}
                                >
                                  Ort
                                  {sortConfig.key === "location" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("plz")}
                                >
                                  PLZ
                                  {sortConfig.key === "plz" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("region")}
                                >
                                  Region
                                  {sortConfig.key === "region" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("date")}
                                >
                                  Datum
                                  {sortConfig.key === "date" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("duration")}
                                >
                                  Dauer
                                  {sortConfig.key === "duration" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("visitors")}
                                >
                                  Besucher
                                  {sortConfig.key === "visitors" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort("instaFollowers")}
                                >
                                  Instagram
                                  {sortConfig.key === "instaFollowers" && (
                                    <span>{sortConfig.direction === "ascending" ? "▲" : "▼"}</span>
                                  )}
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                  <span className="sr-only">Details</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {currentItems.map((festival) => (
                                <tr key={festival.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox h-5 w-5 text-red-600 dark:text-red-400 rounded border-gray-300 dark:border-gray-700 focus:ring-red-500 dark:focus:ring-red-400 dark:bg-gray-800"
                                      checked={isFavorite(festival.id)}
                                      onChange={() => toggleFavorite(festival.id)}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {festival.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.location}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.plz}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <span
                                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                      ${REGION_COLORS[festival.region as keyof typeof REGION_COLORS]?.bg || "bg-gray-100"} 
                                      ${REGION_COLORS[festival.region as keyof typeof REGION_COLORS]?.text || "text-gray-800"}
                                      dark:bg-opacity-20 dark:text-opacity-90`}
                                    >
                                      {festival.region}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.date}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.duration}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.visitors ? festival.visitors.toLocaleString() : "k.A."}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {festival.instaFollowers ? festival.instaFollowers.toLocaleString() : "k.A."}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => openFestivalDetail(festival)}
                                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
                                    >
                                      Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                          <div className="flex-1 flex justify-between sm:hidden">
                            <button
                              onClick={prevPage}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                              Zurück
                            </button>
                            <button
                              onClick={nextPage}
                              disabled={currentPage === totalPages || totalPages === 0}
                              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                              Weiter
                            </button>
                          </div>
                          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-400">
                                Zeige <span className="font-medium">{filteredFestivals.length > 0 ? indexOfFirstItem + 1 : 0}</span> bis{" "}
                                <span className="font-medium">{Math.min(indexOfLastItem, filteredFestivals.length)}</span>{" "}
                                von <span className="font-medium">{filteredFestivals.length}</span> Ergebnissen
                              </p>
                            </div>
                            <div>
                              {totalPages > 0 && (
                              <nav
                                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                                aria-label="Pagination"
                              >
                                <button
                                  onClick={prevPage}
                                  disabled={currentPage === 1}
                                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                  aria-label="Vorherige Seite"
                                >
                                  <span className="sr-only">Zurück</span>
                                  <ChevronDown className="h-5 w-5 rotate-90" aria-hidden="true" />
                                </button>
                                {renderPaginationButtons()}
                                <button
                                  onClick={nextPage}
                                  disabled={currentPage === totalPages || totalPages === 0}
                                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                  <span className="sr-only">Weiter</span>
                                  <ChevronDown className="-rotate-90 h-5 w-5" aria-hidden="true" />
                                </button>
                              </nav>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Export-Button */}
                        {(eventTypeFilter === "festivals" || eventTypeFilter === "both") && filteredFestivals.length > 0 && (
                        <div className="p-4">
                          <button
                            onClick={exportToCSV}
                            className="bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-lg text-sm px-5 py-2.5"
                          >
                            <Download className="inline mr-2" size={16} />
                            Festivals als CSV exportieren
                          </button>
                        </div>
                        )}
                      </div>
                    ) : (
                       !isLoading && <p className="text-center p-6 text-gray-500 dark:text-gray-400">Keine Festivals für die aktuellen Filter gefunden.</p>
                    )}
                  </div>
                )}

                {(eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") && (
                  <div className={`mt-8 ${eventTypeFilter === "both" ? "pt-8 border-t border-gray-200 dark:border-gray-700" : ""}`}>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Stadtfeste</h2>
                    {isLoadingCityFestivals ? (
                      <p className="text-center p-6 text-gray-500 dark:text-gray-400">Lade Stadtfest-Daten...</p>
                    ) : filteredCityFestivals.length > 0 ? (
                      <CityFestivalTable cityFestivals={filteredCityFestivals} />
                    ) : (
                      <p className="text-center p-6 text-gray-500 dark:text-gray-400">Keine Stadtfeste für die aktuellen Filter gefunden.</p>
                    )}
                    {/* TODO: Pagination und Export für Stadtfeste können hier später hinzugefügt werden */}
                  </div>
                )}
                
                {/* Fallback message if no specific data type is shown and lists are empty */}
                {eventTypeFilter !== "both" &&
                  ((eventTypeFilter === "festivals" && filteredFestivals.length === 0 && !isLoading && !isFiltering) ||
                  (eventTypeFilter === "cityFestivals" && filteredCityFestivals.length === 0 && !isLoadingCityFestivals)) && (
                  <p className="text-center p-6 text-gray-500 dark:text-gray-400">Keine Events für die aktuelle Auswahl und Filter gefunden.</p>
                )}

              </div>
            ) : view === "map" ? (
              <div className="p-0 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 transition-colors duration-300">
                <div className="p-4"> {/* Container for button */}
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className="mb-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {showHeatmap ? "Heatmap ausblenden" : "Heatmap anzeigen"}
                  </button>
                  {showHeatmap && (
                    <div className="mt-2 mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Heatmap-Typ:</span>
                      <label className="inline-flex items-center mr-3">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-red-500"
                          name="heatmapMode"
                          value="density"
                          checked={heatmapMode === "density"}
                          onChange={() => setHeatmapMode("density")}
                        />
                        <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">Dichte</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-4 w-4 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-red-500"
                          name="heatmapMode"
                          value="visitors"
                          checked={heatmapMode === "visitors"}
                          onChange={() => setHeatmapMode("visitors")}
                        />
                        <span className="ml-1 text-sm text-gray-700 dark:text-gray-300">Besucher</span>
                      </label>
                    </div>
                  )}
                </div>
                { ( (!isLoading && (eventTypeFilter === "festivals" || eventTypeFilter === "both")) || 
                    (!isLoadingCityFestivals && (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both")) ) && 
                  (filteredFestivals.length > 0 || filteredCityFestivals.length > 0) ? (
                  <EventsMap
                    festivals={filteredFestivals} 
                    cityFestivals={filteredCityFestivals} 
                    eventTypeFilter={eventTypeFilter} 
                    showHeatmap={showHeatmap}
                    heatmapMode={heatmapMode} {/* Neue Prop */}
                  />
                ) : (
                  <p className="text-center p-10">
                    { isLoading || isLoadingCityFestivals ? "Karten-Daten werden geladen..." : "Keine Events mit Koordinaten für die Kartenansicht verfügbar für die aktuelle Auswahl."}
                  </p>
                )}
              </div>
            ) : view === "calendar" ? (
              <div className="p-6 bg-white dark:bg-gray-800 transition-colors duration-300">
                <FestivalCalendar
                  festivals={filteredFestivals} // Calendar currently only shows general festivals
                  onSelectFestival={openFestivalDetail}
                  currentMonth={currentMonth}
                  onMonthChange={handleCalendarMonthChange}
                />
              </div>
            ) : view === "salesreps" ? (
              <div className="p-6 bg-white dark:bg-gray-800 transition-colors duration-300">
                <SalesRepOverview
                  salesReps={salesReps}
                  eventsPerSalesRep={eventsPerSalesRep} // Renamed prop
                  onSelectSalesRep={(rep) => {
                    setSelectedSalesRep(rep)
                    setView("table")
                    showNotification({
                      type: "success",
                      title: "Vertriebsmitarbeiter ausgewählt",
                      message: `Festivals für Mitarbeiter ${rep.id} werden angezeigt.`,
                      duration: 3000,
                    })
                  }}
                />
              </div>
            ) : (
              /* Statistiken-Ansicht */
              <div className="p-6 bg-white dark:bg-gray-800 transition-colors duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Festivals nach Region */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/30">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Festivals nach Region</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.regionDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            labelLine={true}
                            label={({ name, value }) => `${name}: ${value}`}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.regionDistribution.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} Festivals`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Festivals nach Monat */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/30">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Festivals nach Monat</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e5e7eb"} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: theme === "dark" ? "#9ca3af" : "#4b5563" }}
                          />
                          <YAxis tick={{ fill: theme === "dark" ? "#9ca3af" : "#4b5563" }} />
                          <Tooltip
                            formatter={(value) => [`${value} Festivals`]}
                            labelFormatter={(label) => `Monat: ${label}`}
                            contentStyle={{
                              backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                              borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                            }}
                            itemStyle={{ color: theme === "dark" ? "#e5e7eb" : "#1f2937" }}
                          />
                          <Bar dataKey="festivals" name="Festivals" fill={theme === "dark" ? "#ef4444" : "#B01E28"} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Zusammenfassung */}
                <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/10 rounded-lg shadow dark:shadow-gray-900/30 transition-colors duration-300">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Zusammenfassung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow dark:shadow-gray-900/30">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                          <Calendar size={20} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Festivals gesamt</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {filteredFestivals.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow dark:shadow-gray-900/30">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                          <Users size={20} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Durchschn. Besucher</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.averageVisitors.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow dark:shadow-gray-900/30">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                          <Instagram size={20} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Durchschn. Follower</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {filteredFestivals.length > 0
                              ? Math.round(
                                  filteredFestivals.reduce((sum, festival) => sum + festival.instaFollowers, 0) /
                                    filteredFestivals.length,
                                ).toLocaleString()
                              : "0"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow dark:shadow-gray-900/30">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                          <Music size={20} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Häufigstes Genre</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {stats.genreDistribution.length > 0 ? stats.genreDistribution[0].name : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            © 2025 Waldemar Behn GmbH | Festival-Vertriebstool | {festivals.length} Festivals in der Datenbank | Daten
            zuletzt aktualisiert: 15.04.2025
          </div>
        </div>

        {/* Festival-Detail-Modal */}
        {showDetailModal && selectedFestival && (
          <div
            className="fixed inset-0 overflow-y-auto z-50"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
                aria-hidden="true"
                onClick={closeDetailModal}
              ></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                    onClick={closeDetailModal}
                    aria-label="Schließen"
                  >
                    <span className="sr-only">Schließen</span>
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                          {selectedFestival.name}
                        </h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleFavorite(selectedFestival.id)}
                            className={`text-gray-400 hover:text-yellow-500 ${
                              isFavorite(selectedFestival.id) ? "text-yellow-500" : ""
                            }`}
                            aria-label={
                              isFavorite(selectedFestival.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
                            }
                          >
                            {isFavorite(selectedFestival.id) ? <Bookmark size={18} /> : <BookmarkPlus size={18} />}
                          </button>
                          <button
                            onClick={() => shareFestival(selectedFestival)}
                            className="text-gray-400 hover:text-blue-500"
                            aria-label="Festival teilen"
                          >
                            <Share2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="flex items-center">
                          <Map className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Ort:</span> {selectedFestival.location}
                            {selectedFestival.plz && <span>, {selectedFestival.plz}</span>}
                            <span
                              className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${REGION_COLORS[selectedFestival.region as keyof typeof REGION_COLORS]?.bg || "bg-gray-100"} 
                              ${REGION_COLORS[selectedFestival.region as keyof typeof REGION_COLORS]?.text || "text-gray-800"}
                              dark:bg-opacity-20 dark:text-opacity-90`}
                            >
                              {selectedFestival.region}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Datum:</span> {selectedFestival.date || "k.A."}
                            <span className="ml-1">
                              ({selectedFestival.duration} {selectedFestival.duration === 1 ? "Tag" : "Tage"})
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center">
                          <Music className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
                          <div className="flex flex-col">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Festival-Typ:</span>
                              <span
                                className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${
                                  selectedFestival.festivalType === "Rock/Metal"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                    : selectedFestival.festivalType === "Electronic"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                                      : selectedFestival.festivalType === "Hip-Hop"
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                                        : selectedFestival.festivalType === "Pop"
                                          ? "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300"
                                          : selectedFestival.festivalType === "Jazz/Blues"
                                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                            : selectedFestival.festivalType === "Folk/World"
                                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                              : selectedFestival.festivalType === "Classical"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                                : selectedFestival.festivalType === "Reggae/Ska"
                                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                                                  : selectedFestival.festivalType === "Schlager"
                                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {selectedFestival.festivalType}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Users className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Besucher:</span>{" "}
                            {selectedFestival.visitors ? selectedFestival.visitors.toLocaleString() : "k.A."}
                          </p>
                        </div>

                        <div className="flex items-center">
                          <Instagram className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Instagram-Follower:</span>{" "}
                            {selectedFestival.instaFollowers
                              ? selectedFestival.instaFollowers.toLocaleString()
                              : "k.A."}
                            {selectedFestival.instaFollowers > 0 && (
                              <span className="ml-2 text-xs text-red-500 dark:text-red-400">
                                (Potenzielle Reichweite für Marketingaktionen)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-start">
                          <Info className="text-gray-400 dark:text-gray-500 mr-2 mt-1" size={18} />
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Beschreibung:</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedFestival.description}</p>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Website/Instagram:</p>
                              <p className="text-sm text-red-600 dark:text-red-400 break-all">
                                {selectedFestival.website || "k.A."}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kontakt:</p>
                              <p className="text-sm text-red-600 dark:text-red-400 break-all">
                                {selectedFestival.contact || "k.A."}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Vertriebspotenzial für Behn Spirituosen:
                          </p>
                          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {selectedFestival.visitors > 0
                                ? selectedFestival.visitors > 10000
                                  ? `Hohes Potenzial: Großes Festival mit ${selectedFestival.visitors.toLocaleString()} Besuchern. Ideal für Behn Spirituosen-Präsenz.`
                                  : selectedFestival.visitors > 1000
                                    ? `Mittleres Potenzial: Mittelgroßes Festival mit ${selectedFestival.visitors.toLocaleString()} Besuchern. Gute Möglichkeit für Behn Produkte.`
                                    : `Geringes Potenzial: Kleineres Festival mit ${selectedFestival.visitors.toLocaleString()} Besuchern. Selektive Behn Produkt-Platzierung empfohlen.`
                                : "Potenzial nicht einschätzbar: Keine Besucherangaben verfügbar."}
                              {selectedFestival.instaFollowers > 10000 &&
                                " Gute Social-Media-Präsenz für Marketing-Kooperationen mit Behn Marken."}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              <span className="font-medium">Empfohlene Maßnahmen:</span>
                              {selectedFestival.visitors > 10000
                                ? " Sponsoring-Paket mit Behn Produktplatzierung und Verkaufsstand anbieten."
                                : selectedFestival.visitors > 1000
                                  ? " Verkaufsstand oder Produktplatzierung in VIP-Bereichen für Behn Spirituosen."
                                  : " Lokale Produktsample-Aktionen oder kleine Sponsoring-Pakete für ausgewählte Behn Marken."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-700 text-base font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={closeDetailModal}
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hilfe-Modal */}
        {showHelpModal && (
          <div
            className="fixed inset-0 overflow-y-auto z-50"
            aria-labelledby="help-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
                aria-hidden="true"
                onClick={() => setShowHelpModal(false)}
              ></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                    onClick={() => setShowHelpModal(false)}
                    aria-label="Schließen"
                  >
                    <span className="sr-only">Schließen</span>
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                      <HelpCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3
                        className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                        id="help-modal-title"
                      >
                        Hilfe & Tastenkürzel
                      </h3>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Dieses Dashboard bietet verschiedene Funktionen zur Analyse und Verwaltung von Festivals.
                        </p>

                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Tastenkürzel</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                          <ul className="space-y-2">
                            {KEYBOARD_SHORTCUTS.map((shortcut) => (
                              <li key={shortcut.key} className="flex justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-gray-700 dark:text-gray-300 font-mono text-xs">
                                  {shortcut.key}
                                </kbd>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Ansichten</h4>
                        <ul className="list-disc pl-5 mb-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <li>
                            <strong>Tabelle:</strong> Zeigt alle Festivals in einer sortierbaren Tabelle an.
                          </li>
                          <li>
                            <strong>Kalender:</strong> Visualisiert Festivals nach Datum in einer Kalenderansicht.
                          </li>
                          <li>
                            <strong>Statistiken:</strong> Zeigt Diagramme und Kennzahlen zu den Festivals an.
                          </li>
                        </ul>

                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Filter</h4>
                        <ul className="list-disc pl-5 mb-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <li>
                            <strong>Region:</strong> Filtert Festivals nach geografischer Region.
                          </li>
                          <li>
                            <strong>Monat:</strong> Zeigt nur Festivals in einem bestimmten Monat an.
                          </li>
                          <li>
                            <strong>Genre:</strong> Filtert nach Musikgenre.
                          </li>
                          <li>
                            <strong>Besuchergröße:</strong> Filtert nach Anzahl der Besucher.
                          </li>
                          <li>
                            <strong>Umkreissuche:</strong> Findet Festivals in der Nähe einer bestimmten Stadt.
                          </li>
                        </ul>

                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Funktionen</h4>
                        <ul className="list-disc pl-5 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <li>
                            <strong>Favoriten:</strong> Markieren Sie Festivals als Favoriten, um sie später leicht
                            wiederzufinden.
                          </li>
                          <li>
                            <strong>Teilen:</strong> Teilen Sie Festivalinformationen mit Kollegen.
                          </li>
                          <li>
                            <strong>Export:</strong> Exportieren Sie die gefilterten Daten als CSV-Datei.
                          </li>
                          <li>
                            <strong>Dark Mode:</strong> Wechseln Sie zwischen hellem und dunklem Design.
                          </li>
                          <li>
                            <strong>Vollbildmodus:</strong> Maximieren Sie das Dashboard für bessere Übersicht.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-700 text-base font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowHelpModal(false)}
                  >
                    Verstanden
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teilen-Modal */}
        {showShareModal && selectedFestival && (
          <div
            className="fixed inset-0 overflow-y-auto z-50"
            aria-labelledby="share-modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
                aria-hidden="true"
                onClick={() => setShowShareModal(false)}
              ></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                    onClick={() => setShowShareModal(false)}
                    aria-label="Schließen"
                  >
                    <span className="sr-only">Schließen</span>
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
                      <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3
                        className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                        id="share-modal-title"
                      >
                        Festival teilen
                      </h3>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Teilen Sie Informationen über {selectedFestival.name} mit Ihren Kollegen.
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Festivalinformationen:</p>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            <p>
                              <strong>Name:</strong> {selectedFestival.name}
                            </p>
                            <p>
                              <strong>Ort:</strong> {selectedFestival.location}
                            </p>
                            <p>
                              <strong>Datum:</strong> {selectedFestival.date}
                            </p>
                            <p>
                              <strong>Genre:</strong> {selectedFestival.genre}
                            </p>
                            <p>
                              <strong>Besucher:</strong> {selectedFestival.visitors.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label
                            htmlFor="share-email"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Per E-Mail teilen:
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                              type="email"
                              name="email"
                              id="share-email"
                              className="focus:ring-red-500 focus:border-red-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                              placeholder="email@beispiel.de"
                            />
                            <button
                              type="button"
                              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400"
                            >
                              Senden
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label
                            htmlFor="share-link"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Link kopieren:
                          </label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                              type="text"
                              name="link"
                              id="share-link"
                              className="focus:ring-red-500 focus:border-red-500 flex-1 block w-full rounded-md sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                              value={`https://festival-dashboard.vercel.app/festival/${selectedFestival.id}`}
                              readOnly
                            />
                            <button
                              type="button"
                              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `https://festival-dashboard.vercel.app/festival/${selectedFestival.id}`,
                                )
                                showNotification({
                                  type: "success",
                                  title: "Link kopiert",
                                  message: "Der Link wurde in die Zwischenablage kopiert.",
                                  duration: 3000,
                                })
                              }}
                            >
                              Kopieren
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-700 text-base font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowShareModal(false)}
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default FestivalDashboard
