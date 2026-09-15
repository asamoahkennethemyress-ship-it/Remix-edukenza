import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig, db } from '../firebase/config';
import { logAuthDebug } from './debugLogger';

/**
 * Creates a new Firebase Authentication user account using a secondary app instance.
 * This guarantees that the current active user session (e.g. Platform Owner or School Admin)
 * is NOT logged out when creating user credentials.
 */
export async function createAuthUserWithoutLoggingIn(
  email: string, 
  pass: string, 
  responsibleFunction: string
): Promise<{ uid: string; createdNew: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  
  logAuthDebug({
    functionName: responsibleFunction,
    action: 'USER_CREATION',
    email: cleanEmail,
    details: 'Initiating secondary Firebase Auth user creation...'
  });

  let secondaryApp;
  const secondaryAppName = 'EdukenzaAdminCreatorApp';
  const existingApps = getApps();
  const found = existingApps.find(a => a.name === secondaryAppName);
  
  if (found) {
    secondaryApp = found;
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
    const newUid = userCred.user.uid;

    // Immediately clear the secondary app auth state so no residual session remains
    await secondaryAuth.signOut().catch(() => {});

    logAuthDebug({
      functionName: responsibleFunction,
      action: 'AUTH_SUCCESS',
      uid: newUid,
      email: cleanEmail,
      details: 'Successfully created user in Firebase Authentication without disturbing main session.'
    });

    return { uid: newUid, createdNew: true };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      logAuthDebug({
        functionName: responsibleFunction,
        action: 'USER_CREATION',
        email: cleanEmail,
        details: 'Email is already in use in Firebase Auth. Checking existing Firestore user document...'
      });

      try {
        const collectionsToCheck = ['users', 'parents', 'teachers', 'students'];
        for (const colName of collectionsToCheck) {
          const colRef = collection(db, colName);
          const q = query(colRef, where('email', '==', cleanEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const existingData = snap.docs[0].data();
            const existingUid = existingData.uid || snap.docs[0].id;
            return { uid: existingUid, createdNew: false };
          }
        }
      } catch (firestoreErr) {
        console.warn('Error querying existing user in Firestore:', firestoreErr);
      }

      // If no document exists in Firestore yet, fail explicitly rather than fabricating a fallback UID
      throw new Error(`Authentication user exists for "${cleanEmail}", but no authorized Firestore profile was found in EDUkenZA.`);
    }

    if (err.code === 'auth/operation-not-allowed') {
      logAuthDebug({
        functionName: responsibleFunction,
        action: 'USER_CREATION',
        email: cleanEmail,
        details: 'Email/Password provider is disabled in Firebase Auth settings for project edukenza-2ab0.'
      });
      throw new Error(
        'Student registration failed: The Email/Password authentication provider is disabled in Firebase project "edukenza-2ab0". Please enable Email/Password under Firebase Console > Authentication > Sign-in method.'
      );
    }

    logAuthDebug({
      functionName: responsibleFunction,
      action: 'AUTH_FAILURE',
      email: cleanEmail,
      details: `Firebase Auth creation info: ${err.code || err.message}`
    });

    throw err;
  }
}

/**
 * Attempts to remove a user from Firebase Auth using secondary app instance if possible,
 * without logging out the primary session.
 */
export async function deleteAuthUserWithoutLoggingOut(
  email: string,
  pass?: string,
  responsibleFunction: string = 'deleteAuthUser'
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  
  logAuthDebug({
    functionName: responsibleFunction,
    action: 'FIRESTORE_DELETE',
    email: cleanEmail,
    details: 'Attempting to delete user from Firebase Auth via secondary app instance...'
  });

  try {
    const secondaryAppName = 'EdukenzaAdminCreatorApp';
    const existingApps = getApps();
    const found = existingApps.find(a => a.name === secondaryAppName);
    const secondaryApp = found || initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    if (pass) {
      const { signInWithEmailAndPassword, deleteUser } = await import('firebase/auth');
      const userCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, pass);
      if (userCred.user) {
        await deleteUser(userCred.user);
        logAuthDebug({
          functionName: responsibleFunction,
          action: 'AUTH_SUCCESS',
          email: cleanEmail,
          details: 'Successfully deleted Firebase Auth user via secondary Auth.'
        });
        return true;
      }
    }
  } catch (err: any) {
    logAuthDebug({
      functionName: responsibleFunction,
      action: 'AUTH_FAILURE',
      email: cleanEmail,
      details: `Secondary Auth deletion info: ${err?.code || err?.message}`
    });
  }
  return false;
}

