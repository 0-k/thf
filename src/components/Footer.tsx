import React from 'react';
import Runway from './Runway';

export default function Footer({ usingMockData, airQualityAvailable }: { usingMockData: boolean; airQualityAvailable: boolean }): React.ReactElement {
  return (
    <footer className="bg-tarmac text-white">
      <Runway left="09R" right="27L" />
      <div className="px-5 sm:px-6 py-5 grid gap-4 sm:grid-cols-[1fr_auto] text-sm">
        <div className="space-y-1.5">
          <p className="font-display text-xl font-black uppercase [font-stretch:110%]">Tempelhofer Feld Forecast</p>
          <p className="text-white/85">
            {usingMockData
              ? 'Showing simulated weather (development mode).'
              : `Weather by Open-Meteo (DWD ICON model)${airQualityAvailable ? ', air quality by CAMS Europe via Open-Meteo' : ''}.`}
            {' '}Crowd model calibrated to Grün Berlin&apos;s visitor monitoring.
          </p>
          <p className="text-xs text-white/70">
            Unofficial fan project, not affiliated with Grün Berlin or the Tempelhofer Feld administration. Opening
            hours are approximate; check the official site before a late visit.
          </p>
        </div>
        <div className="flex sm:flex-col gap-3 sm:items-end text-xs">
          <a className="text-sock underline underline-offset-2 hover:text-white" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
          <a className="text-sock underline underline-offset-2 hover:text-white" href="https://www.tempelhoferfeld.de" target="_blank" rel="noreferrer">tempelhoferfeld.de</a>
        </div>
      </div>
    </footer>
  );
}
