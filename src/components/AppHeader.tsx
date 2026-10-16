import { useEffect, useRef, useState } from "react";
import type { TrackerSource } from "../lib/types";

interface AppHeaderProps {
  role: "manager" | "worker";
  isAdmin?: boolean;
  source: TrackerSource;
  fileName?: string;
  onOpenImport: () => void;
  onOpenEmployees?: () => void;
  onOpenAttendance?: () => void;
  onOpenReset?: () => void;
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
  isAdmin,
  source,
  fileName,
  onOpenImport,
  onOpenEmployees,
  onOpenAttendance,
  onOpenReset,
  onChangePin,
  onSignOut,
}: AppHeaderProps) {
  const badgeLabel = source === "upload" ? fileName || badgeLabels.upload : badgeLabels[source];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActionsOpen(false);
      }
    }

    if (isActionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionsOpen]);

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
            <button
              type="button"
              className="button button--primary header-import"
              onClick={onOpenImport}
            >
              Import Excel
            </button>
          ) : null}

          <div className="header-actions-dropdown" ref={actionsRef}>
            <button
              type="button"
              className="button button--secondary header-actions-trigger"
              aria-haspopup="menu"
              aria-expanded={isActionsOpen}
              onClick={() => setIsActionsOpen(!isActionsOpen)}
            >
              <span>Actions</span>
              <span className="header-actions-chevron" aria-hidden="true">▾</span>
            </button>

            {isActionsOpen && (
              <div className="header-actions-menu" role="menu">
                {role === "manager" ? (
                  <>
                    {onOpenEmployees ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="actions-menu-item header-employees"
                        onClick={() => {
                          setIsActionsOpen(false);
                          setIsMenuOpen(false);
                          onOpenEmployees();
                        }}
                      >
                        Manage Employees
                      </button>
                    ) : null}
                    {onOpenAttendance ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="actions-menu-item header-attendance"
                        onClick={() => {
                          setIsActionsOpen(false);
                          setIsMenuOpen(false);
                          onOpenAttendance();
                        }}
                      >
                        Manual Attendance
                      </button>
                    ) : null}
                    {onChangePin ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="actions-menu-item header-change-pin"
                        onClick={() => {
                          setIsActionsOpen(false);
                          setIsMenuOpen(false);
                          onChangePin();
                        }}
                      >
                        Change PIN
                      </button>
                    ) : null}
                    {isAdmin && onOpenReset ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="actions-menu-item actions-menu-item--danger header-reset"
                        onClick={() => {
                          setIsActionsOpen(false);
                          setIsMenuOpen(false);
                          onOpenReset();
                        }}
                      >
                        Reset Data
                      </button>
                    ) : null}
                  </>
                ) : onChangePin ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="actions-menu-item header-change-pin"
                    onClick={() => {
                      setIsActionsOpen(false);
                      setIsMenuOpen(false);
                      onChangePin();
                    }}
                  >
                    Change PIN
                  </button>
                ) : null}

                <div className="actions-menu-divider" role="separator" />

                <button
                  type="button"
                  role="menuitem"
                  className="actions-menu-item actions-menu-item--signout"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsMenuOpen(false);
                    onSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
