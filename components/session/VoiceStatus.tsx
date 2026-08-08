'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import styles from './VoiceStatus.module.css';

type MicState = 'inactive' | 'requesting' | 'active' | 'denied';

const STATE_CONFIG: Record<MicState, { label: string; color: string }> = {
  inactive: { label: 'Voice Inactive', color: '#6a6560' },
  requesting: { label: 'Requesting Mic…', color: '#c8873a' },
  active: { label: 'Voice Active', color: '#4a9a5a' },
  denied: { label: 'Mic Access Denied', color: '#b02020' },
};

// Browser-mic presence indicator only — no audio is captured, recorded, or sent
// anywhere. Speech-to-text (transcription) is a separate, not-yet-built feature.
export default function VoiceStatus() {
  const [state, setState] = useState<MicState>('inactive');
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const handleToggle = useCallback(async () => {
    if (state === 'active') {
      stopStream();
      setState('inactive');
      return;
    }

    setState('requesting');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setState('active');
    } catch {
      setState('denied');
    }
  }, [state, stopStream]);

  const config = STATE_CONFIG[state];

  return (
    <button
      type="button"
      className={styles.voiceStatus}
      onClick={() => void handleToggle()}
      disabled={state === 'requesting'}
      aria-pressed={state === 'active'}
      aria-label={state === 'active' ? 'Turn off microphone' : 'Turn on microphone'}
    >
      <span className={styles.statusRow}>
        <span className={styles.dot} style={{ backgroundColor: config.color }} />
        {config.label}
        {state === 'active' ? (
          <Mic size={12} className={styles.icon} />
        ) : (
          <MicOff size={12} className={styles.icon} />
        )}
      </span>
    </button>
  );
}
