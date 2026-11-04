import "./globals.css";
import "./dream.css";
export const metadata={
  title:"MarkErras Sorare Dream 4.0 | Football & NBA",
  description:"Black & Gold Sorare Workspace für Fußball und NBA: Builder, Kartensammlung, Daily Missions, Match Center, Player Database und Analyse.",
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="de"><body>{children}</body></html>;
}
