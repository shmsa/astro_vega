'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export function Navbar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  async function handleLogout() {
    await authClient.signOut();
    window.location.href = '/login';
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Novo Mapa', href: '/charts/new' },
    { label: 'Consulentes', href: '/clients' },
    { label: 'Histórico de Mapas', href: '/charts' },
    { label: 'Configurações', href: '/settings' },
  ];

  return (
    <header style={{
      borderBottom: '1px solid #e2e8f0',
      background: '#ffffff',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '64px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>ASTRO VEGA</span>
          <span style={{ fontSize: '11px', background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>V1.7</span>
        </Link>
        <nav style={{ display: 'flex', gap: '8px' }}>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#2563eb' : '#64748b',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: active ? '#eff6ff' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {userEmail && (
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            {userEmail}
          </span>
        )}
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            color: '#475569',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
