// MongoDB is now the primary active database for BlogSpy AI.
// Firebase Firestore active listeners have been disabled to prevent background gRPC stream timeouts.

export function getDb(): Promise<null> {
  return Promise.resolve(null);
}

export const app = null;
export const db = null;
export default getDb;
