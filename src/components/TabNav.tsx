'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TabNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: '评估', icon: 'clock' },
    { href: '/summary', label: '摘要', icon: 'chart' },
    { href: '/history', label: '历史', icon: 'history' },
    { href: '/contact', label: '联系', icon: 'phone' },
  ];

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        );
      case 'chart':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        );
      case 'history':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        );
      case 'phone':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="tab-nav">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`tab-btn ${pathname === tab.href ? 'active' : ''}`}
        >
          {getIcon(tab.icon)}
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
