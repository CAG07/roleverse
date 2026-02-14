import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Settings, LogOut, Sword } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/characters', label: 'Characters', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const fullName = user.user_metadata?.full_name ?? user.email ?? 'Adventurer';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r-2 border-gold bg-brown text-cream">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-gold/30 p-4">
          <Sword className="h-6 w-6 text-gold" />
          <Link href="/dashboard" className="font-medieval text-xl text-gold">
            RoleVerse
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-cream/80 hover:bg-brown-dark hover:text-gold"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gold/30 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="bg-teal text-sm text-cream">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm text-cream/90">{fullName}</span>
          </div>
          <Link href="/auth/signout">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-cream/60 hover:bg-brown-dark hover:text-rust"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
