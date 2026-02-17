'use client';

import { X, Download, ThumbsUp, XCircle, CheckCircle2, Loader2, ExternalLink, RotateCcw, Copy, Pencil, Send, FileEdit } from 'lucide-react';
import type { TemplateJob, MasterConfigModel } from '@/types';

type PostRecord = {
  platform: string;
  status: string;
  platformPostUrl?: string;
  latePostId?: string;
};

const platformLabels: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
};

const platformColors: Record<string, string> = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  youtube: 'bg-red-600 text-white',
  twitter: 'bg-sky-500 text-white',
  facebook: 'bg-blue-600 text-white',
};

export default function MasterJobModal({
  job,
  modelInfo,
  onClose,
  onPost,
  onRepost,
  onReject,
  onQuickRegenerate,
  onEditRegenerate,
  onEditOverrides,
  hasOverrides,
  posting,
  regenerating,
  postRecords,
}: {
  job: TemplateJob;
  modelInfo?: MasterConfigModel;
  onClose: () => void;
  onPost: () => void;
  onRepost?: () => void;
  onReject: () => void;
  onQuickRegenerate?: () => void;
  onEditRegenerate?: () => void;
  onEditOverrides?: () => void;
  hasOverrides?: boolean;
  posting?: boolean;
  regenerating?: boolean;
  postRecords?: PostRecord[];
}) {
  const videoUrl = job.signedUrl || job.outputUrl;
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isBusy = posting || regenerating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            {modelInfo?.primaryImageUrl && (
              <img src={modelInfo.primaryImageUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700" />
            )}
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{modelInfo?.modelName || job.name}</div>
              <div className="flex items-center gap-1.5 text-[10px]">
                {job.postStatus ? (
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${
                    job.postStatus === 'posted' ? 'text-emerald-500' : 'text-red-400'
                  }`}>
                    {job.postStatus === 'posted' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {job.postStatus === 'posted' ? 'Approved' : 'Rejected'}
                  </span>
                ) : isCompleted ? (
                  <span className="text-neutral-500">Ready for review</span>
                ) : isFailed ? (
                  <span className="text-red-400">Failed</span>
                ) : (
                  <span className="text-neutral-500">{job.status}</span>
                )}
                {job.regeneratedFrom && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                    <Copy className="h-2.5 w-2.5" />
                    Regenerated
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          {videoUrl && isCompleted ? (
            <div className="bg-black">
              <video
                src={videoUrl}
                controls
                autoPlay
                className="mx-auto max-h-[55vh] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center">
              {job.status === 'processing' || job.status === 'queued' ? (
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-master-foreground" />
                  <div className="text-xs text-neutral-500">{job.step || 'Processing...'}</div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">
                  {isFailed ? 'Video generation failed' : 'No video available'}
                </div>
              )}
            </div>
          )}

          {/* Post records */}
          {postRecords && postRecords.length > 0 && (
            <div className="border-t border-neutral-200 bg-white px-4 py-3 space-y-2 dark:border-neutral-700 dark:bg-neutral-900">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Posted to</div>
              {postRecords.map((pr, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${platformColors[pr.platform] || 'bg-gray-500 text-white'}`}>
                    {platformLabels[pr.platform] || pr.platform}
                  </span>
                  <span className={`text-[10px] font-medium capitalize ${
                    pr.status === 'published' ? 'text-emerald-500' :
                    pr.status === 'failed' ? 'text-red-400' :
                    pr.status === 'scheduled' ? 'text-blue-400' :
                    'text-neutral-500'
                  }`}>
                    {pr.status}
                  </span>
                  {pr.platformPostUrl && (
                    <a
                      href={pr.platformPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 hover:bg-neutral-200 transition-colors dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {(isCompleted || isFailed) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 bg-white p-3.5 dark:border-neutral-700 dark:bg-neutral-900">
            {videoUrl && isCompleted && (
              <a
                href={videoUrl}
                download
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-750"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onQuickRegenerate}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Regen
            </button>
            <button
              onClick={onEditRegenerate}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit &</span> Regen
            </button>
            {isCompleted && !job.postStatus && onEditOverrides && (
              <button
                onClick={onEditOverrides}
                disabled={isBusy}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  hasOverrides
                    ? 'border-master bg-master/10 text-master-foreground'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <FileEdit className="h-3.5 w-3.5" />
                {hasOverrides ? 'Custom' : 'Caption'}
              </button>
            )}
            <div className="flex-1" />
            {isCompleted && !job.postStatus && (
              <>
                <button
                  onClick={onReject}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-neutral-800 dark:hover:bg-red-950/30"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={onPost}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-master px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
                >
                  {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                  Approve
                </button>
              </>
            )}
            {isCompleted && job.postStatus === 'posted' && onRepost && (
              <button
                onClick={onRepost}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-lg bg-master px-4 py-2 text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
              >
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Repost
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
