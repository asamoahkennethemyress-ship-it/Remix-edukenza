import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import {
  LibraryResource,
  LibraryBorrowRecord,
  LibraryReadingProgress,
  LibraryReview,
  LibraryDiscussion,
  LibraryAnalyticsData,
  LibraryCategory,
  LibraryFormat,
  UserLibraryBookmark,
  UserRecentlyViewed
} from '../types/library';

export class LibraryService {
  /**
   * Real-time subscription to authoritative library resources for a school
   * Strict school isolation enforced via where('schoolId', '==', schoolId)
   * Role-based visibility applied dynamically
   */
  static subscribeToResources(
    schoolId: string,
    callback: (resources: LibraryResource[]) => void,
    options?: {
      userRole?: 'student' | 'teacher' | 'school_admin' | 'owner' | 'parent';
      userId?: string;
    }
  ) {
    const sId = schoolId || '';
    if (!sId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'libraryResources'),
      where('schoolId', '==', sId)
    );

    return onSnapshot(q, (snapshot) => {
      let items: LibraryResource[] = [];
      snapshot.forEach(d => {
        items.push({ id: d.id, ...d.data() } as LibraryResource);
      });

      // Role-based filtering
      if (options?.userRole) {
        const role = options.userRole;
        const uId = options.userId;
        if (role === 'student') {
          items = items.filter(r => r.status === 'published' && r.targetAudience !== 'teachers');
        } else if (role === 'parent') {
          items = items.filter(r => r.status === 'published' && r.targetAudience !== 'teachers');
        } else if (role === 'teacher') {
          items = items.filter(r => r.status === 'published' || (uId && r.uploaderId === uId));
        }
      }

      callback(items);
    }, (err) => {
      console.warn('Library resources snapshot listener notice:', err);
      callback([]);
    });
  }

  /**
   * Upload real resource file to Firebase Storage
   * Returns download URL, storage path, calculated file size and inferred format
   */
  static async uploadResourceFile(
    schoolId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ downloadUrl: string; storagePath: string; fileSize: string; format: LibraryFormat }> {
    const ext = (file.name.split('.').pop() || 'PDF').toUpperCase();
    let format: LibraryFormat = 'PDF';
    if (['PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT', 'EPUB', 'ZIP', 'RAR', 'PNG', 'JPG', 'MP3', 'MP4', 'MOV', 'HTML'].includes(ext)) {
      format = ext as LibraryFormat;
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `schools/${schoolId}/library/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        customMetadata: {
          schoolId,
          originalName: file.name
        }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.error('Library file upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            const formattedSize = file.size >= 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`;
            resolve({
              downloadUrl,
              storagePath,
              fileSize: formattedSize,
              format
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  /**
   * Upload real cover image to Firebase Storage
   */
  static async uploadCoverImage(
    schoolId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `schools/${schoolId}/library/covers/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        customMetadata: {
          schoolId,
          originalName: file.name
        }
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        (error) => {
          console.error('Cover image upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadUrl, storagePath });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  /**
   * Add a new library resource
   */
  static async createResource(resource: Omit<LibraryResource, 'id'>): Promise<string> {
    const newId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const refDoc = doc(db, 'libraryResources', newId);
    const data: LibraryResource = {
      ...resource,
      id: newId,
      downloadsCount: resource.downloadsCount || 0,
      viewsCount: resource.viewsCount || 0,
      rating: resource.rating || 5.0,
      ratingsCount: resource.ratingsCount || 1,
      version: resource.version || '1.0',
      status: resource.status || 'published',
      targetAudience: resource.targetAudience || 'all',
      publishedAt: resource.publishedAt || new Date().toISOString().split('T')[0]
    };

    await setDoc(refDoc, data);
    return newId;
  }

  /**
   * Update an existing resource
   */
  static async updateResource(id: string, updates: Partial<LibraryResource>): Promise<void> {
    const refDoc = doc(db, 'libraryResources', id);
    await updateDoc(refDoc, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Delete or archive a resource with underlying storage cleanup
   */
  static async deleteResource(id: string, storageFilePath?: string, storageCoverPath?: string): Promise<void> {
    const refDoc = doc(db, 'libraryResources', id);
    await deleteDoc(refDoc);

    if (storageFilePath) {
      try {
        const fileRef = ref(storage, storageFilePath);
        await deleteObject(fileRef);
      } catch (e) {
        console.warn('Storage file deletion notice:', e);
      }
    }

    if (storageCoverPath) {
      try {
        const coverRef = ref(storage, storageCoverPath);
        await deleteObject(coverRef);
      } catch (e) {
        console.warn('Storage cover deletion notice:', e);
      }
    }
  }

  /**
   * Real-time Bookmarks per authenticated user
   */
  static subscribeToBookmarks(
    userId: string,
    callback: (bookmarks: UserLibraryBookmark[]) => void
  ) {
    if (!userId) {
      callback([]);
      return () => {};
    }
    const q = query(
      collection(db, 'libraryBookmarks'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const list: UserLibraryBookmark[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as UserLibraryBookmark));
      callback(list);
    }, (err) => {
      console.warn('Bookmarks listener notice:', err);
      callback([]);
    });
  }

  /**
   * Toggle bookmark for current user
   */
  static async toggleBookmark(userId: string, schoolId: string, resource: LibraryResource): Promise<boolean> {
    const bookmarkDocId = `bm_${userId}_${resource.id}`;
    const bRef = doc(db, 'libraryBookmarks', bookmarkDocId);
    const snap = await getDoc(bRef);
    if (snap.exists()) {
      await deleteDoc(bRef);
      return false;
    } else {
      const newBm: UserLibraryBookmark = {
        id: bookmarkDocId,
        userId,
        schoolId: schoolId || resource.schoolId,
        resourceId: resource.id,
        resourceTitle: resource.title,
        author: resource.author,
        subject: resource.subject,
        category: resource.category,
        format: resource.format,
        coverImage: resource.coverImage,
        fileUrl: resource.fileUrl,
        createdAt: new Date().toISOString()
      };
      await setDoc(bRef, newBm);
      return true;
    }
  }

  /**
   * Track recently viewed resource per user
   */
  static async trackRecentlyViewed(userId: string, schoolId: string, resource: LibraryResource): Promise<void> {
    if (!userId || !resource?.id) return;
    const historyDocId = `rv_${userId}_${resource.id}`;
    const hRef = doc(db, 'libraryRecentlyViewed', historyDocId);
    const item: UserRecentlyViewed = {
      id: historyDocId,
      userId,
      schoolId: schoolId || resource.schoolId,
      resourceId: resource.id,
      resourceTitle: resource.title,
      author: resource.author,
      subject: resource.subject,
      category: resource.category,
      format: resource.format,
      coverImage: resource.coverImage,
      fileUrl: resource.fileUrl,
      viewedAt: new Date().toISOString()
    };
    await setDoc(hRef, item, { merge: true });
    await this.trackView(resource.id);
  }

  /**
   * Real-time Recently Viewed per user
   */
  static subscribeToRecentlyViewed(
    userId: string,
    callback: (items: UserRecentlyViewed[]) => void
  ) {
    if (!userId) {
      callback([]);
      return () => {};
    }
    const q = query(
      collection(db, 'libraryRecentlyViewed'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const list: UserRecentlyViewed[] = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as UserRecentlyViewed));
      list.sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());
      callback(list);
    }, (err) => {
      console.warn('Recently viewed listener notice:', err);
      callback([]);
    });
  }

  /**
   * Duplicate a resource for versioning
   */
  static async duplicateResource(original: LibraryResource, newVersion: string): Promise<string> {
    const newId = `res_v_${Date.now()}`;
    const newRes: Omit<LibraryResource, 'id'> = {
      ...original,
      title: `${original.title} (v${newVersion})`,
      version: newVersion,
      publishedAt: new Date().toISOString().split('T')[0],
      downloadsCount: 0,
      viewsCount: 0
    };
    return this.createResource(newRes);
  }

  /**
   * Increment view count
   */
  static async trackView(resourceId: string): Promise<void> {
    try {
      const ref = doc(db, 'libraryResources', resourceId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const currentViews = snap.data().viewsCount || 0;
        await updateDoc(ref, { viewsCount: currentViews + 1 });
      }
    } catch (e) {
      console.warn('Track view error:', e);
    }
  }

  /**
   * Increment download count
   */
  static async trackDownload(resourceId: string): Promise<void> {
    try {
      const ref = doc(db, 'libraryResources', resourceId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const currentDownloads = snap.data().downloadsCount || 0;
        await updateDoc(ref, { downloadsCount: currentDownloads + 1 });
      }
    } catch (e) {
      console.warn('Track download error:', e);
    }
  }

  /**
   * Subscribe to Borrow Records
   */
  static subscribeToBorrowRecords(
    schoolId: string,
    callback: (records: LibraryBorrowRecord[]) => void
  ) {
    const sId = schoolId || '';
    if (!sId) {
      callback([]);
      return () => {};
    }
    const q = query(
      collection(db, 'libraryBorrowRecords'),
      where('schoolId', '==', sId)
    );

    return onSnapshot(q, (snap) => {
      const records: LibraryBorrowRecord[] = [];
      snap.forEach(d => {
        records.push({ id: d.id, ...d.data() } as LibraryBorrowRecord);
      });
      callback(records);
    }, (err) => {
      console.warn('Borrow records listener warning:', err);
    });
  }

  /**
   * Borrow a book/resource
   */
  static async borrowResource(
    schoolId: string,
    resource: LibraryResource,
    studentId: string,
    studentName: string,
    studentGrade: string,
    daysToKeep: number = 14
  ): Promise<string> {
    const borrowId = `borrow_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const borrowedAt = new Date().toISOString();
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + daysToKeep);
    const dueDate = dueDateObj.toISOString();

    const qrCodeData = JSON.stringify({
      borrowId,
      resourceId: resource.id,
      title: resource.title,
      studentId,
      studentName,
      dueDate
    });

    const record: LibraryBorrowRecord = {
      id: borrowId,
      schoolId: schoolId || '',
      resourceId: resource.id,
      resourceTitle: resource.title,
      coverImage: resource.coverImage,
      format: resource.format,
      studentId,
      studentName,
      studentGrade,
      borrowedAt,
      dueDate,
      status: 'borrowed',
      renewalsCount: 0,
      qrCode: qrCodeData,
      isbnBarcode: resource.isbn || `ISBN-${resource.id.slice(0, 8).toUpperCase()}`
    };

    const ref = doc(db, 'libraryBorrowRecords', borrowId);
    await setDoc(ref, record);

    // If physical, decrease available count
    if (resource.isPhysical && (resource.availablePhysicalCopies || 0) > 0) {
      await this.updateResource(resource.id, {
        availablePhysicalCopies: (resource.availablePhysicalCopies || 1) - 1
      });
    }

    return borrowId;
  }

  /**
   * Return a borrowed book
   */
  static async returnResource(borrowId: string, resourceId: string): Promise<void> {
    const ref = doc(db, 'libraryBorrowRecords', borrowId);
    await updateDoc(ref, {
      status: 'returned',
      returnedAt: new Date().toISOString()
    });

    // Restore physical copy count
    try {
      const resRef = doc(db, 'libraryResources', resourceId);
      const snap = await getDoc(resRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.isPhysical) {
          await updateDoc(resRef, {
            availablePhysicalCopies: (data.availablePhysicalCopies || 0) + 1
          });
        }
      }
    } catch (e) {
      console.warn('Restore physical copy count warning:', e);
    }
  }

  /**
   * Renew a borrow record
   */
  static async renewResource(borrowId: string, additionalDays: number = 7): Promise<void> {
    const ref = doc(db, 'libraryBorrowRecords', borrowId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const currentDueDate = new Date(data.dueDate || new Date());
      currentDueDate.setDate(currentDueDate.getDate() + additionalDays);

      await updateDoc(ref, {
        dueDate: currentDueDate.toISOString(),
        renewalsCount: (data.renewalsCount || 0) + 1
      });
    }
  }

  /**
   * Reading Progress & Annotations
   */
  static async saveReadingProgress(progress: LibraryReadingProgress): Promise<void> {
    const progressId = `prog_${progress.userId}_${progress.resourceId}`;
    const ref = doc(db, 'libraryProgress', progressId);
    await setDoc(ref, {
      ...progress,
      id: progressId,
      lastReadAt: new Date().toISOString()
    }, { merge: true });

    // Cache to localStorage for instant offline access
    try {
      localStorage.setItem(`edukenza_lib_prog_${progress.resourceId}`, JSON.stringify(progress));
    } catch (e) {
      // ignore
    }
  }

  /**
   * Get cached reading progress
   */
  static getCachedReadingProgress(resourceId: string): LibraryReadingProgress | null {
    try {
      const raw = localStorage.getItem(`edukenza_lib_prog_${resourceId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return null;
  }

  /**
   * Offline Cache Resource Helper
   */
  static async cacheResourceOffline(resource: LibraryResource): Promise<boolean> {
    try {
      const existingOfflineStr = localStorage.getItem('edukenza_offline_resources') || '[]';
      const list: LibraryResource[] = JSON.parse(existingOfflineStr);
      const filtered = list.filter(r => r.id !== resource.id);
      filtered.push(resource);
      localStorage.setItem('edukenza_offline_resources', JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Offline caching error:', e);
      return false;
    }
  }

  /**
   * Get all offline cached resources
   */
  static getOfflineCachedResources(): LibraryResource[] {
    try {
      const raw = localStorage.getItem('edukenza_offline_resources');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return [];
  }

  /**
   * Reviews & Ratings
   */
  static async addReview(review: Omit<LibraryReview, 'id' | 'createdAt'>): Promise<void> {
    const revId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const ref = doc(db, 'libraryReviews', revId);
    const newRev: LibraryReview = {
      ...review,
      id: revId,
      createdAt: new Date().toISOString(),
      helpfulCount: 0
    };
    await setDoc(ref, newRev);

    // Update resource overall rating average
    try {
      const resRef = doc(db, 'libraryResources', review.resourceId);
      const snap = await getDoc(resRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentRating = data.rating || 5;
        const currentCount = data.ratingsCount || 1;
        const newCount = currentCount + 1;
        const newRating = Number(((currentRating * currentCount + review.rating) / newCount).toFixed(1));
        await updateDoc(resRef, {
          rating: newRating,
          ratingsCount: newCount
        });
      }
    } catch (e) {
      console.warn('Update resource rating notice:', e);
    }
  }

  /**
   * Subscribe to Resource Reviews
   */
  static subscribeToReviews(resourceId: string, callback: (reviews: LibraryReview[]) => void) {
    const q = query(
      collection(db, 'libraryReviews'),
      where('resourceId', '==', resourceId)
    );
    return onSnapshot(q, (snap) => {
      const revs: LibraryReview[] = [];
      snap.forEach(d => revs.push({ id: d.id, ...d.data() } as LibraryReview));
      callback(revs);
    }, (err) => console.warn('Reviews listener notice:', err));
  }

  /**
   * Discussions
   */
  static async addDiscussion(discussion: Omit<LibraryDiscussion, 'id' | 'createdAt' | 'replies'>): Promise<void> {
    const discId = `disc_${Date.now()}`;
    const ref = doc(db, 'libraryDiscussions', discId);
    const newDisc: LibraryDiscussion = {
      ...discussion,
      id: discId,
      createdAt: new Date().toISOString(),
      replies: []
    };
    await setDoc(ref, newDisc);
  }

  static async addDiscussionReply(discussionId: string, reply: { content: string; authorId: string; authorName: string; authorRole: string }): Promise<void> {
    const ref = doc(db, 'libraryDiscussions', discussionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as LibraryDiscussion;
      const replies = data.replies || [];
      replies.push({
        id: `rep_${Date.now()}`,
        ...reply,
        createdAt: new Date().toISOString()
      });
      await updateDoc(ref, { replies });
    }
  }

  static subscribeToDiscussions(resourceId: string, callback: (discussions: LibraryDiscussion[]) => void) {
    const q = query(
      collection(db, 'libraryDiscussions'),
      where('resourceId', '==', resourceId)
    );
    return onSnapshot(q, (snap) => {
      const list: LibraryDiscussion[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LibraryDiscussion));
      callback(list);
    }, (err) => console.warn('Discussions listener notice:', err));
  }
}
