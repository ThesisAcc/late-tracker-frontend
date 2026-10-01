import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DataSourceNotice } from './components/DataSourceNotice'
import { LoadingState } from './components/LoadingState'
import { useLateTrackerData } from './hooks/useLateTrackerData'
import { ImportDialog } from './features/import/ImportDialog'
import { ManagerDashboard } from './features/manager/ManagerDashboard'
import { WorkerDashboard } from './features/worker/WorkerDashboard'
import { LoginPage } from './features/auth/LoginPage'
import { clearAuthToken, getAuthToken } from './lib/auth'
import { getCurrentMonthKey } from './lib/months'
import './App.css'

type UserRole = 'manager' | 'worker'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => import.meta.env.MODE === 'test' || Boolean(getAuthToken()),
  )

  if (!isAuthenticated) {
    return <LoginPage onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <AuthenticatedApp
      onSignOut={() => {
        clearAuthToken()
        setIsAuthenticated(false)
      }}
    />
  )
}

function AuthenticatedApp({ onSignOut }: { onSignOut: () => void }) {
  const {
    data,
    status,
    saveWarning,
    importWorkbook,
    restoreDemo,
    clearSaveWarning,
  } = useLateTrackerData()
  const [role, setRole] = useState<UserRole>('manager')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const activeWorkerId =
    data.workers.some((worker) => worker.id === selectedWorkerId)
      ? selectedWorkerId
      : (data.workers[0]?.id ?? '')
  const isLoading = status === 'loading'

  return (
    <div className="app-shell">
      <AppHeader
        role={role}
        source={data.source}
        fileName={data.fileName}
        onRoleChange={setRole}
        onOpenImport={() => setIsImportOpen(true)}
        onSignOut={onSignOut}
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
            showActions={role === 'manager'}
            onOpenImport={() => setIsImportOpen(true)}
            onRestoreDemo={restoreDemo}
          />
        )}

        {isLoading ? (
          <LoadingState label="Loading attendance records" />
        ) : role === 'manager' ? (
          <ManagerDashboard
            workers={data.workers}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onOpenImport={() => setIsImportOpen(true)}
          />
        ) : (
          <WorkerDashboard
            workers={data.workers}
            selectedWorkerId={activeWorkerId}
            selectedMonth={selectedMonth}
            onWorkerChange={setSelectedWorkerId}
            onMonthChange={setSelectedMonth}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>LateTrack — data is loaded from the server when you are logged in.</p>
        <p>Without a server connection, imports are stored locally in this browser.</p>
      </footer>

      {isImportOpen ? (
        <ImportDialog
          onClose={() => setIsImportOpen(false)}
          onImport={async (selection) => {
            await importWorkbook(selection)
            setSelectedWorkerId('')
            setIsImportOpen(false)
          }}
      />
      ) : null}
    </div>
  )
}

export default App
