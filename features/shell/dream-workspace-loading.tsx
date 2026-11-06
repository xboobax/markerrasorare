/** Lightweight server-rendered route fallback. No APIs and no JS hydration. */
export default function DreamWorkspaceLoading(){
  return <section className="dream-route-loading" role="status" aria-live="polite" aria-label="Arbeitsbereich wird geladen">
    <div className="dream-route-loading-heading">
      <div className="dream-loading-skeleton dream-loading-kicker"/>
      <div className="dream-loading-skeleton dream-loading-title"/>
      <p>Arbeitsbereich wird geladen … Menü bleibt verfügbar.</p>
    </div>
    <div className="dream-loading-panels" aria-hidden="true">
      <div className="dream-loading-skeleton dream-loading-panel"/>
      <div className="dream-loading-skeleton dream-loading-panel"/>
    </div>
  </section>;
}
