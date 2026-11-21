import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AboutPage } from '../../features/about'
import { ContactPage } from '../../features/contact'
import { ExperiencePage } from '../../features/experience'
import { HomePage } from '../../features/home'
import { NotFoundPage } from '../../features/not-found'
import { ProjectDetailPage, ProjectsPage } from '../../features/projects'
import { ReviewsPage } from '../../features/reviews'
import { ServicesPage } from '../../features/services'
import { SkillsPage } from '../../features/skills'
import { LoadingState } from '../../shared/components'

const AdminLoginPage = lazy(() =>
  import('../../features/auth').then((module) => ({ default: module.AdminLoginPage })),
)

const AdminDashboardPage = lazy(() =>
  import('../../features/admin').then((module) => ({ default: module.AdminDashboardPage })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<section className="page inner-page"><LoadingState /></section>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/experience" element={<ExperiencePage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
