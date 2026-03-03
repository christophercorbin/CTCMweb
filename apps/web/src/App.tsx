import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AuthenticatedLayout } from './components/AuthenticatedLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { CustomerDashboard } from './pages/CustomerDashboard'
import { CreateShipment } from './pages/CreateShipment'
import { ShipmentDetails } from './pages/ShipmentDetails'
import { CustomerInfo } from './pages/CustomerInfo'
import { Invoices } from './pages/Invoices'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminShipmentDetails } from './pages/AdminShipmentDetails'
import { AdminInvoices } from './pages/AdminInvoices'
import { PendingPackages } from './pages/PendingPackages'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <CustomerDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/create-shipment"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <CreateShipment />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/shipments/:id"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ShipmentDetails />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/pending-packages"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <PendingPackages />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer-info"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <CustomerInfo />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Invoices />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <AuthenticatedLayout>
                <AdminDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/shipments/:id"
          element={
            <ProtectedRoute requireAdmin>
              <AuthenticatedLayout>
                <AdminShipmentDetails />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/invoices"
          element={
            <ProtectedRoute requireAdmin>
              <AuthenticatedLayout>
                <AdminInvoices />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  )
}

export default App
