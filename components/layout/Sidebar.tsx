'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userName: string;
  userInitials: string;
  userRole?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/campaigns', label: 'Campaigns' },
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          background: var(--void-mid);
          border-right: var(--rule-thin);
          z-index: 40;
          overflow-y: auto;
        }

        /* Logo */
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1.25rem 1rem;
          border-bottom: var(--rule-thin);
          text-decoration: none;
        }
        .sidebar-logo-text {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.08em;
        }
        .logo-icon {
          width: 18px;
          height: 18px;
          color: var(--crimson);
        }

        /* New Campaign button */
        .btn-new-campaign {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin: 0.75rem;
          padding: 0.5rem 1rem;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          font-family: var(--font-heading);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ivory);
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-new-campaign:hover {
          background: var(--crimson-bright);
          box-shadow: 0 0 12px var(--crimson-glow);
        }

        /* Navigation */
        .nav {
          flex: 1;
          padding: 0.5rem 0;
        }

        .nav-section-label {
          font-family: var(--font-heading);
          font-size: 0.55rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ivory-dim);
          padding: 0.75rem 1rem 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.45rem 1rem;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: var(--ivory-muted);
          text-decoration: none;
          transition: all 0.15s;
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        .nav-item:hover {
          color: var(--ivory);
          background: var(--void-surface);
        }
        .nav-item.active {
          color: var(--gold);
          background: var(--void-surface);
          border-left: 2px solid var(--crimson);
        }

        /* Divider */
        .nav-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--crimson-dim), transparent);
          margin: 0.5rem 1rem;
        }

        /* User chip */
        .user-chip {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          border-top: var(--rule-thin);
        }
        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--crimson-dim);
          border: 1px solid var(--crimson);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--ivory);
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .user-info {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-family: var(--font-heading);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--ivory);
          letter-spacing: 0.05em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-role {
          font-family: var(--font-body);
          font-size: 0.65rem;
          color: var(--ivory-dim);
        }
        .btn-signout {
          background: none;
          border: none;
          padding: 0.25rem;
          color: var(--ivory-dim);
          cursor: pointer;
          transition: color 0.15s;
          flex-shrink: 0;
        }
        .btn-signout:hover {
          color: var(--crimson-bright);
        }
      `}</style>

      <aside className="sidebar">
        {/* Logo */}
        <Link href="/dashboard" className="sidebar-logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2L9.5 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7.5z" />
          </svg>
          <span className="sidebar-logo-text">RoleVerse</span>
        </Link>

        {/* New Campaign button */}
        <Link href="/campaigns/new" className="btn-new-campaign">
          + New Campaign
        </Link>

        {/* Main navigation */}
        <nav className="nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive(item.href) ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}

          <div className="nav-divider" />

          {footerNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-item"
              {...('external' in item && item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* User chip */}
        <div className="user-chip">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            {userRole && <div className="user-role">{userRole}</div>}
          </div>
          <button
            className="btn-signout"
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
    </>
  );
}
