import { Link } from 'react-router-dom'
import type { TrackerSource } from "../lib/types";

interface AppHeaderProps {
  source: TrackerSource;
  fileName?: string;
  onOpenImport?: () => void;
  onSignOut: () => void;
}

const badgeLabels: Record<TrackerSource, string> = {
  demo: "Demo data",
  upload: "Imported data",
  server: "Live data",
};

export function AppHeader({ source, fileName, onOpenImport, onSignOut }: AppHeaderProps) {
  const badgeLabel = source === "upload" ? fileName || badgeLabels.upload : badgeLabels[source];

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand" aria-label="LateTrack home">
          <img className="brand__mark" src="/Logo.png" alt="" />
          <span>
            <strong>LateTrack</strong>
            <small>Workforce attendance</small>
          </span>
        </div>

        <div className="app-header__actions">
          <span className="source-badge">
            <span className={`source-badge__dot source-badge__dot--${source}`} aria-hidden="true" />
            {badgeLabel}
          </span>

          <nav className="heading-controls">
            <Link to="/manager" className="text-button">
              Manager view
            </Link>
            <Link to="/worker" className="text-button">
              Worker view
            </Link>
          </nav>

          {source !== 'demo' && onOpenImport ? (
            <button
              type="button"
              className="button button--primary header-import"
              onClick={onOpenImport}
            >
              Import Excel
            </button>
          ) : null}
          <button type="button" className="button button--quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
