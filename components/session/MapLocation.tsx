'use client';

// The party's place on the uploaded module's maps (campaigns.current_map_position),
// shown under Party Status so a wrong level or room is easy to spot. The Game
// Master sets it when the party moves (lib/mcp/tools/update-location.ts); the
// player can correct it here by picking the map and room, and the Game Master
// follows the saved position from its next reply. Hidden for campaigns whose
// uploads have no maps.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './MapLocation.module.css';

interface KnownMap {
  mapLabel: string;
  roomKeys: string[];
  fileName: string;
  pageNumber: number;
}

interface SavedPosition {
  mapLabel: string;
  roomKey: string;
  fileName: string;
  pageNumber: number;
}

interface MapLocationProps {
  campaignId: string;
  /** Changes after each Game Master reply, so a move made during the reply shows up. */
  refreshKey: number;
}

function mapId(map: Pick<KnownMap, 'fileName' | 'pageNumber' | 'mapLabel'>): string {
  return `${map.fileName}|${map.pageNumber}|${map.mapLabel}`;
}

export default function MapLocation({ campaignId, refreshKey }: MapLocationProps) {
  const [maps, setMaps] = useState<KnownMap[]>([]);
  const [position, setPosition] = useState<SavedPosition | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftMap, setDraftMap] = useState('');
  const [draftRoom, setDraftRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [{ data: overviewRows }, { data: campaign }] = await Promise.all([
        supabase
          .from('campaign_embeddings')
          .select('metadata')
          .eq('campaign_id', campaignId)
          .eq('source_type', 'user_pdf')
          .eq('metadata->>category', 'map_layout')
          .eq('metadata->>mapOverview', 'true'),
        supabase.from('campaigns').select('current_map_position').eq('id', campaignId).maybeSingle(),
      ]);
      if (cancelled) return;

      const known = ((overviewRows ?? []) as { metadata: Record<string, unknown> }[])
        .map(({ metadata: m }) =>
          typeof m.mapLabel === 'string' && typeof m.title === 'string'
            ? {
                mapLabel: m.mapLabel,
                roomKeys: Array.isArray(m.roomKeys) ? m.roomKeys.map(String) : [],
                fileName: m.title,
                pageNumber: Number(m.pageNumber),
              }
            : null
        )
        .filter((m): m is KnownMap => m !== null)
        .sort((a, b) => a.pageNumber - b.pageNumber);
      setMaps(known);

      const saved = campaign?.current_map_position as SavedPosition | null | undefined;
      setPosition(saved && typeof saved.mapLabel === 'string' && typeof saved.roomKey === 'string' ? saved : null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshKey]);

  if (maps.length === 0) return null;

  const startEditing = () => {
    const current = position ? maps.find((m) => mapId(m) === mapId(position)) : undefined;
    const map = current ?? maps[0];
    setDraftMap(mapId(map));
    setDraftRoom(current ? position!.roomKey : (map.roomKeys[0] ?? ''));
    setError('');
    setEditing(true);
  };

  const save = async (next: SavedPosition | null) => {
    setSaving(true);
    setError('');
    const value = next ? { ...next, updatedAt: new Date().toISOString() } : null;
    const { error: saveError } = await createClient()
      .from('campaigns')
      .update({ current_map_position: value })
      .eq('id', campaignId);
    setSaving(false);
    if (saveError) {
      setError('Could not save the location. Please try again.');
      return;
    }
    setPosition(next);
    setEditing(false);
  };

  const selectedMap = maps.find((m) => mapId(m) === draftMap);

  return (
    <div className={styles.mapLocation}>
      <div className={styles.sectionLabel}>Location</div>
      {!editing ? (
        <div className={styles.summaryRow}>
          <span className={styles.summary}>
            {position ? `${position.mapLabel} · Room ${position.roomKey}` : 'Not in a mapped room'}
          </span>
          <button type="button" className={styles.btnChange} onClick={startEditing}>
            Change
          </button>
        </div>
      ) : (
        <div className={styles.editor}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Map</span>
            <select
              className={styles.select}
              value={draftMap}
              onChange={(e) => {
                setDraftMap(e.target.value);
                const map = maps.find((m) => mapId(m) === e.target.value);
                setDraftRoom(map?.roomKeys[0] ?? '');
              }}
            >
              {maps.map((m) => (
                <option key={mapId(m)} value={mapId(m)}>
                  {m.mapLabel}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Room</span>
            <select className={styles.select} value={draftRoom} onChange={(e) => setDraftRoom(e.target.value)}>
              {(selectedMap?.roomKeys ?? []).map((key) => (
                <option key={key} value={key}>
                  Room {key}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSave}
              disabled={saving || !selectedMap || !draftRoom}
              onClick={() =>
                selectedMap &&
                void save({
                  mapLabel: selectedMap.mapLabel,
                  roomKey: draftRoom,
                  fileName: selectedMap.fileName,
                  pageNumber: selectedMap.pageNumber,
                })
              }
            >
              Save
            </button>
            <button type="button" className={styles.btnPlain} disabled={saving} onClick={() => void save(null)}>
              Not in a mapped room
            </button>
            <button type="button" className={styles.btnPlain} disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
}
