export type Role = "VIEWER" | "EDITOR" | "ADMIN" | "OWNER";
export type CryptoInfo = {
  kdfSalt: string;
  publicKey: string;
  encryptedPrivateKey: string;
};
export type Session = {
  token: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  expiresAt: string;
};
export type VaultRecord = {
  title: string;
  username: string;
  password: string;
  url: string;
  category: string;
  notes: string;
  totpSecret?: string;
};
export type Item = {
  id: string;
  ownerId: string;
  ownerEmail: string;
  collectionId: string | null;
  ciphertext: string;
  nonce: string;
  version: number;
  wrappedKey: string;
  wrapType: "RSA";
  role: Role;
  hasDirectShares: boolean;
};
export type Grant = {
  userId: string;
  email: string;
  publicKey: string;
  wrappedKey: string;
  wrapType: "RSA";
  role: Role;
  source: "OWNER" | "DIRECT" | "COLLECTION";
};
export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicKey: string;
  role: Role;
};
export type Workspace = { id: string; name: string; role: Role };
export type WorkspaceDetails = Workspace & {
  members: Member[];
  collections: { id: string; name: string }[];
};
