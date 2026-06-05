"""
Service de persistance S3/MinIO optionnel.

Si les variables S3_ENDPOINT_URL + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY sont
toutes définies, le service est actif. Sinon, toutes les méthodes sont des no-op
silencieux — l'application fonctionne sans S3 (données en mémoire).
"""
from __future__ import annotations

import io
import json
import logging
import os

logger = logging.getLogger(__name__)


class S3Service:
    def __init__(self) -> None:
        self._endpoint = os.getenv("S3_ENDPOINT_URL", "")
        self._access_key = os.getenv("S3_ACCESS_KEY_ID", "")
        self._secret_key = os.getenv("S3_SECRET_ACCESS_KEY", "")
        self._bucket = os.getenv("S3_BUCKET", "si-classification")
        self._prefix = os.getenv("S3_PREFIX", "classifications/")
        self._client = None

        if self.is_enabled:
            try:
                import boto3  # type: ignore

                self._client = boto3.client(
                    "s3",
                    endpoint_url=self._endpoint,
                    aws_access_key_id=self._access_key,
                    aws_secret_access_key=self._secret_key,
                )
            except Exception as e:
                logger.warning("[S3Service] Impossible d'initialiser le client boto3 : %s", e)
                self._client = None

    @property
    def is_enabled(self) -> bool:
        return bool(self._endpoint and self._access_key and self._secret_key)

    def _key(self, type_: str) -> str:
        return f"{self._prefix}{type_}.json"

    def list_classification_keys(self) -> list[str]:
        """Retourne la liste des types de classifications stockés sur S3."""
        if not self.is_enabled or self._client is None:
            return []
        try:
            paginator = self._client.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=self._bucket, Prefix=self._prefix)
            keys = []
            for page in pages:
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    # Retire le préfixe et l'extension .json
                    if key.startswith(self._prefix) and key.endswith(".json"):
                        type_ = key[len(self._prefix) : -len(".json")]
                        if type_:
                            keys.append(type_)
            return keys
        except Exception as e:
            logger.warning("[S3Service] Erreur lors du listage des objets : %s", e)
            return []

    def load_classification(self, type_: str) -> dict | None:
        """Télécharge et désérialise un fichier JSON depuis S3."""
        if not self.is_enabled or self._client is None:
            return None
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=self._key(type_))
            content = response["Body"].read()
            return json.loads(content)
        except Exception as e:
            logger.warning("[S3Service] Erreur lors du chargement de '%s' : %s", type_, e)
            return None

    def save_classification(self, type_: str, data: dict) -> None:
        """Sérialise et uploade un fichier JSON sur S3."""
        if not self.is_enabled or self._client is None:
            return
        try:
            content = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
            self._client.put_object(
                Bucket=self._bucket,
                Key=self._key(type_),
                Body=io.BytesIO(content),
                ContentType="application/json",
            )
        except Exception as e:
            logger.warning("[S3Service] Erreur lors de la sauvegarde de '%s' : %s", type_, e)

    def delete_classification(self, type_: str) -> None:
        """Supprime un fichier du bucket S3."""
        if not self.is_enabled or self._client is None:
            return
        try:
            self._client.delete_object(Bucket=self._bucket, Key=self._key(type_))
        except Exception as e:
            logger.warning("[S3Service] Erreur lors de la suppression de '%s' : %s", type_, e)


s3 = S3Service()  # singleton
