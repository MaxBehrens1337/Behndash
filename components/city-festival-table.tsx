"use client"; 

import type React from "react";

// TODO: Später aus einer zentralen Typdatei importieren
interface CityFestival {
  id: number;
  bundesland: string;
  stadt: string;
  festName: string;
  plz: string;
  datumRaw: string;
  besucher: number;
  anmerkungen: string;
  lat: number | null;
  lon: number | null;
  monat: number;
  region: string;
  beschreibung: string;
  eventType: string;
}

interface CityFestivalTableProps {
  cityFestivals: CityFestival[];
}

const CityFestivalTable: React.FC<CityFestivalTableProps> = ({ cityFestivals }) => {
  if (!cityFestivals || cityFestivals.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">Keine Stadtfest-Daten verfügbar.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Festname</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stadt</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PLZ</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bundesland</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Datum</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Besucher</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Region</th>
            {/* Weitere Spalten können später hinzugefügt werden */}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {cityFestivals.map((festival) => (
            <tr key={festival.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{festival.festName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.stadt}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.plz}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.bundesland}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.datumRaw}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.besucher ? festival.besucher.toLocaleString() : 'k.A.'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{festival.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CityFestivalTable;
