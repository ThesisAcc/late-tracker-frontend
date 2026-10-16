import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DataSourceNotice } from './components/DataSourceNotice'
import { LoadingState } from './components/LoadingState'
import { useLateTrackerData } from './hooks/useLateTrackerData'
import { ImportDialog } from './features/import/ImportDialog'
import { ManageEmployeesDialog } from './features/employees/ManageEmployeesDialog'
import { ManagerDashboard } from './features/manager/ManagerDashboard'
import { WorkerDashboard } from './features/worker/WorkerDashboard'
import { LoginPage } from './features/auth/LoginPage'
import { clearAuth, getAuthToken, getAuthUser, isManagerUser } from './lib/auth'
import { getCurrentMonthKey } from './lib/months'
import './App.css'

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
        clearAuth()
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
  const user = getAuthUser()
  // Default to manager in demo/test mode (no user), otherwise derive from the
  // authenticated user's role. Falls back to 'worker' for unrecognised roles.
  const role = user ? (isManagerUser(user) ? 'manager' : 'worker') : 'manager'
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false)
  const isLoading = status === 'loading'
  
  // For authenticated employees, we get only their data (single worker)
  // For demo/test mode, we have multiple workers
  const isAuthenticatedEmployee = user && role === 'worker' && data.source === 'server'
  const activeWorkerId =
    data.workers.some((worker) => worker.id === selectedWorkerId)
      ? selectedWorkerId
      : (data.workers[0]?.id ?? '')

  return (
    <div className="app-shell">
      <AppHeader
        role={role}
        source={data.source}
        fileName={data.fileName}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenEmployees={() => setIsEmployeesOpen(true)}
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
            selectedWorkerId={isAuthenticatedEmployee ? undefined : activeWorkerId}
            selectedMonth={selectedMonth}
            onWorkerChange={isAuthenticatedEmployee ? undefined : setSelectedWorkerId}
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

      {isEmployeesOpen ? (
        <ManageEmployeesDialog
          onClose={() => setIsEmployeesOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default App
