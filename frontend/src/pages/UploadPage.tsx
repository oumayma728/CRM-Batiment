import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadZone } from '../components/UploadZone';
import type { FactureExtractionResult, PlanResponse, DocumentType } from '../types';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  const handleExtractionSuccess = (result: FactureExtractionResult | PlanResponse, _docType: DocumentType) => {
    if (result.id) {
      navigate(`/validation/${result.id}`);
    } else {
      navigate('/documents');
    }
  };

  return (
    <>
      <header className="mb-lg">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Hub d'Upload</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Déposez vos documents techniques pour une extraction de données haute précision propulsée par l'IA.
        </p>
      </header>

      <UploadZone onExtractionSuccess={handleExtractionSuccess} />
    </>
  );
};
