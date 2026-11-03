import "./globals.css";

export const metadata = {
  title: "Markerras Sorare Helper V2.0 | Gameweek & Arcade Center",
  description: "NBA & Fußball Arcade: Spielerprognosen, Suche und Lineup-Optimierung. Fußball: Bundesliga, LaLiga, Ligue 1 und Premier League. NBA: maximal 16 Sterne.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="de"><body>{children}</body></html>;
}
