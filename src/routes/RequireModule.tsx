import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import type { ModuleKey } from '@/lib/modules'

/**
 * Route guard that redirects to the dashboard when the current user lacks the
 * module permission. This is a UX convenience — the database RLS is the real
 * enforcement, so a bypass here still cannot read/write forbidden data.
 */
export default function RequireModule({
  module,
  children,
}: {
  module: ModuleKey
  children: React.ReactNode
}) {
  const { canAccess } = useAuth()
  if (!canAccess(module)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
