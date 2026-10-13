import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { request, API_URL } from "../shared/api.ts";
import {
  createCrypto,
  decryptRecord,
  encryptRecord,
  itemKey,
  newItem,
  rekeyItem,
  unlock,
  wrapForUser,
} from "../shared/crypto.ts";

const suffix = crypto.randomUUID().slice(0, 8);
async function user(name) {
  const email = `${name}-${suffix}@example.test`;
  const master = `${name}-master-password-123`;
  const metadata = await createCrypto(master);
  const session = await request(null, "/auth/register", "POST", {
    firstName: name[0].toUpperCase() + name.slice(1),
    lastName: "Test",
    email,
    accountPassword: `${name}-account-password-123`,
    ...metadata,
  });
  return { email, metadata, session, keys: await unlock(master, metadata) };
}
async function forbidden(token, path, method, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, 403, `${method} ${path} should be forbidden`);
}

const alice = await user("alice"),
  bob = await user("bob"),
  carol = await user("carol");
const secret = `fake-secret-${suffix}`;
const record = {
  title: "Example login",
  username: "alice@example.test",
  password: secret,
  url: "https://example.com",
  category: "Work",
  notes: "fake note",
};
const encrypted = await newItem(record, alice.metadata.publicKey);
let item = await request(alice.session.token, "/items", "POST", {
  ciphertext: encrypted.ciphertext,
  nonce: encrypted.nonce,
  ownerWrappedKey: encrypted.ownerWrappedKey,
  collectionId: null,
  collectionGrants: [],
});
assert.deepEqual(await decryptRecord(item, alice.keys), record);
await request(alice.session.token, `/items/${item.id}/shares`, "POST", {
  email: bob.email,
  role: "VIEWER",
  wrappedKey: await wrapForUser(encrypted.rawKey, bob.metadata.publicKey),
});
let bobItems = await request(bob.session.token, "/items");
assert.equal(bobItems.length, 1);
assert.deepEqual(await decryptRecord(bobItems[0], bob.keys), record);
await forbidden(bob.session.token, `/items/${item.id}`, "PUT", {
  ciphertext: "x",
  nonce: "y",
  version: 1,
});
await forbidden(bob.session.token, `/items/${item.id}/grants`, "GET");
await request(
  alice.session.token,
  `/items/${item.id}/shares/${bob.session.userId}`,
  "PUT",
  { role: "ADMIN" },
);
await request(bob.session.token, `/items/${item.id}/shares`, "POST", {
  email: carol.email,
  role: "VIEWER",
  wrappedKey: await wrapForUser(
    await itemKey(bobItems[0], bob.keys),
    carol.metadata.publicKey,
  ),
});
assert.deepEqual(
  await decryptRecord(
    (await request(carol.session.token, "/items"))[0],
    carol.keys,
  ),
  record,
);
const ownerGrants = await request(
  alice.session.token,
  `/items/${item.id}/grants`,
);
const rotated = await rekeyItem(
  record,
  ownerGrants.filter((grant) => grant.userId !== bob.session.userId),
);
item = await request(alice.session.token, `/items/${item.id}/rekey`, "POST", {
  ...rotated,
  version: item.version,
  removeUserId: bob.session.userId,
});
assert.deepEqual(await decryptRecord(item, alice.keys), record);
assert.equal((await request(bob.session.token, "/items")).length, 0);
assert.deepEqual(
  await decryptRecord(
    (await request(carol.session.token, "/items"))[0],
    carol.keys,
  ),
  record,
);

