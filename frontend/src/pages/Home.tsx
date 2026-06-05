import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { getClassificationTypes } from "../api/client";
import ImportPanel from "../components/ImportPanel";
import type { ClassificationFile } from "../types/classification";

export default function Home() {
  const [types, setTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  async function loadTypes() {
    try {
      const data = await getClassificationTypes();
      setTypes(data);
    } catch {
      setError("Impossible de charger les classifications. Le backend est-il démarré ?");
    }
  }

  useEffect(() => {
    loadTypes();
  }, []);

  function handleImported(cf: ClassificationFile) {
    loadTypes();
    navigate(`/classifications/${encodeURIComponent(cf.type)}`);
  }

  return (
    <div>
      <div className="fr-mb-4w">
        <h1 className="fr-h1">Gestion des classifications ontologiques</h1>
        <p className="fr-text--lead">
          Ce système permet de gérer, visualiser et modifier les classifications
          de documents administratifs utilisées par la DGCL.
        </p>
        <Button
          iconId="fr-icon-upload-2-line"
          onClick={() => setShowImport(true)}
        >
          Importer une classification
        </Button>
      </div>

      {error && (
        <Alert severity="error" title="Erreur de connexion" description={error} className="fr-mb-3w" />
      )}

      {types.length === 0 && !error && (
        <div className="fr-callout fr-callout--blue-ecume fr-mb-3w">
          <p className="fr-callout__title">Aucune classification chargée</p>
          <p>
            Importez un fichier JSON pour commencer, ou vérifiez que le backend
            a bien chargé les données d'exemple.
          </p>
        </div>
      )}

      {types.length > 0 && (
        <>
          <h2 className="fr-h3 fr-mb-2w">
            Classifications disponibles ({types.length})
          </h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            {types.map((type) => (
              <div key={type} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <Card
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                  desc={`Classification de type « ${type} »`}
                  linkProps={{
                    to: `/classifications/${encodeURIComponent(type)}`,
                  }}
                  imageAlt=""
                  size="medium"
                  enlargeLink
                />
              </div>
            ))}
          </div>
        </>
      )}

      {showImport && (
        <ImportPanel
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
