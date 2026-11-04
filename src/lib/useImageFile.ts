'use client';

import { useEffect, useState } from 'react';

export type LoadedImage = { file: File; url: string; img: HTMLImageElement; width: number; height: number };

/**
 * Decodes a user-picked image (SVG included) before anything shows it: an <img> of a file that isn't an image makes
 * Chrome try a blob: fetch that the CSP blocks. The object URL is revoked when the file changes or on unmount.
 */
export function useImageFile() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImage(null);
    setFailed(false);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    let stale = false;
    img.decode().then(
      // SVGs without width/height have no natural size; draw them at 512 px.
      () => !stale && setImage({ file, url, img, width: img.naturalWidth || 512, height: img.naturalHeight || 512 }),
      () => !stale && setFailed(true),
    );
    return () => { stale = true; URL.revokeObjectURL(url); };
  }, [file]);

  return { file, setFile, image, failed };
}