const team = await request(alice.session.token, "/workspaces", "POST", {
  name: "Demo team",
});
const collection = await request(
  alice.session.token,
  `/workspaces/${team.id}/collections`,
  "POST",
  { name: "Shared logins" },
);
const renamedTeam = await request(
  alice.session.token,
  `/workspaces/${team.id}`,
  "PUT",
  { name: "Renamed demo team" },
);
assert.equal(renamedTeam.name, "Renamed demo team");
const renamedCollection = await request(
  alice.session.token,
  `/workspaces/${team.id}/collections/${collection.id}`,
  "PUT",
  { name: "Renamed shared logins" },
);
assert.equal(renamedCollection.name, "Renamed shared logins");
await request(alice.session.token, `/workspaces/${team.id}/members`, "POST", {
  email: bob.email,
  role: "VIEWER",
  envelopes: [],
});
const sharedEncrypted = await newItem(record, alice.metadata.publicKey);
let groupItem = await request(alice.session.token, "/items", "POST", {
  ciphertext: sharedEncrypted.ciphertext,
  nonce: sharedEncrypted.nonce,
  ownerWrappedKey: sharedEncrypted.ownerWrappedKey,
  collectionId: collection.id,
  collectionGrants: [
    {
      userId: bob.session.userId,
      role: "VIEWER",
      wrappedKey: await wrapForUser(
        sharedEncrypted.rawKey,
        bob.metadata.publicKey,
      ),
    },
  ],
});
groupItem = await request(
  alice.session.token,
  `/items/${groupItem.id}/move`,
  "POST",
  { collectionId: null, collectionGrants: [], version: groupItem.version },
);
assert.equal(groupItem.collectionId, null);
groupItem = await request(
  alice.session.token,
  `/items/${groupItem.id}/move`,
  "POST",
  {
    collectionId: collection.id,
    collectionGrants: [
      {
        userId: bob.session.userId,
        role: "VIEWER",
        wrappedKey: await wrapForUser(
          sharedEncrypted.rawKey,
          bob.metadata.publicKey,
        ),
      },
    ],
    version: groupItem.version,
  },
);
assert.equal(groupItem.collectionId, collection.id);
bobItems = await request(bob.session.token, "/items");
assert.equal(bobItems.length, 1);
assert.deepEqual(await decryptRecord(bobItems[0], bob.keys), record);
await forbidden(bob.session.token, `/items/${groupItem.id}`, "PUT", {
  ciphertext: "x",
  nonce: "y",
  version: groupItem.version,
});
await request(
  alice.session.token,
  `/workspaces/${team.id}/members/${bob.session.userId}`,
  "PUT",
  { role: "EDITOR" },
);
const editable = (await request(bob.session.token, "/items"))[0];
const edited = { ...record, notes: "edited by bob" };
const editedPayload = await encryptRecord(
  edited,
  await itemKey(editable, bob.keys),
);
groupItem = await request(bob.session.token, `/items/${groupItem.id}`, "PUT", {
  ...editedPayload,
  version: editable.version,
});
assert.deepEqual(
  await decryptRecord(
    await request(alice.session.token, `/items/${groupItem.id}`),
    alice.keys,
  ),
  edited,
);
const grants = await request(
  alice.session.token,
  `/items/${groupItem.id}/grants`,
);
const next = await rekeyItem(
  edited,
  grants.filter((grant) => grant.userId !== bob.session.userId),
);
await request(
  alice.session.token,
  `/workspaces/${team.id}/members/${bob.session.userId}/remove`,
  "POST",
  { items: [{ itemId: groupItem.id, ...next, version: groupItem.version }] },
);
assert.equal((await request(bob.session.token, "/items")).length, 0);
assert.deepEqual(
  await decryptRecord(
    await request(alice.session.token, `/items/${groupItem.id}`),
    alice.keys,
  ),
  edited,
);
await request(alice.session.token, `/items/${groupItem.id}`, "DELETE");
await request(
  alice.session.token,
  `/workspaces/${team.id}/collections/${collection.id}`,
  "DELETE",
);
await request(alice.session.token, `/workspaces/${team.id}`, "DELETE");
console.log(
  "Smoke test passed: encrypted vault, Viewer/Editor/Admin roles, re-share, workspace edit, removal and key rotation",
);
console.log(`Synthetic marker for database inspection: ${secret}`);
for (const user of [alice, bob, carol])
  await request(user.session.token, "/auth/logout", "POST");
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/smoke-report.json",
  JSON.stringify(
    {
      status: "passed",
      syntheticMarker: secret,
      checks: [
        "Encrypted vault",
        "Viewer denied edit and re-share",
        "Admin re-share",
        "Editor update",
        "Team role change",
        "Direct revocation and key rotation",
        "Team member removal and key rotation",
        "Session logout",
      ],
    },
    null,
    2,
  ),
);
