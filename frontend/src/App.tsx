import React from 'react'; // eslint-disable-line
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@codegouvfr/react-dsfr/Header';
import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { Home } from './pages/Home';
import { ClassificationDetail } from './pages/ClassificationDetail';
import { useAuth } from './auth/AuthContext';
import { ImportModalHost, openImportModal } from './components/ImportPanel';
import type { HeaderProps } from '@codegouvfr/react-dsfr/Header';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const quickAccessItems: HeaderProps.QuickAccessItem[] = [];
  if (auth.isEnabled) {
    if (auth.isLoggedIn) {
      quickAccessItems.push({ iconId: 'fr-icon-logout-box-r-line', text: auth.username ? `Se déconnecter (${auth.username})` : 'Se déconnecter', buttonProps: { onClick: () => auth.logout() } });
    } else {
      quickAccessItems.push({ iconId: 'fr-icon-account-line', text: 'Se connecter', buttonProps: { onClick: () => auth.login() } });
    }
  }

  return (
    <>
      <Header
        quickAccessItems={quickAccessItems}
        brandTop={<>RÉPUBLIQUE<br />FRANÇAISE</>}
        homeLinkProps={{ href: '#/', title: 'Accueil — Classif’Actes DGCL', onClick: (e) => { e.preventDefault(); navigate('/'); } }}
        serviceTitle="Classif’Actes"
        serviceTagline="Direction Générale des Collectivités Locales"
        navigation={[
          { text: 'Accueil', linkProps: { href: '#/', onClick: (e) => { e.preventDefault(); navigate('/'); } }, isActive: location.pathname === '/' },
          { text: 'Classifications', linkProps: { href: '#/classifications', onClick: (e) => { e.preventDefault(); navigate('/classifications'); } }, isActive: location.pathname.startsWith('/classifications') },
          { text: 'Importer', linkProps: { href: '#', onClick: (e) => { e.preventDefault(); openImportModal(); } }, isActive: false },
        ]}
      />
      <ImportModalHost />
      <main role="main" id="content" style={{ minHeight: 'calc(100vh - 280px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/classifications" element={<Home />} />
          <Route path="/classifications/:type" element={<ClassificationDetail />} />
        </Routes>
      </main>
      <Footer
        accessibility="non compliant"
        contentDescription="Classif’Actes — Système de gestion des classifications ontologiques pour les actes administratifs français. DGCL."
        termsLinkProps={{ href: '/mentions-legales' }}
      />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
