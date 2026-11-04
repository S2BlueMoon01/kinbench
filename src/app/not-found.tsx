import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import './globals.css';

// Served as out/404.html for any unknown URL, so the locale is unknown: show both languages.
export default function NotFound() {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center p-6">
        <main className="text-center">
          <p className="font-mono text-sm text-muted-foreground">404</p>
          <h1 className="mt-2 text-2xl font-semibold">{en.notFound.title}</h1>
          <p lang="vi" className="text-muted-foreground">{vi.notFound.title}</p>
          <p className="mt-6 flex justify-center gap-4">
            <a href="/en" className="text-link underline underline-offset-4">{en.ui.nav.home}</a>
            <a href="/vi" lang="vi" className="text-link underline underline-offset-4">{vi.ui.nav.home}</a>
          </p>
        </main>
      </body>
    </html>
  );
}
