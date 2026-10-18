import { AddPhotoInput, PHOTO_MIME_TYPES } from '@habitlonia/shared';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PickedPhotos = { photos: AddPhotoInput[]; skipped: number };

/**
 * Opens the photo library and returns the chosen images ready to upload.
 * Native pickers hand back JPEG data; on web we get the original file, so
 * anything the API doesn't take (GIFs, etc.) is counted in `skipped`.
 */
export async function pickPhotos(limit: number): Promise<PickedPhotos> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return { photos: [], skipped: 0 };

  const photos: AddPhotoInput[] = [];
  let skipped = 0;
  for (const asset of result.assets) {
    const mimeType = Platform.OS === 'web' ? asset.mimeType : 'image/jpeg';
    const input = AddPhotoInput.safeParse({ mimeType, data: asset.base64 });
    if (input.success) photos.push(input.data);
    else skipped++;
  }
  return { photos, skipped };
}

export const SUPPORTED_PHOTO_TYPES = PHOTO_MIME_TYPES.map((t) => t.replace('image/', '').toUpperCase()).join(', ');
