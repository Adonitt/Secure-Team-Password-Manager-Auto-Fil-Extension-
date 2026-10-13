CREATE TABLE users (
  id UUID PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  kdf_salt TEXT NOT NULL, public_key TEXT NOT NULL, encrypted_private_key TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash VARCHAR(64) PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id), expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE workspaces (
  id UUID PRIMARY KEY, name VARCHAR(120) NOT NULL, owner_id UUID NOT NULL REFERENCES users(id)
);
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id), user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(10) NOT NULL CHECK (role IN ('VIEWER','EDITOR','ADMIN','OWNER')), UNIQUE(workspace_id,user_id)
);
CREATE TABLE collections (
  id UUID PRIMARY KEY, workspace_id UUID NOT NULL REFERENCES workspaces(id), name VARCHAR(120) NOT NULL
);
CREATE TABLE items (
  id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(id), collection_id UUID REFERENCES collections(id),
  ciphertext TEXT NOT NULL, nonce VARCHAR(32) NOT NULL, version INTEGER NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE item_grants (
  id UUID PRIMARY KEY, item_id UUID NOT NULL REFERENCES items(id), user_id UUID NOT NULL REFERENCES users(id),
  wrapped_key TEXT NOT NULL, role VARCHAR(10) NOT NULL CHECK (role IN ('VIEWER','EDITOR','ADMIN','OWNER')),
  source VARCHAR(12) NOT NULL CHECK (source IN ('OWNER','DIRECT','COLLECTION')), UNIQUE(item_id,user_id)
);
CREATE INDEX idx_grants_user ON item_grants(user_id);
CREATE INDEX idx_items_collection ON items(collection_id);
CREATE INDEX idx_members_user ON workspace_members(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
