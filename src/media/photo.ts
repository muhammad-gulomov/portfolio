const PHOTO_KEY = 'profile-photo'

export async function putPhoto(bucket: R2Bucket, file: File): Promise<void> {
  if (file.size === 0) throw new Error('No file to store')
  if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed')
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large')

  await bucket.put(PHOTO_KEY, file.stream(), { httpMetadata: { contentType: file.type } })
}

export async function getPhoto(bucket: R2Bucket): Promise<R2ObjectBody | null> {
  return bucket.get(PHOTO_KEY)
}
