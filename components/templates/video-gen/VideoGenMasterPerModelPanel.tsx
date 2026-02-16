import { Expand, RefreshCw } from 'lucide-react';
import type { GeneratedImage, VideoGenConfig as VGC } from '@/types';
import type { MasterModel } from '@/components/templates/NodeConfigPanel';
import type { FirstFrameOption } from './types';

type Props = {
  masterMode?: boolean;
  masterModels?: MasterModel[];
  config: VGC;
  masterPerModelResults: Record<string, FirstFrameOption[]>;
  masterGeneratingIds: Set<string>;
  masterLibraryModelId: string | null;
  masterLibraryImages: GeneratedImage[];
  isLoadingMasterLibrary: boolean;
  isMasterGeneratingAll: boolean;
  setPreviewUrl: (url: string | null) => void;
  setMasterLibraryModelId: (modelId: string | null) => void;
  masterGenerateForModel: (modelId: string, primaryGcsUrl: string) => Promise<FirstFrameOption[] | null>;
  handleMasterBrowseLibrary: (modelId: string) => Promise<void>;
  handleMasterSelectForModel: (modelId: string, gcsUrl: string) => void;
};

export default function VideoGenMasterPerModelPanel({
  masterMode,
  masterModels,
  config,
  masterPerModelResults,
  masterGeneratingIds,
  masterLibraryModelId,
  masterLibraryImages,
  isLoadingMasterLibrary,
  isMasterGeneratingAll,
  setPreviewUrl,
  setMasterLibraryModelId,
  masterGenerateForModel,
  handleMasterBrowseLibrary,
  handleMasterSelectForModel,
}: Props) {
  if (!masterMode || !masterModels || masterModels.length === 0 || !config.extractedFrameUrl) {
    return null;
  }

  return (
    <div className="space-y-2">
      {masterModels.map((model) => {
        const results = masterPerModelResults[model.modelId] || [];
        const selected = config.masterFirstFrames?.[model.modelId];
        const isGenerating = masterGeneratingIds.has(model.modelId);

        return (
          <div key={model.modelId} className="rounded-xl border border-[var(--border)] p-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <img
                src={model.primaryImageUrl}
                alt={model.modelName}
                className="h-10 w-10 rounded-lg object-cover shrink-0 border border-[var(--border)] cursor-pointer"
                onClick={() => setPreviewUrl(model.primaryImageUrl)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{model.modelName}</p>
                {selected && <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">First frame selected</p>}
              </div>
              {isGenerating && <span className="h-4 w-4 rounded-full border-2 border-[var(--text-muted)]/30 border-t-master animate-spin shrink-0" />}
              {!isGenerating && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {results.length === 0 ? (
                    <button
                      onClick={() => masterGenerateForModel(model.modelId, model.primaryGcsUrl)}
                      disabled={isMasterGeneratingAll}
                      className="rounded-lg bg-master-light dark:bg-master-light px-2.5 py-1 text-[10px] font-medium text-master dark:text-master-muted transition-colors hover:bg-master-light/80 dark:hover:bg-master-light/80 disabled:opacity-50"
                    >
                      Generate
                    </button>
                  ) : (
                    <button
                      onClick={() => masterGenerateForModel(model.modelId, model.primaryGcsUrl)}
                      disabled={isMasterGeneratingAll}
                      className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--accent)] disabled:opacity-50"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleMasterBrowseLibrary(model.modelId)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      masterLibraryModelId === model.modelId
                        ? 'bg-master text-white'
                        : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--accent)] hover:text-[var(--text)]'
                    }`}
                  >
                    {masterLibraryModelId === model.modelId ? 'Hide' : 'Choose'}
                  </button>
                </div>
              )}
            </div>

            {results.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {results.map((opt, index) => {
                  const isSelected = selected === opt.gcsUrl;
                  return (
                    <button
                      key={index}
                      onClick={() => handleMasterSelectForModel(model.modelId, opt.gcsUrl)}
                      className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all duration-150 ${
                        isSelected ? 'border-master shadow-md' : 'border-[var(--border)] hover:border-master-muted'
                      }`}
                    >
                      <img src={opt.url} alt={`Option ${String.fromCharCode(65 + index)}`} className="h-full w-full object-cover" />
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewUrl(opt.url);
                        }}
                        className="absolute bottom-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                      >
                        <Expand className="h-2.5 w-2.5" />
                      </div>
                      {isSelected && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-master/90 to-transparent py-1 text-center">
                          <span className="text-[10px] font-semibold text-white">Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {masterLibraryModelId === model.modelId && (
              <div className="rounded-lg bg-[var(--background)] p-2 space-y-1.5 border border-[var(--border)]">
                {isLoadingMasterLibrary ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--text-muted)]/30 border-t-master animate-spin" />
                    <span className="text-[10px] text-[var(--text-muted)]">Loading...</span>
                  </div>
                ) : masterLibraryImages.length === 0 ? (
                  <p className="py-4 text-center text-[10px] text-[var(--text-muted)]">No previous generations</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 max-h-[300px] overflow-y-auto">
                    {masterLibraryImages.map((img) => {
                      const displayUrl = img.signedUrl || img.gcsUrl;
                      const isSelected = selected === img.gcsUrl;
                      return (
                        <button
                          key={img.id}
                          onClick={() => {
                            handleMasterSelectForModel(model.modelId, img.gcsUrl);
                            setMasterLibraryModelId(null);
                          }}
                          className={`group relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                            isSelected ? 'border-master shadow-md' : 'border-[var(--border)] hover:border-master-muted'
                          }`}
                        >
                          <img src={displayUrl} alt={img.filename} className="h-full w-full object-cover" />
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewUrl(displayUrl);
                            }}
                            className="absolute bottom-0.5 right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                          >
                            <Expand className="h-2 w-2" />
                          </div>
                          {isSelected && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-master/90 to-transparent py-0.5 text-center">
                              <span className="text-[9px] font-semibold text-white">Selected</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
