import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App, { AUTO_REFRESH_MS } from './App';
import { generateMockWeatherData } from './utils/mockData';

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({
    success: true,
    data: { hourly: generateMockWeatherData().hourly },
    fetched_at: new Date().toISOString(),
  }),
});

describe('App (smoke)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('renders the hero, departures board, outlook and day sections', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    render(<App />);
    expect(await screen.findByText('Departures')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tempelhofer/i);
    expect(screen.getByText('7-Day Outlook')).toBeInTheDocument();
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByText(/Show 3 more days/)).toBeInTheDocument();
  });

  it('switches activity and remembers it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    render(<App />);
    await screen.findByText('Departures');
    fireEvent.click(screen.getByRole('button', { name: /kiting/i }));
    expect(screen.getByText(/Kiting forecast for Berlin/)).toBeInTheDocument();
    expect(window.localStorage.getItem('thf.activity')).toBe('kiting');
  });

  it('opens the detail sheet with a breakdown and closes it on Escape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    render(<App />);
    await screen.findByText('Departures');
    const departures = screen.getByText('Departures').closest('section')!;
    fireEvent.click(within(departures).getAllByRole('button')[0]!);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/What.s holding it back/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves focus into the detail sheet, locks page scroll and restores both on close', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    render(<App />);
    await screen.findByText('Departures');
    const departures = screen.getByText('Departures').closest('section')!;
    const opener = within(departures).getAllByRole('button')[0]!;
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    // Tab from the last control wraps to the first instead of leaving the sheet
    const close = within(dialog).getByRole('button', { name: 'Close' });
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.click(close);
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });

  it('refetches a stale forecast when the tab becomes visible again', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByText('Departures');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Coming back right away: nothing to do
    fireEvent(document, new Event('visibilitychange'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(realNow + AUTO_REFRESH_MS + 1000);
    try {
      fireEvent(document, new Event('visibilitychange'));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
    await screen.findByText('Departures');
  });

  it('in production shows an error card instead of fake data when the API fails', async () => {
    vi.stubEnv('DEV', false);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ success: false }) })));
    render(<App />);
    expect(await screen.findByText(/Couldn.t load the forecast/)).toBeInTheDocument();
    expect(screen.queryByText('Mock Data:')).not.toBeInTheDocument();
  });
});
