'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
// CSS Module used (not styled-jsx) to prevent FOUC — see Sidebar.module.css for details.
import styles from './Sidebar.module.css';

interface SidebarProps {
  userName: string;
  userInitials: string;
  userRole?: string;
}

const navItems = [
  { href: '/dashboard',     label: 'Campaigns', showHomeIcon: true },
  { href: '/workshop',      label: 'Workshop' },
  { href: '/image-studio',  label: 'Studio' },
  { href: '/credits',       label: 'Buy Credits' },
] as const;

const footerNavItems = [
  { href: '/help',                        label: 'Help Center' },
  { href: '/updates',                     label: 'Updates' },
  { href: 'https://discord.gg/roleverse', label: 'Discord', external: true },
  { href: '/bug',                         label: 'Bug Report' },
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
        <svg className={styles.logoIcon} viewBox="-16 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M106.75 215.06L1.2 370.95c-3.08 5 .1 11.5 5.93 12.14l208.26 22.07-108.64-190.1zM7.41 315.43L82.7 193.08 6.06 147.1c-2.67-1.6-6.06.32-6.06 3.43v162.81c0 4.03 5.29 5.53 7.41 2.09zM18.25 423.6l194.4 87.66c5.3 2.45 11.35-1.43 11.35-7.26v-65.67l-203.55-22.3c-4.45-.5-6.23 5.59-2.2 7.57zm81.22-257.78L179.4 22.88c4.34-7.06-3.59-15.25-10.78-11.14L17.81 110.35c-2.47 1.62-2.39 5.26.13 6.78l81.53 48.69zM240 176h109.21L253.63 7.62C250.5 2.54 245.25 0 240 0s-10.5 2.54-13.63 7.62L130.79 176H240zm233.94-28.9l-76.64 45.99 75.29 122.35c2.11 3.44 7.41 1.94 7.41-2.1V150.53c0-3.11-3.39-5.03-6.06-3.43zm-93.41 18.72l81.53-48.7c2.53-1.52 2.6-5.16.13-6.78l-150.81-98.6c-7.19-4.11-15.12 4.08-10.78 11.14l79.93 142.94zm79.02 250.21L256 438.32v65.67c0 5.84 6.05 9.71 11.35 7.26l194.4-87.66c4.03-1.97 2.25-8.06-2.2-7.56zm-86.3-200.97l-108.63 190.1 208.26-22.07c5.83-.65 9.01-7.14 5.93-12.14L373.25 215.06zM240 208H139.57L240 383.75 340.43 208H240z" />
        </svg>
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
              <svg className={styles.navItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            {...('external' in item && item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
