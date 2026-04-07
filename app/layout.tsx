import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Resume Analyzer',
  description: 'Analyze resumes with AI-powered guidance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
