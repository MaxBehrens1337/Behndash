"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarIcon, Info, X } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"

import type { CityFestival } from './festival-dashboard'; // Import CityFestival type

// Typen für die Festivals und Props
interface Festival { // Existing Festival type
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

// Combined event type for calendar
type CalendarEvent = 
  | (Festival & { eventType: 'festival' }) 
  | (CityFestival & { eventType: 'cityFestival' });


interface FestivalCalendarProps {
  festivals: Festival[];
  cityFestivals: CityFestival[]; // Added prop
  eventTypeFilter: "festivals" | "cityFestivals" | "both"; // Added prop
  onSelectFestival: (festival: Festival) => void; // Can be adapted later if needed for city festivals
  currentMonth: number;
  onMonthChange: (month: number) => void;
}

// Hilfsfunktion zum Extrahieren des Tages aus einem Datumsstring
const extractDayFromDate = (dateStr: string | undefined): number | null => { // Made dateStr optional
  if (!dateStr || dateStr.toLowerCase() === "k.a." || dateStr.toLowerCase().includes("t.b.a") || dateStr.toLowerCase().includes("abgesagt") || dateStr.toLowerCase().includes("noch nicht bekannt")) {
    return null
  }

  // Wenn es ein Datumsbereich ist, nehmen wir den ersten Tag
  let processedDateStr = dateStr;
  if (processedDateStr.includes("–") || processedDateStr.includes("-")) {
    processedDateStr = processedDateStr.split(/[–-]/)[0].trim()
  }

  // Versuche, ein Muster wie DD.MM.YYYY zu finden
  let match = processedDateStr.match(/(\d{1,2})\.\d{1,2}\.\d{4}/)
  if (match && match[1]) {
    return Number.parseInt(match[1], 10)
  }

  // Versuche, ein Muster wie DD.MM zu finden
  match = processedDateStr.match(/(\d{1,2})\.\d{1,2}/)
  if (match && match[1]) {
    return Number.parseInt(match[1], 10)
  }
  
  // Versuche, nur den Tag zu extrahieren, wenn es nur eine Zahl ist (z.B. "15" aus "15. Juli")
  match = processedDateStr.match(/^(\d{1,2})/);
    if (match && match[1]) {
        return Number.parseInt(match[1], 10);
    }

  return null
}

const FestivalCalendar: React.FC<FestivalCalendarProps> = ({
  festivals,
  cityFestivals, // Destructure new prop
  eventTypeFilter, // Destructure new prop
  onSelectFestival,
  currentMonth,
  onMonthChange,
}) => {
  const { theme } = useTheme()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(currentMonth)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)

  // Synchronisiere den lokalen Monat mit dem übergebenen currentMonth
  useEffect(() => {
    setMonth(currentMonth)
  }, [currentMonth])

