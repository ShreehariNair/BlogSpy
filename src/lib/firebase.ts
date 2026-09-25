import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore } from 'firebase/firestore';

// Safe eager loader for firebase-applet-config.json (present in AI Studio preview)
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const defaultAppletConfig = (configModules['../../firebase-applet-config.json'] as any)?.default || null;

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let initPromise: Promise<Firestore> | null = null;

function initFirebase(config: any): Firestore {
  if (!dbInstance) {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = config.firestoreDatabaseId
      ? initializeFirestore(appInstance, { experimentalAutoDetectLongPolling: true }, config.firestoreDatabaseId)
      : initializeFirestore(appInstance, { experimentalAutoDetectLongPolling: true });

    (window as any).app = appInstance;
    (window as any).db = dbInstance;
    console.log('Firebase initialized successfully.');
  }
  return dbInstance;
}

const initialConfig = defaultAppletConfig && defaultAppletConfig.apiKey ? defaultAppletConfig : null;

/**
 * Async getter for Firestore database instance.
 * Automatically fetches /api/firebase-config if initial config is missing.
 */
export function getDb(): Promise<Firestore> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (!initPromise) {
    if (initialConfig) {
      initPromise = Promise.resolve(initFirebase(initialConfig));
    } else {
      initPromise = fetch('/api/firebase-config')
        .then((res) => res.json())
        .then((serverConfig) => {
          if (serverConfig && serverConfig.apiKey) {
            return initFirebase(serverConfig);
          }
          throw new Error('Failed to fetch valid Firebase config from server endpoint.');
        });
    }
  }
  return initPromise;
}

export { appInstance as app, dbInstance as db };
export default getDb;
