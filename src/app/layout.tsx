import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import Link from 'next/link';
import { LifeProvider } from '@/state/LifeStore';
import { ReminderProvider } from '@/components/ReminderProvider';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'HelpEm - Life Management',
  description: 'Capture, classify, and conquer your day',
};

const navItems = [
  { href: '/', label: 'Today', icon: '◐' },
  { href: '/appointments', label: 'Appointments', icon: '◷' },
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Habits', icon: '↻' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen bg-gray-50 text-brandText antialiased">
        <LifeProvider>
          <ReminderProvider>
            <div className="min-h-screen">
              {/* Header */}
              <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                  <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">H</span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                          <span className="text-brandBlue">help</span>
                          <span className="text-brandGreen">em</span>
                        </h1>
                        <p className="text-xs text-brandTextLight">Life Management</p>
                      </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-brandTextLight
                                     hover:text-brandText hover:bg-gray-100 transition-all duration-200"
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </header>

              {/* Main content */}
              <main className="max-w-7xl mx-auto px-6 py-8">
                {children}
              </main>
            </div>
          </ReminderProvider>
        </LifeProvider>
      </body>
    </html>
  );
}
