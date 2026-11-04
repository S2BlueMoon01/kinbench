// The real root layout is app/[locale]/layout.tsx (it sets <html lang>). This one only exists for app/not-found.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
