import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import OAuthCallback from './pages/OAuthCallback'
import Profile from './pages/Profile'
import ResearchPapers from './pages/ResearchPapers'
import FundingIntelligence from './pages/FundingIntelligence'
import PatentLandscape from './pages/PatentLandscape'
import TechnologyIntelligence from './pages/TechnologyIntelligence'
import TechnologyMaturity from './pages/TechnologyMaturity'
import TechnologyAdoption from './pages/TechnologyAdoption'
import TechnologyTrends from './pages/TechnologyTrends'
import InnovationScoring from './pages/InnovationScoring'
import Commercialization from './pages/Commercialization'
import TechIntelligenceFloatingNav from './components/TechIntelligenceFloatingNav'
import PlatformGlobalFloatingNav from './components/PlatformGlobalFloatingNav'
import './App.css'

function AppContent() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'
  const isTechIntelligenceSection = 
    location.pathname.startsWith('/technologies') || 
    location.pathname.startsWith('/innovation') ||
    location.pathname.startsWith('/commercialization')

  return (
    <div className="application">
      <Navbar />
      <main className={isLandingPage ? 'landing-app-shell' : 'app-shell'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/patents" element={<PatentLandscape />} />
          <Route path="/technologies" element={<TechnologyIntelligence />} />
          <Route path="/technologies/maturity" element={<TechnologyMaturity />} />
          <Route path="/technologies/adoption" element={<TechnologyAdoption />} />
          <Route path="/technologies/trends" element={<TechnologyTrends />} />
          <Route path="/innovation" element={<InnovationScoring />} />
          <Route path="/innovation-scoring" element={<InnovationScoring />} />
          <Route path="/commercialization" element={<Commercialization />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/research-papers" element={<ResearchPapers />} />
            <Route path="/funding" element={<FundingIntelligence />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {isLandingPage && <PlatformGlobalFloatingNav />}
      {isTechIntelligenceSection && <TechIntelligenceFloatingNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

