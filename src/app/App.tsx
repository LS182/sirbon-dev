import { MainLayout } from './layouts/MainLayout'
import { AppRoutes } from './router/AppRoutes'

export function App() {
  return (
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  )
}
