import { authFetch } from '@/lib/auth-client'

export type UploadKind = 'avatar' | 'kyc_selfie' | 'kyc_nic_front' | 'kyc_nic_back' | 'status'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const TARGET_MAX_BYTES = 4 * 1024 * 1024

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    let quality = JPEG_QUALITY
    let blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.4) {
      quality -= 0.15
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    }
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export interface UploadProgress { stage: 'compressing' | 'uploading' }

/** Compresses an image and uploads it directly to Firebase Storage via a short-lived signed URL. */
export async function uploadImageDirect(file: File, kind: UploadKind, onProgress?: (p: UploadProgress) => void): Promise<string> {
  onProgress?.({ stage: 'compressing' })
  const prepared = await compressImage(file)
  if (prepared.size > TARGET_MAX_BYTES) throw new Error('Image is too large even after compression — try a smaller photo.')
  onProgress?.({ stage: 'uploading' })

  const signRes = await authFetch('/api/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, contentType: prepared.type }),
  })
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}))
    throw new Error(err.error || 'Could not start upload')
  }
  const { uploadUrl, downloadUrl } = await signRes.json() as { uploadUrl: string; downloadUrl: string }
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': prepared.type },
    body: prepared,
  })
  if (!uploadRes.ok) throw new Error('Upload to Firebase Storage failed')
  return downloadUrl
}
