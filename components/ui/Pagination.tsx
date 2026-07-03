import Link from 'next/link';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;
  const href = (page: number) => `${basePath}?page=${page}`;

  return (
    <div className={styles.pagination}>
      {prev !== null ? (
        <Link href={href(prev)} className={styles.pageBtn}>← Prev</Link>
      ) : (
        <span className={`${styles.pageBtn} ${styles.disabled}`}>← Prev</span>
      )}
      <span className={styles.pageIndicator}>
        Page {currentPage} of {totalPages}
      </span>
      {next !== null ? (
        <Link href={href(next)} className={styles.pageBtn}>Next →</Link>
      ) : (
        <span className={`${styles.pageBtn} ${styles.disabled}`}>Next →</span>
      )}
    </div>
  );
}
