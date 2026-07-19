'use client';

import styles from './GenericSheet.module.css';
import EquipmentList from '../EquipmentList';

interface GenericSheetProps {
  data: Record<string, unknown>;
  systemName: string;
  equipment?: unknown[];
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default function GenericSheet({ data, systemName, equipment = [] }: GenericSheetProps) {
  const entries = Object.entries(data);

  return (
    <div className={styles.sheetRoot}>
      <div className={styles.sheetHeader}>
        <h3 className={styles.sheetName}>{(data.name as string) ?? 'Character'}</h3>
        <p className={styles.sheetSystem}>System: {systemName}</p>
      </div>

      <div>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.entryRow}>
            <span className={styles.entryKey}>{key}</span>
            <span className={styles.entryVal}>{renderValue(value)}</span>
          </div>
        ))}
      </div>

      <EquipmentList items={equipment} />
    </div>
  );
}
