"use client"

import { Users, MapPin } from "lucide-react"

import type { SalesRepresentative } from "@/utils/sales-rep-data"

interface SalesRepOverviewProps {
  salesReps: SalesRepresentative[]
  eventsPerSalesRep: Record<string, number> // Prop umbenannt
  onSelectSalesRep: (rep: SalesRepresentative) => void
}

export function SalesRepOverview({ salesReps, eventsPerSalesRep, onSelectSalesRep }: SalesRepOverviewProps) { // Prop umbenannt
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Vertriebsmitarbeiter-Übersicht</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">{salesReps.length} Mitarbeiter verfügbar</div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Mitarbeiter-ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                PLZ-Bereiche
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Events {/* Text geändert */}
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Auswählen</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {salesReps
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((rep) => (
                <tr key={rep.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {rep.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {rep.plzAreas.length}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {eventsPerSalesRep[rep.id] || 0} {/* Prop umbenannt */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onSelectSalesRep(rep)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
                    >
                      Auswählen
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
          <p>Wählen Sie einen Mitarbeiter aus, um nur die Festivals in dessen PLZ-Bereichen anzuzeigen.</p>
        </div>
      </div>
    </div>
  )
}
