import "./globals.css";

export const metadata = {
  title: "DiviSorare | Arcade Lineup & Spieleranalyse",
  description: "Sorare Football und NBA: Spielerprognosen, Karten-Suche und Lineup-Optimierung mit NBA-16-Sterne-Budget.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="de"><body>{children}</body></html>;
}
