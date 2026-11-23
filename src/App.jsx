import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/RouteGuards'
import { MockModeBadge } from '@/components/MockModeBadge'
import { AuthProvider } from '@/context/AuthContext'
import { AccountPage } from '@/pages/AccountPage'
import { AuthPage } from '@/pages/AuthPage'
import { DetailsPage } from '@/pages/DetailsPage'
import { EditInspirationPage } from '@/pages/EditInspirationPage'
import { HomePage } from '@/pages/HomePage'
import { NewInspirationPage } from '@/pages/NewInspirationPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/signup" element={<AuthPage mode="signup" />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/new" element={<NewInspirationPage />} />
              <Route path="/i/:id" element={<DetailsPage />} />
              <Route path="/i/:id/edit" element={<EditInspirationPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          <MockModeBadge />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
