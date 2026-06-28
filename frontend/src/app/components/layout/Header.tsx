'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// ── Nav items ────────────────────────────────────────────────────────────────
const AUTH_NAV = [
  { href: '/dashboard',    label: 'Dashboard' },
  { href: '/resume',       label: 'Resume' },
  { href: '/chat',         label: 'AI Chat' },
  { href: '/dashboard/jobs',         label: 'Jobs' },
  { href: '/interview',    label: 'Interview' },
  { href: '/applications', label: 'Applications' },
];

const GUEST_NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing',  label: 'Pricing' },
];

// ── UserMenu ─────────────────────────────────────────────────────────────────
const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); router.push('/'); };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-semibold">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {user.full_name}
        </span>
        <svg className={`hidden md:block h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <div className="py-1">
              <button onClick={() => { setOpen(false); router.push('/profile'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Profile Settings
              </button>
              <button onClick={() => { setOpen(false); router.push('/dashboard'); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                Dashboard
              </button>
            </div>
            <div className="border-t border-gray-100 py-1">
              <button onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Mobile hamburger menu ────────────────────────────────────────────────────
const MobileMenu: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const nav = user ? AUTH_NAV : GUEST_NAV;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose}/>
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 md:hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <span className="font-bold text-gray-900">Career Mentor</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={onClose}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {user ? (
          <div className="px-3 py-4 border-t border-gray-200 space-y-1">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">{user.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => { onClose(); logout(); router.push('/'); }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign out
            </button>
          </div>
        ) : (
          <div className="px-3 py-4 border-t border-gray-200 space-y-2">
            <Link href="/auth" onClick={onClose}
              className="block text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">
              Sign in
            </Link>
            <Link href="/auth" onClick={onClose}
              className="block text-center px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

// ── Mobile bottom nav ────────────────────────────────────────────────────────
export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  const items = [
    { href: '/dashboard', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    )},
    { href: '/resume', label: 'Resume', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    )},
    { href: '/jobs', label: 'Jobs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    )},
    { href: '/interview', label: 'Interview', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
      </svg>
    )},
    { href: '/chat', label: 'AI Chat', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    )},
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1 py-1">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors flex-1 ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

// ── Main Header export ───────────────────────────────────────────────────────
export const Header: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user ? AUTH_NAV : GUEST_NAV;

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Brand */}
            <button onClick={() => router.push('/')} className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Career Mentor</span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {user ? (
                <UserMenu />
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <button onClick={() => router.push('/auth')}
                    className="text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                    Sign in
                  </button>
                  <button onClick={() => router.push('/auth')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Get Started
                  </button>
                </div>
              )}

              {/* Hamburger — mobile only */}
              <button onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open menu">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
};