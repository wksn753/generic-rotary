import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rotary Club of Nakawa | Fellowship Check-In',
  description:
    'Fast fellowship and event attendance check-in for Rotary Club of Nakawa.',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  themeColor: '#0A1628',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;0,9..144,800;0,9..144,900;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
</head>
      <body>{children}</body>
    </html>
  );
}