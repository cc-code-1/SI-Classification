import React from 'react';
import { Button } from '@codegouvfr/react-dsfr/Button';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmPriority?: 'primary' | 'secondary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmer',
  confirmPriority = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(22, 22, 22, 0.64)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          background: 'var(--background-default-grey, white)',
          borderRadius: '4px',
          padding: '2rem',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        <p id="confirm-modal-title" className="fr-h5" style={{ marginBottom: '0.75rem' }}>
          {title}
        </p>
        <p className="fr-text--sm" style={{ color: 'var(--text-mention-grey)', marginBottom: '1.5rem' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button priority="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button priority={confirmPriority} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
