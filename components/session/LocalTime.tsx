'use client';

// Shows a date/time in the viewer's own time zone. Server components render on
// Vercel in UTC, so formatting there shows the wrong hour (and sometimes the
// wrong day). This renders nothing on the server and the formatted text once
// the browser takes over; useSyncExternalStore gives the server value during
// hydration, so there is no hydration mismatch.

import { useSyncExternalStore } from 'react';

import styles from './LocalTime.module.css';

export type LocalTimeFormat = 'long-date' | 'short-date' | 'time' | 'time-with-new-day';

interface LocalTimeProps {
  iso: string;
  format: LocalTimeFormat;
  /** For 'time-with-new-day': the previous message's time. The date is added when the day changes, or when there is no previous time. */
  previousIso?: string | null;
}

const subscribe = () => () => {};

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLocal(iso: string, format: LocalTimeFormat, previousIso?: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const longDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  switch (format) {
    case 'long-date':
      return longDate;
    case 'short-date':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'time':
      return time;
    case 'time-with-new-day': {
      const previous = previousIso ? new Date(previousIso) : null;
      const newDay = !previous || Number.isNaN(previous.getTime()) || !sameLocalDay(previous, date);
      return newDay ? `${longDate} · ${time}` : time;
    }
  }
}

export default function LocalTime({ iso, format, previousIso }: LocalTimeProps) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <time dateTime={iso} className={styles.time}>
      {isClient ? formatLocal(iso, format, previousIso) : ''}
    </time>
  );
}
