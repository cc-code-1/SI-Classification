import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@codegouvfr/react-dsfr/Header";
import { Footer } from "@codegouvfr/react-dsfr/Footer";
import Home from "./pages/Home";
import ClassificationDetail from "./pages/ClassificationDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Header
        brandTop={
          <>
            RÉPUBLIQUE
            <br />
            FRANÇAISE
          </>
        }
        homeLinkProps={{ to: "/", title: "Accueil - SI Classifications DGCL" }}
        serviceTitle="SI Classifications"
        serviceTagline="Gestion des classifications ontologiques - DGCL"
        navigation={[
          { linkProps: { to: "/" }, text: "Accueil", isActive: true },
          {
            linkProps: { to: "/classifications" },
            text: "Classifications",
          },
        ]}
      />

      <main role="main" id="main-content" className="fr-container fr-py-4w">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/classifications"
            element={<ClassificationDetail />}
          />
          <Route
            path="/classifications/:type"
            element={<ClassificationDetail />}
          />
        </Routes>
      </main>

      <Footer
        brandTop={
          <>
            RÉPUBLIQUE
            <br />
            FRANÇAISE
          </>
        }
        homeLinkProps={{ to: "/", title: "Accueil" }}
        contentDescription="Système d'information de gestion des classifications ontologiques pour actes administratifs — Direction Générale des Collectivités Locales"
      />
    </BrowserRouter>
  );
}
