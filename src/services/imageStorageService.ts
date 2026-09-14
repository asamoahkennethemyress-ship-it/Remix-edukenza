import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../firebase/config';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Validates an image file for type, size, and dimensions
 */
export const validateImageFile = (
  file: File, 
  maxMb: number = 5,
  minDimension: number = 50,
  maxDimension: number = 4000
): Promise<ImageValidationResult> => {
  return new Promise((resolve) => {
    if (!file) {
      return resolve({ valid: false, error: 'No file provided for upload.' });
    }

    // MIME type check
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      return resolve({
        valid: false,
        error: `Invalid file format (${file.type || 'unknown'}). Please upload a JPG, PNG, WEBP, or SVG image.`
      });
    }

    // Size check
    const maxSizeBytes = maxMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return resolve({
        valid: false,
        error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of ${maxMb} MB.`
      });
    }

    // Dimensions check
    if (file.type === 'image/svg+xml') {
      return resolve({ valid: true });
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (width < minDimension || height < minDimension) {
        return resolve({
          valid: false,
          error: `Image dimensions (${width}x${height}px) are too small. Minimum required is ${minDimension}x${minDimension}px.`,
          width,
          height
        });
      }

      if (width > maxDimension || height > maxDimension) {
        return resolve({
          valid: false,
          error: `Image dimensions (${width}x${height}px) are too large. Maximum allowed is ${maxDimension}x${maxDimension}px.`,
          width,
          height
        });
      }

      return resolve({ valid: true, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      return resolve({
        valid: false,
        error: 'Unable to process or decode the image file. It may be corrupted.'
      });
    };

    img.src = objectUrl;
  });
};

/**
 * Uploads a school logo to Firebase Storage partitioned by schoolId
 */
export const uploadSchoolLogo = async (
  schoolId: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<string> => {
  if (!schoolId) {
    throw new Error('Authoritative school ID is required for school logo storage.');
  }

  const validation = await validateImageFile(file, 5);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid logo image file.');
  }

  const cleanSchoolId = schoolId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `logo_${Date.now()}.${extension}`;
  const storagePath = `schools/${cleanSchoolId}/branding/${fileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        schoolId: cleanSchoolId,
        uploadedAt: new Date().toISOString(),
        purpose: 'school_logo'
      }
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error(`[STORAGE ERROR] Failed to upload school logo to ${storagePath}:`, error);
        reject(new Error(`Logo upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Failed to retrieve download URL: ${err.message}`));
        }
      }
    );
  });
};

/**
 * Uploads a profile/passport photo for a student, teacher, or parent
 */
export const uploadProfilePhoto = async (
  schoolId: string,
  category: 'students' | 'teachers' | 'parents',
  entityId: string,
  file: File,
  onProgress?: (progressPercent: number) => void
): Promise<string> => {
  if (!schoolId) {
    throw new Error('Authoritative school ID is required for profile photo storage.');
  }
  if (!entityId) {
    throw new Error('Entity ID is required for profile photo storage.');
  }

  const validation = await validateImageFile(file, 5);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid profile photo file.');
  }

  const cleanSchoolId = schoolId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `photo_${Date.now()}.${extension}`;
  const storagePath = `schools/${cleanSchoolId}/${category}/${cleanEntityId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        schoolId: cleanSchoolId,
        category,
        entityId: cleanEntityId,
        uploadedAt: new Date().toISOString(),
        purpose: 'passport_profile_photo'
      }
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error(`[STORAGE ERROR] Failed to upload ${category} photo to ${storagePath}:`, error);
        reject(new Error(`Profile photo upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Failed to retrieve profile photo download URL: ${err.message}`));
        }
      }
    );
  });
};

/**
 * Removes an image from Firebase Storage if it matches the bucket URL
 */
export const deleteStorageImage = async (imageUrl: string): Promise<boolean> => {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    return false;
  }

  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('[STORAGE DELETE NOTICE] Could not delete old image object:', err);
    return false;
  }
};

export const deleteProfilePhoto = deleteStorageImage;
