'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import D20Icon from '@/components/icons/D20Icon';
// CSS Module used (not styled-jsx) to prevent FOUC — see Sidebar.module.css for details.
import styles from './Sidebar.module.css';

interface SidebarProps {
  userName: string;
  userInitials: string;
  userRole?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Campaigns', showHomeIcon: true },
  { href: '/workshop', label: 'Workshop' },
  { href: '/image-studio', label: 'Studio' },
  { href: '/credits', label: 'Premium' },
] as const;

const footerNavItems = [
  { href: '/help', label: 'Help Center' },
  { href: '/updates', label: 'Updates' },
  { href: '/bug', label: 'Bug Report' },
] as const;

export function Sidebar({ userName, userInitials, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <Link href="/dashboard" className={styles.sidebarLogo}>
        <D20Icon className={styles.logoIcon} />
        <span className={styles.sidebarLogoText}>RoleVerse</span>
      </Link>

      {/* Main navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem}${isActive(item.href) ? ` ${styles.active}` : ''}`}
          >
            {'showHomeIcon' in item && item.showHomeIcon && (
              <svg
                className={styles.navItemIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5 L12 3 L21 10.5 V20 A1 1 0 0 1 20 21 H15 V14 H9 V21 H4 A1 1 0 0 1 3 20 Z" />
              </svg>
            )}
            {item.label}
          </Link>
        ))}

        <div className={styles.navDivider} />

        {footerNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={styles.navItem}
            {...('external' in item && item.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* User chip */}
      <div className={styles.userChip}>
        <div className={styles.userAvatar}>{userInitials}</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{userName}</div>
          {userRole && <div className={styles.userRole}>{userRole}</div>}
        </div>
        <button
          className={styles.btnSignout}
          onClick={handleSignOut}
          title="Sign out"
          type="button"
          aria-label="Sign out"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
