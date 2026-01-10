import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import Link from 'next/link';
import { LifeProvider } from '@/state/LifeStore';
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
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Habits', icon: '↻' },
  { href: '/appointments', label: 'Calendar', icon: '◷' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {/* Ambient background */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0077CC]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7AC943]/10 rounded-full blur-3xl" />
        </div>

        <LifeProvider>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl p-6">
              <div className="mb-10">
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="text-[#0077CC]">help</span>
                  <span className="text-[#7AC943]">em</span>
                </h1>
                <p className="text-xs text-white/40 mt-1">Life Management</p>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 
                               hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="p-4 bg-gradient-to-br from-[#0077CC]/20 to-[#7AC943]/10 
                                rounded-xl border border-[#7AC943]/20">
                  <p className="text-sm font-medium text-[#7AC943]">Quick Capture</p>
                  <p className="text-xs text-white/50 mt-1">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70">⌘</kbd>
                    {' + '}
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/70">K</kbd>
                  </p>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64 p-8">
              <div className="max-w-4xl mx-auto">{children}</div>
            </main>
          </div>
        </LifeProvider>
      </body>
    </html>
  );
}
