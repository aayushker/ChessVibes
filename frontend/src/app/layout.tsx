import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Tailwind CSS

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NextChess',
  description: 'A Chess Game built with Next.js and FastAPI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-800 text-white min-h-screen flex flex-col`}>
        <header className="bg-gray-900 p-4 shadow-md">
          <h1 className="text-3xl font-bold text-center text-teal-400">NextChess</h1>
        </header>
        <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
          {children}
        </main>
        <footer className="bg-gray-900 p-3 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} NextChess. Play Responsibly.</p>
        </footer>
      </body>
    </html>
  );
}