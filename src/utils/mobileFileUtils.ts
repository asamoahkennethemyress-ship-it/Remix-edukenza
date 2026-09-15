/**
 * EDUkenZA Mobile File & Media Utilities
 * Handles Blobs, base64 strings, and downloads cleanly to prevent native iOS/Android
 * WebView CORS and filesystem sandbox issues.
 */

/**
 * Converts a standard File or Blob to a base64 Data URL string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URL to a standard Blob
 */
export function base64ToBlob(base64DataUrl: string, defaultMimeType: string = 'application/octet-stream'): Blob {
  const parts = base64DataUrl.split(';base64,');
  const contentType = parts.length > 1 ? parts[0].split(':')[1] : defaultMimeType;
  const raw = window.atob(parts.length > 1 ? parts[1] : parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Downloads a Blob cleanly across desktop and mobile WebViews
 */
export function downloadBlobFile(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('Error initiating file download on mobile webview:', err);
  }
}

/**
 * Shares or downloads a file depending on device capabilities (Web Share API support)
 */
export async function shareOrDownloadFile(blob: Blob, filename: string, title?: string): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
          text: `Document from EDUkenZA: ${filename}`
        });
        return;
      }
    }
  } catch (shareErr) {
    console.warn('Web share cancelled or unsupported, falling back to download:', shareErr);
  }

  downloadBlobFile(blob, filename);
}