  // Berechne die Tage im aktuellen Monat
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate()
  }, [year, month])

  // Berechne den Wochentag des ersten Tags im Monat (0 = Sonntag, 1 = Montag, ...)
  const firstDayOfMonth = useMemo(() => {
    return new Date(year, month - 1, 1).getDay()
  }, [year, month])

  // Gruppiere Events nach Tag
  const eventsByDay = useMemo(() => {
    const result: { [key: number]: CalendarEvent[] } = {};

    for (let i = 1; i <= daysInMonth; i++) {
      result[i] = [];
    }

    if (eventTypeFilter === "festivals" || eventTypeFilter === "both") {
      festivals
        .filter((festival) => festival.month === month)
        .forEach((festival) => {
          const day = extractDayFromDate(festival.date);
          if (day !== null && day >= 1 && day <= daysInMonth) {
            result[day].push({ ...festival, eventType: 'festival' });
          }
        });
    }

    if (eventTypeFilter === "cityFestivals" || eventTypeFilter === "both") {
      cityFestivals
        .filter((cityFestival) => cityFestival.monat === month) // Use 'monat' for city festivals
        .forEach((cityFestival) => {
          const day = extractDayFromDate(cityFestival.datumRaw); // Use 'datumRaw' for city festivals
          if (day !== null && day >= 1 && day <= daysInMonth) {
            result[day].push({ ...cityFestival, eventType: 'cityFestival' });
          }
        });
    }
    return result;
  }, [festivals, cityFestivals, eventTypeFilter, month, daysInMonth]);

  // Berechne die maximale Anzahl von Events an einem Tag für die Farbintensität
  const maxEventsPerDay = useMemo(() => {
    return Math.max(1, ...Object.values(eventsByDay).map((events) => events.length));
  }, [eventsByDay]);

  // Navigiere zum vorherigen Monat
  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
      onMonthChange(12)
    } else {
      setMonth(month - 1)
      onMonthChange(month - 1)
    }
  }

  // Navigiere zum nächsten Monat
  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
      onMonthChange(1)
    } else {
      setMonth(month + 1)
      onMonthChange(month + 1)
    }
  }

  // Navigiere zum aktuellen Monat
  const goToCurrentMonth = () => {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
    onMonthChange(today.getMonth() + 1)
  }

  // Berechne die Hintergrundfarbe basierend auf der Anzahl der Events
  const getBackgroundColor = (day: number) => {
    const count = eventsByDay[day]?.length || 0;
    if (count === 0) return theme === "dark" ? "bg-gray-800" : "bg-white";

    const intensity = Math.min(900, Math.floor((count / maxEventsPerDay) * 900));
    const colorIntensity = Math.max(50, Math.min(900, 50 + intensity));
    
    // Unterscheide Farbe leicht, wenn nur Stadtfeste angezeigt werden sollen
    if (eventTypeFilter === "cityFestivals" && count > 0) {
      return theme === "dark" ? `bg-blue-${colorIntensity}/20` : `bg-blue-${colorIntensity}/20`;
    }
    return theme === "dark" ? `bg-red-${colorIntensity}/20` : `bg-red-${colorIntensity}/20`;
  }

  // Berechne die Textfarbe basierend auf der Hintergrundfarbe
  const getTextColor = (day: number) => {
    const count = eventsByDay[day]?.length || 0;
    if (count === 0) return theme === "dark" ? "text-gray-400" : "text-gray-500";

    const intensity = Math.min(900, Math.floor((count / maxEventsPerDay) * 900));
    // Ab einer bestimmten Intensität wechseln wir zu weißem Text
    return theme === "dark"
      ? intensity > 300
        ? "text-red-300"
        : "text-gray-200"
      : intensity > 300
        ? "text-red-800"
        : "text-gray-900"
  }

  // Öffne das Modal für einen bestimmten Tag
  const openDayModal = (day: number) => {
    setSelectedDay(day)
    setShowDayModal(true)
  }

  // Schließe das Modal
  const closeDayModal = () => {
    setShowDayModal(false)
    setSelectedDay(null)
  }

  // Generiere die Wochentagsüberschriften
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

  // Generiere die Kalender-Grid-Zellen
  const renderCalendarCells = () => {
    const cells = []

    // Leere Zellen für die Tage vor dem ersten Tag des Monats
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="h-24 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        ></div>,
      )
    }

    // Zellen für die Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      const eventsForDay = eventsByDay[day] || [];
      
      cells.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 dark:border-gray-700 p-1 transition-colors relative ${getBackgroundColor(day)} hover:bg-opacity-30 cursor-pointer`}
          onClick={() => eventsForDay.length > 0 && openDayModal(day)}
          onMouseEnter={() => setHoveredDay(day)}
          onMouseLeave={() => setHoveredDay(null)}
        >
          <div className={`text-right font-semibold ${getTextColor(day)}`}>{day}</div>

          <div className="mt-1 overflow-hidden">
            {eventsForDay.length > 0 ? (
              <>
                <div
                  key={`${eventsForDay[0].eventType}-${eventsForDay[0].id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (eventsForDay[0].eventType === 'festival') {
                      onSelectFestival(eventsForDay[0] as Festival);
                    } else {
                      alert(`Stadtfest: ${(eventsForDay[0] as CityFestival).festName}\nOrt: ${(eventsForDay[0] as CityFestival).stadt}`);
                    }
                  }}
                  className={`text-xs truncate mb-1 p-1 rounded cursor-pointer hover:opacity-80
                    ${eventsForDay[0].eventType === 'festival' 
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' 
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'}`}
                  title={eventsForDay[0].eventType === 'festival' ? (eventsForDay[0] as Festival).name : (eventsForDay[0] as CityFestival).festName}
                >
                  {eventsForDay[0].eventType === 'festival' ? (eventsForDay[0] as Festival).name : (eventsForDay[0] as CityFestival).festName}
                </div>

                {eventsForDay.length > 1 && (
                  <div
                    className={`text-xs text-center p-1 rounded cursor-pointer hover:opacity-80 text-white
                      ${eventTypeFilter === 'cityFestivals' && eventsForDay.every(e => e.eventType === 'cityFestival') 
                        ? 'bg-blue-600 dark:bg-blue-700' 
                        : 'bg-red-600 dark:bg-red-700'}`}
                    onClick={(e) => { e.stopPropagation(); openDayModal(day); }}
                  >
                    +{eventsForDay.length - 1} weitere
                  </div>
                )}
              </>
            ) : null}
          </div>

          {hoveredDay === day && eventsForDay.length > 0 && (
            <div className="absolute z-10 left-full top-0 ml-2 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/30 rounded-md border border-gray-200 dark:border-gray-700 p-2 w-64">
              <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">
                {day}. Tag - {eventsForDay.length} Event{eventsForDay.length > 1 ? 's' : ''}
              </div>
              <div className="max-h-48 overflow-y-auto">
                {eventsForDay.map((event) => (
                  <div
                    key={`${event.eventType}-${event.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (event.eventType === 'festival') {
                        onSelectFestival(event as Festival);
                      } else {
                        alert(`Stadtfest: ${(event as CityFestival).festName}\nOrt: ${(event as CityFestival).stadt}`);
                      }
                    }}
                    className={`text-sm p-1 hover:opacity-80 cursor-pointer rounded mb-1 
                      ${event.eventType === 'festival' 
                        ? 'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20' 
                        : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                  >
                    {event.eventType === 'festival' ? (event as Festival).name : (event as CityFestival).festName} 
                    <span className="text-xs opacity-70"> ({event.eventType === 'festival' ? (event as Festival).location : (event as CityFestival).stadt})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
      );
    }

    return cells
  }

  // Berechne die Gesamtzahl der Events im aktuellen Monat
  const totalEventsInMonth = useMemo(() => {
    return Object.values(eventsByDay).reduce((sum, events) => sum + events.length, 0);
  }, [eventsByDay]);

  const monthName = new Date(year, month - 1).toLocaleString("de-DE", { month: "long" })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      {/* Kalender-Header */}
      <div className="flex items-center justify-between p-4 bg-red-700 dark:bg-red-900 text-white rounded-t-lg transition-colors duration-300">
        <div className="flex items-center">
          <button
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-red-600 dark:hover:bg-red-800 transition-colors"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold flex items-center mx-2">
            <CalendarIcon className="mr-2" size={20} />
            {monthName} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-red-600 dark:hover:bg-red-800 transition-colors"
            aria-label="Nächster Monat"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm bg-red-800 dark:bg-red-950 px-3 py-1 rounded">{totalEventsInMonth} Event{totalEventsInMonth !== 1 ? 's' : ''}</div>
          <button
            onClick={goToCurrentMonth}
            className="text-sm bg-red-600 dark:bg-red-800 hover:bg-red-500 dark:hover:bg-red-700 px-3 py-1 rounded transition-colors"
          >
            Aktueller Monat
          </button>
        </div>
      </div>

      {/* Kalender-Legende */}
      <div className="bg-red-50 dark:bg-red-900/20 p-3 flex items-center text-sm border-b border-red-100 dark:border-red-900/30 transition-colors duration-300">
        <Info size={16} className="text-red-700 dark:text-red-400 mr-2" />
        <span className="text-gray-700 dark:text-gray-300">
          Die Intensität der Farbe zeigt die Anzahl der Festivals pro Tag. Klicken Sie auf einen Tag, um alle Festivals
          anzuzeigen.
        </span>
      </div>

      {/* Wochentagsüberschriften */}
      <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-800 transition-colors duration-300">
        {weekdays.map((day) => (
          <div key={day} className="py-2 text-center font-medium text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
      </div>

      {/* Kalender-Grid */}
      <div className="grid grid-cols-7">{renderCalendarCells()}</div>

      {/* Kalender-Footer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 rounded-b-lg border-t border-gray-200 dark:border-gray-600 transition-colors duration-300">
        Hinweis: Festivals ohne genaues Datum oder mit unvollständigen Datumsangaben werden möglicherweise nicht
        angezeigt.
      </div>

      {/* Modal für Tagesansicht */}
      {showDayModal && selectedDay !== null && (
        <div
          className="fixed inset-0 overflow-y-auto z-50"
          aria-labelledby="day-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={closeDayModal}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                  onClick={closeDayModal}
                  aria-label="Schließen"
                >
                  <span className="sr-only">Schließen</span>
                  <X size={20} />
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <CalendarIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="day-modal-title">
                      {selectedDay}. {monthName} {year}
                    </h3>
                    <div className="mt-4">
                      {festivalsByDay[selectedDay]?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                      {eventsByDay[selectedDay]?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {eventsByDay[selectedDay].length} Event{eventsByDay[selectedDay].length > 1 ? 's' : ''} an diesem Tag:
                          </p>
                          <div className="max-h-96 overflow-y-auto">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-600">
                              {eventsByDay[selectedDay].map((event) => (
                                <div
                                  key={`${event.eventType}-${event.id}`}
                                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                  onClick={() => {
                                    closeDayModal();
                                    if (event.eventType === 'festival') {
                                      onSelectFestival(event as Festival);
                                    } else {
                                      alert(`Stadtfest: ${(event as CityFestival).festName}\nOrt: ${(event as CityFestival).stadt}`);
                                    }
                                  }}
                                      >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {event.eventType === 'festival' ? (event as Festival).name : (event as CityFestival).festName}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {event.eventType === 'festival' ? (event as Festival).location : (event as CityFestival).stadt} 
                                        {event.plz && ` (${event.plz})`}
                                      </p>
                                    </div>
                                    <div>
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ event.eventType === 'festival' 
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' // Festival color
                                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' // CityFestival color
                                        }`}
                                      >
                                        {event.eventType === 'festival' ? (event as Festival).festivalType : (event as CityFestival).eventType}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      { (event.eventType === 'festival' && (event as Festival).visitors) 
                                        ? `${(event as Festival).visitors.toLocaleString()} Besucher` 
                                        : (event.eventType === 'cityFestival' && (event as CityFestival).besucher) 
                                          ? `${(event as CityFestival).besucher.toLocaleString()} Besucher` 
                                          : ""}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {event.eventType === 'festival' ? `${(event as Festival).duration} Tag(e)` : ""} {/* Duration might not apply to city festivals or needs new field */}
                                    </span>
                                  </div>
                                </div>
                              ))}
                                  </div>
                                </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Keine Events an diesem Tag gefunden.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-700 text-base font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeDayModal}
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FestivalCalendar
