'use client';

import styles from './EquipmentList.module.css';

interface EquipmentListProps {
  items: unknown[];
}

interface NormalizedItem {
  name: string;
  quantity?: number;
  weight?: number;
  detail?: string;
}

function normalizeItem(raw: unknown): NormalizedItem {
  if (typeof raw === 'string') return { name: raw };

  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const name = (r.name as string) ?? (r.item as string) ?? (r.title as string) ?? 'Unknown item';
    const quantity = (r.quantity as number) ?? (r.qty as number) ?? (r.count as number) ?? undefined;
    const weight = (r.weight as number) ?? (r.lbs as number) ?? undefined;
    const detail =
      (r.description as string) ??
      (r.notes as string) ??
      (r.properties as string) ??
      (r.type as string) ??
      undefined;
    return { name, quantity, weight, detail };
  }

  return { name: String(raw) };
}

/** Read-only equipment/inventory section, reused across all system-specific sheets. */
export default function EquipmentList({ items }: EquipmentListProps) {
  if (!items || items.length === 0) return null;

  const normalized = items.map(normalizeItem);

  return (
    <div>
      <div className={styles.sectionLabel}>Equipment</div>
      <ul className={styles.list}>
        {normalized.map((item, i) => (
          <li key={i} className={styles.row}>
            <span className={styles.name}>{item.name}</span>
            {item.quantity != null && <span className={styles.badge}>×{item.quantity}</span>}
            {item.weight != null && <span className={styles.badge}>{item.weight} lb</span>}
            {item.detail && <span className={styles.detail}>{item.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
