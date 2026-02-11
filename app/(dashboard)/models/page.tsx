'use client';

import { useState } from 'react';
import type { Model } from '@/types';
import { useModels } from '@/hooks/useModels';
import RefreshButton from '@/components/ui/RefreshButton';
import ModelGrid from '@/components/models/ModelGrid';
import NewModelModal from '@/components/models/NewModelModal';
import ModelDetailModal from '@/components/models/ModelDetailModal';

export default function ModelsPage() {
  const { models, modelImages, isLoadingPage, refresh, loadModelImages } = useModels();
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [newModelModal, setNewModelModal] = useState(false);
  const [modelDetailModal, setModelDetailModal] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Models</h1>
          <p className="text-[var(--text-muted)]">Manage personas with multiple reference images</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={refresh} />
          <button
            onClick={() => setNewModelModal(true)}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            + New Model
          </button>
        </div>
      </div>

      <ModelGrid
        models={models}
        isLoading={isLoadingPage}
        onModelClick={(model) => {
          setSelectedModel(model);
          loadModelImages(model.id);
          setModelDetailModal(true);
        }}
        onNewModel={() => setNewModelModal(true)}
      />

      <NewModelModal
        open={newModelModal}
        onClose={() => setNewModelModal(false)}
        onCreated={refresh}
      />

      <ModelDetailModal
        open={modelDetailModal}
        onClose={() => setModelDetailModal(false)}
        model={selectedModel}
        modelImages={modelImages}
        loadModelImages={loadModelImages}
        loadModels={refresh}
      />
    </div>
  );
}
