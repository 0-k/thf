import React from 'react';
import Runway from './Runway';

export default function Footer({ usingMockData, airQualityAvailable }: { usingMockData: boolean; airQualityAvailable: boolean }): React.ReactElement {
  return (
    <footer className="rounded-3xl bg-slate-900 text-slate-300 overflow-hidden">
      <Runway className="bg-slate-950/60" />
      <div className="px-5 sm:px-6 py-5 grid gap-4 sm:grid-cols-[1fr_auto] text-sm">
        <div className="space-y-1.5">
          <p className="font-display text-xl font-bold uppercase tracking-wide text-white">Tempelhofer Feld Forecast</p>
          <p className="text-slate-400">
            {usingMockData
              ? 'Showing simulated weather (development mode).'
              : `Weather by Open-Meteo (DWD ICON model)${airQualityAvailable ? ', air quality by CAMS Europe via Open-Meteo' : ''}.`}
            {' '}Crowd model calibrated to Grün Berlin&apos;s visitor monitoring.
          </p>
          <p className="text-xs text-slate-500">
            Unofficial fan project, not affiliated with Grün Berlin or the Tempelhofer Feld administration. Opening
            hours are approximate; check the official site before a late visit.
          </p>
        </div>
        <div className="flex sm:flex-col gap-3 sm:items-end text-xs">
          <a className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
          <a className="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline" href="https://www.tempelhoferfeld.de" target="_blank" rel="noreferrer">tempelhoferfeld.de</a>
        </div>
      </div>
    </footer>
  );
}
