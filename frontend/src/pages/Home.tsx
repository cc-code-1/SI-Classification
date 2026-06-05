import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Card } from '@codegouvfr/react-dsfr/Card';
import { getClassificationTypes } from '../api/client';
import { ImportPanel } from '../components/ImportPanel';

export function Home() {
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadTypes = async () => {
    try {
      const data = await getClassificationTypes();
      setTypes(data);
    } catch {
      /* le backend n'est peut-être pas encore démarré */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  return (
    <div className="fr-container fr-py-6w">
      {/* En-tête de page */}
      <div className="fr-mb-6w">
        <h1 className="fr-h1">
          Système de gestion des classifications ontologiques
        </h1>
        <p className="fr-text--lead">
          Gérez, consultez et importez les classifications ontologiques utilisées pour
          qualifier les actes administratifs français. Cet outil est destiné aux équipes
          de la Direction Générale des Collectivités Locales (DGCL).
        </p>
        <div className="fr-btns-group fr-btns-group--inline fr-mt-3w">
          <ImportPanel onImported={loadTypes} />
          <Button
            iconId="fr-icon-arrow-right-line"
            iconPosition="right"
            onClick={() => navigate('/classifications')}
          >
            Voir les classifications
          </Button>
        </div>
      </div>

      {/* Grille des types disponibles */}
      <h2 className="fr-h4 fr-mb-3w">Classifications disponibles</h2>
      {loading ? (
        <p className="fr-text--sm fr-text--mention">Chargement…</p>
      ) : types.length === 0 ? (
        <p className="fr-text--sm fr-text--mention">
          Aucune classification chargée. Importez un fichier JSON pour commencer.
        </p>
      ) : (
        <div className="fr-grid-row fr-grid-row--gutters">
          {types.map((type) => (
            <div key={type} className="fr-col-12 fr-col-md-4">
              <Card
                title={type}
                desc={`Consulter et gérer la classification « ${type} »`}
                linkProps={{ href: `/classifications/${encodeURIComponent(type)}`, onClick: (e: React.MouseEvent) => { e.preventDefault(); navigate(`/classifications/${encodeURIComponent(type)}`); } }}
                footer={
                  <Button
                    onClick={() => navigate(`/classifications/${encodeURIComponent(type)}`)}
                    size="small"
                    priority="secondary"
                  >
                    Ouvrir
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
