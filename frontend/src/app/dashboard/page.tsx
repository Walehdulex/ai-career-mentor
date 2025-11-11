import ProtectedRoute from '../components/auth/ProtectedRoute'
import UserDashboard from '../components/UserDashboard'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <UserDashboard />
    </ProtectedRoute>
  )
}