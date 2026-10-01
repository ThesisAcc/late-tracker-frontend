import type { TrackerSource } from "../lib/types";

interface AppHeaderProps {
  role: "manager" | "worker";
  source: TrackerSource;
  fileName?: string;
  onRoleChange: (role: "manager" | "worker") => void;
  onOpenImport: () => void;
  onSignOut: () => void;
}

const badgeLabels: Record<TrackerSource, string> = {
  demo: "Demo data",
  upload: "Imported data",
  server: "Live data",
};

export function AppHeader({ role, source, fileName, onRoleChange, onOpenImport, onSignOut }: AppHeaderProps) {
  const badgeLabel = source === "upload" ? fileName || badgeLabels.upload : badgeLabels[source];

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand" aria-label="LateTrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/Logo.png" alt="" />
          </span>
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

          <div className="role-switch" aria-label="View as role">
            <button
              type="button"
              aria-pressed={role === "manager"}
              onClick={() => onRoleChange("manager")}
            >
              Manager
            </button>
            <button
              type="button"
              aria-pressed={role === "worker"}
              onClick={() => onRoleChange("worker")}
            >
              Worker
            </button>
          </div>

          {role === "manager" ? (
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
