'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GUIDE_TOPICS } from '@/lib/guide/topics';
import styles from './GuideWikiShell.module.css';

interface SearchResult {
  key: string;
  href: string;
  title: string;
  /** The article a section belongs to; absent for an article match. */
  parent?: string;
}

function searchGuide(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const topic of GUIDE_TOPICS) {
    const href = `/guide/${topic.slug}`;
    if (topic.title.toLowerCase().includes(q) || topic.description.toLowerCase().includes(q)) {
      results.push({ key: topic.slug, href, title: topic.title });
    }
    for (const section of topic.sections) {
      if (section.title.toLowerCase().includes(q)) {
        results.push({
          key: `${topic.slug}#${section.id}`,
          href: `${href}#${section.id}`,
          title: section.title,
          parent: topic.title,
        });
      }
    }
  }
  return results;
}

/**
 * Wiki-style frame for every User Guide page: a persistent table of contents
 * (with the open article expanded to its section anchors) and a search box that
 * filters article and section titles. Stacks above the article on narrow screens.
 */
export function GuideWikiShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchGuide(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label="User Guide contents">
        <div className={styles.searchWrap}>
          <label htmlFor="guideSearch" className={styles.searchLabel}>
            Search the guide
          </label>
          <input
            id="guideSearch"
            type="search"
            className={styles.searchInput}
            placeholder="Search articles and sections"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {searching ? (
          results.length === 0 ? (
            <p className={styles.noResults}>
              No articles or sections match &quot;{query.trim()}&quot;.
            </p>
          ) : (
            <ul className={styles.list}>
              {results.map((r) => (
                <li key={r.key}>
                  <Link href={r.href} className={styles.resultLink} onClick={() => setQuery('')}>
                    {r.parent && <span className={styles.resultParent}>{r.parent}</span>}
                    <span>{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <nav>
            <Link
              href="/guide"
              className={`${styles.articleLink} ${pathname === '/guide' ? styles.active : ''}`}
              aria-current={pathname === '/guide' ? 'page' : undefined}
            >
              Main Page
            </Link>
            <div className={styles.contentsLabel}>Articles</div>
            <ol className={styles.list}>
              {GUIDE_TOPICS.map((topic) => {
                const href = `/guide/${topic.slug}`;
                const current = pathname === href;
                return (
                  <li key={topic.slug}>
                    <Link
                      href={href}
                      className={`${styles.articleLink} ${current ? styles.active : ''}`}
                      aria-current={current ? 'page' : undefined}
                    >
                      {topic.title}
                    </Link>
                    {current && (
                      <ul className={styles.sectionList}>
                        {topic.sections.map((section) => (
                          <li key={section.id}>
                            <a href={`#${section.id}`} className={styles.sectionLink}>
                              {section.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
