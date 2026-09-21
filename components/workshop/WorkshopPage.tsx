'use client';

import { useMemo, useState } from 'react';
import { getAllGameSystemsIncludingUnsupported } from '@/lib/game-systems/registry';
import { SubmitResourceForm } from './SubmitResourceForm';
import styles from './WorkshopPage.module.css';

export type WorkshopCategory =
  | 'reference_srds'
  | 'world_building'
  | 'vtt_resources'
  | 'publisher_storefronts'
  | 'maps_art_generators'
  | 'community_spaces';

const CATEGORIES: { id: WorkshopCategory; label: string }[] = [
  { id: 'reference_srds', label: 'Reference SRDs & Open Rules' },
  { id: 'world_building', label: 'World-Building Tools' },
  { id: 'vtt_resources', label: 'VTT Resources' },
  { id: 'publisher_storefronts', label: 'Publisher Storefronts' },
  { id: 'maps_art_generators', label: 'Maps, Art & Generators' },
  { id: 'community_spaces', label: 'Community Spaces' },
];

export interface WorkshopResource {
  id: string;
  category: WorkshopCategory;
  title: string;
  description: string;
  url: string;
  affiliate_url: string | null;
  is_affiliate: boolean;
  is_partner: boolean;
  game_systems: string[];
}

export interface WorkshopSubmission {
  id: string;
  url: string;
  category: WorkshopCategory;
  game_systems: string[];
  license_type: string;
  description: string;
  status: 'pending' | 'approved' | 'declined';
  decline_reason: string | null;
  created_at: string;
}

interface WorkshopPageProps {
  resources: WorkshopResource[];
  mySubmissions: WorkshopSubmission[];
  signedIn: boolean;
}

export function WorkshopPage({ resources, mySubmissions, signedIn }: WorkshopPageProps) {
  const [category, setCategory] = useState<WorkshopCategory>('reference_srds');
  const [systemFilters, setSystemFilters] = useState<string[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissions, setSubmissions] = useState(mySubmissions);

  const allSystems = useMemo(() => getAllGameSystemsIncludingUnsupported(), []);

  const toggleSystemFilter = (id: string) => {
    setSystemFilters((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const categoryResources = resources.filter((r) => r.category === category);
  const filteredResources = categoryResources.filter(
    (r) =>
      systemFilters.length === 0 ||
      r.game_systems.length === 0 ||
      r.game_systems.some((s) => systemFilters.includes(s))
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Workshop</h1>
        <p className={styles.disclosure}>
          Some links in the Workshop may be affiliate links. RoleVerse may earn a small
          commission if you make a purchase through them, at no extra cost to you. Affiliate
          relationships do not influence which resources are featured — all inclusions are
          evaluated against our content policy.
        </p>
      </div>

      <div className={styles.layout}>
        <nav className={styles.sideNav}>
          <span className={styles.navHeading}>Categories</span>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.navItem} ${category === c.id ? styles.navItemActive : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
              <span className={styles.navCount}>
                {resources.filter((r) => r.category === c.id).length}
              </span>
            </button>
          ))}

          <span className={styles.navHeading}>Game System</span>
          <div className={styles.filterList}>
            {allSystems.map((s) => (
              <label key={s.id} className={styles.filterCheckbox}>
                <input
                  type="checkbox"
                  checked={systemFilters.includes(s.id)}
                  onChange={() => toggleSystemFilter(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>

          <button type="button" className={styles.btnSubmit} onClick={() => setShowSubmitForm((v) => !v)}>
            {showSubmitForm ? 'Cancel' : '+ Suggest a Resource'}
          </button>
        </nav>

        <div className={styles.content}>
          {systemFilters.length > 0 && (
            <div className={styles.chipRow}>
              {systemFilters.map((id) => {
                const system = allSystems.find((s) => s.id === id);
                return (
                  <button key={id} type="button" className={styles.chip} onClick={() => toggleSystemFilter(id)}>
                    {system?.name ?? id} ×
                  </button>
                );
              })}
            </div>
          )}

          {signedIn && showSubmitForm && (
            <SubmitResourceForm
              categories={CATEGORIES}
              allSystems={allSystems}
              onSubmitted={(submission) => {
                setSubmissions((prev) => [submission, ...prev]);
                setShowSubmitForm(false);
              }}
            />
          )}
          {!signedIn && showSubmitForm && (
            <p className={styles.signInHint}>Sign in to suggest a resource.</p>
          )}

          {filteredResources.length === 0 ? (
            <p className={styles.emptyText}>No resources in this category yet.</p>
          ) : (
            <ul className={styles.resourceList}>
              {filteredResources.map((r) => (
                <li key={r.id} className={styles.resourceRow}>
                  <a
                    href={r.is_affiliate ? (r.affiliate_url ?? r.url) : r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.resourceTitle}
                  >
                    {r.title}
                  </a>
                  {r.is_partner && <span className={styles.badgePartner}>Partner</span>}
                  {r.is_affiliate && <span className={styles.badgeAffiliate}>Affiliate</span>}
                  <p className={styles.resourceDescription}>{r.description}</p>
                  {r.game_systems.length > 0 && (
                    <div className={styles.resourceTags}>
                      {r.game_systems.map((id) => (
                        <span key={id} className={styles.resourceTag}>
                          {allSystems.find((s) => s.id === id)?.name ?? id}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {signedIn && submissions.length > 0 && (
            <div className={styles.mySubmissions}>
              <span className={styles.navHeading}>My Submissions</span>
              <ul className={styles.submissionList}>
                {submissions.map((s) => (
                  <li key={s.id} className={styles.submissionRow}>
                    <span className={styles.submissionUrl}>{s.url}</span>
                    <span className={`${styles.submissionStatus} ${styles[`status_${s.status}`]}`}>
                      {s.status}
                    </span>
                    {s.status === 'declined' && s.decline_reason && (
                      <span className={styles.declineReason}>{s.decline_reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
