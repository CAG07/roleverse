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
  { href: '/dashboard', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/workshop', label: 'Workshop' },
  { href: '/image-studio', label: 'Image Studio' },
  { href: '/credits', label: 'Claim Credits' },
] as const;

const footerNavItems = [
  { href: '/help', label: 'Help Center' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/updates', label: 'Updates' },
  { href: 'https://discord.gg/roleverse', label: 'Discord', external: true },
  { href: '/bug', label: 'Bug Report' },
] as const;

export function Sidebar({ userName, userInitials, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/campaigns');
    }
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
        <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2L9.5 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7.5z" />
        </svg>
        <span className={styles.sidebarLogoText}>RoleVerse</span>
      </Link>

      {/* New Campaign button */}
      <Link href="/campaigns/new" className={styles.btnNewCampaign}>
        + New Campaign
      </Link>

      {/* Main navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSectionLabel}>Navigation</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem}${isActive(item.href) ? ` ${styles.active}` : ''}`}
          >
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
