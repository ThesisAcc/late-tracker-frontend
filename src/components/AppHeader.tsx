import { useState } from "react";
import type { TrackerSource } from "../lib/types";

interface AppHeaderProps {
  role: "manager" | "worker";
  source: TrackerSource;
  fileName?: string;
  onOpenImport: () => void;
  onOpenEmployees?: () => void;
  onOpenAttendance?: () => void;
  onChangePin?: () => void;
  onSignOut: () => void;
}

const badgeLabels: Record<TrackerSource, string> = {
  demo: "Demo data",
  upload: "Imported data",
  server: "Live data",
};

export function AppHeader({
  role,
  source,
  fileName,
  onOpenImport,
  onOpenEmployees,
  onOpenAttendance,
  onChangePin,
  onSignOut,
}: AppHeaderProps) {
  const badgeLabel = source === "upload" ? fileName || badgeLabels.upload : badgeLabels[source];
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        <button
          type="button"
          className="hamburger-button"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span aria-hidden="true">{isMenuOpen ? "×" : "☰"}</span>
        </button>

        <div className={`app-header__actions ${isMenuOpen ? "app-header__actions--open" : ""}`}>
          <span className="source-badge">
            <span className={`source-badge__dot source-badge__dot--${source}`} aria-hidden="true" />
            {badgeLabel}
          </span>

          {role === "manager" ? (
            <>
              {onOpenEmployees ? (
                <button
                  type="button"
                  className="button button--secondary header-employees"
                  onClick={onOpenEmployees}
                >
                  Manage Employees
                </button>
              ) : null}
              {onOpenAttendance ? (
                <button
                  type="button"
                  className="button button--secondary header-attendance"
                  onClick={onOpenAttendance}
                >
                  Manual Attendance
                </button>
              ) : null}
              <button
                type="button"
                className="button button--primary header-import"
                onClick={onOpenImport}
              >
                Import Excel
              </button>
            </>
          ) : onChangePin ? (
            <button
              type="button"
              className="button button--secondary header-change-pin"
              onClick={onChangePin}
            >
              Change PIN
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
