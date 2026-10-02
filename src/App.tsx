import { useState } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { DataSourceNotice } from './components/DataSourceNotice'
import { LoadingState } from './components/LoadingState'
import { useLateTrackerData } from './hooks/useLateTrackerData'
import { ImportDialog } from './features/import/ImportDialog'
import { ManagerDashboard } from './features/manager/ManagerDashboard'
import { WorkerDashboard } from './features/worker/WorkerDashboard'
import { LoginPage } from './features/auth/LoginPage'
import { clearAuth } from './lib/auth'
import { getCurrentMonthKey } from './lib/months'
import { useAuth } from './hooks/useAuth'
import { RequireRole } from './components/RequireRole'
import './App.css'

function AuthenticatedApp() {
  const { isAuthenticated, isAdmin } = useAuth()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return <LoginPage onAuthenticated={handleLoginSuccess} />
  }

  function handleLoginSuccess() {
    navigate(isAdmin ? '/manager' : '/worker', { replace: true })
  }

  const {
    data,
    status,
    saveWarning,
    importWorkbook,
    restoreDemo,
    clearSaveWarning,
  } = useLateTrackerData()

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const isLoading = status === 'loading'

  return (
    <div className="app-shell">
      <AppHeader
        source={data.source}
        fileName={data.fileName}
        onOpenImport={isAdmin ? () => setIsImportOpen(true) : undefined}
        onSignOut={() => {
          clearAuth()
          navigate('/login', { replace: true })
        }}
      />

      <main className="app-main">
        {saveWarning ? (
          <div className="alert alert--warning storage-alert" role="alert">
            <span>{saveWarning}</span>
            <button
              type="button"
              className="text-button"
              onClick={clearSaveWarning}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {data.source === 'demo' ? null : (
          <DataSourceNotice
            source={data.source}
            fileName={data.fileName}
            sheetName={data.sheetName}
            showActions={true}
            onOpenImport={() => setIsImportOpen(true)}
            onRestoreDemo={restoreDemo}
          />
        )}

        {isLoading ? (
          <LoadingState label="Loading attendance records" />
        ) : (
          <Routes>
            <Route
              path="/manager"
              element={
                <RequireRole allowedRoles={['ADMIN']}>
                  <ManagerDashboard
                    workers={data.workers}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    onOpenImport={() => setIsImportOpen(true)}
                  />
                </RequireRole>
              }
            />
            <Route
              path="/worker"
              element={
                <RequireRole allowedRoles={['EMPLOYEE']}>
                  <WorkerDashboard
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                  />
                </RequireRole>
              }
            />
            <Route
              path="/"
              element={
                <Navigate
                  to={isAdmin ? '/manager' : '/worker'}
                  replace
                />
              }
            />
            <Route
              path="/login"
              element={<Navigate to={isAdmin ? '/manager' : '/worker'} replace />}
            />
          </Routes>
        )}
      </main>

      <footer className="app-footer">
        <p>LateTrack — data is loaded from the server when you are logged in.</p>
        <p>Without a server connection, imports are stored locally in this browser.</p>
      </footer>

      {isImportOpen && isAdmin ? (
        <ImportDialog
          onClose={() => setIsImportOpen(false)}
          onImport={async (selection) => {
            await importWorkbook(selection)
            setIsImportOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthenticatedApp />
    </Router>
  )
}

export default App