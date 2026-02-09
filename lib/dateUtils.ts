export function getCreatedDateDisplay(createdAt?: string): string {
  if (!createdAt) return '-';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleDateString('en-GB');
}

export function getScheduledDateDisplay(scheduledFor?: string, timezone = 'Asia/Kolkata'): string {
  if (!scheduledFor) return '-';
  const date = new Date(scheduledFor);
  if (Number.isNaN(date.getTime())) return scheduledFor;

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date);

  let offset = 'GMT';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    offset = parts.find((part) => part.type === 'timeZoneName')?.value || offset;
  } catch {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date);
    offset = parts.find((part) => part.type === 'timeZoneName')?.value || offset;
  }

  return `${datePart}, ${timePart} ${offset}`;
}

export async function downloadVideo(
  url: string,
  filename?: string,
  showToast?: (message: string, type?: string) => void
): Promise<void> {
  try {
    showToast?.('Starting download...', 'success');
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    showToast?.('Download failed, opening in new tab', 'error');
    window.open(url, '_blank');
  }
}

export function copyToClipboard(
  text: string,
  showToast?: (message: string, type?: string) => void
): void {
  navigator.clipboard.writeText(text);
  showToast?.('Copied!', 'success');
}
