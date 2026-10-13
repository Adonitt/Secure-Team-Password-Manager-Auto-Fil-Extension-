import { request } from "../shared/api.ts";
import {
  createCrypto,
  newItem,
  unlock,
  wrapForUser,
} from "../shared/crypto.ts";

const accountPassword = "DemoAccount!2026";
const master = "DemoMaster!2026";
async function user(firstName, lastName, email) {
  let session;
  const generated = await createCrypto(master);
  try {
    session = await request(null, "/auth/register", "POST", {
      firstName,
      lastName,
      email,
      accountPassword,
      ...generated,
    });
  } catch (error) {
    if (!error.message.includes("Email already registered")) throw error;
    session = await request(null, "/auth/login", "POST", {
      email,
      accountPassword,
    });
  }
  const metadata = await request(session.token, "/auth/crypto");
  await unlock(master, metadata);
  return { session, metadata };
}
const alice = await user("Alice", "Demo", "alice@demo.test");
const bob = await user("Bob", "Demo", "bob@demo.test");
if ((await request(alice.session.token, "/items")).length > 0) {
  console.log(
    "Demo accounts already contain credentials; existing data was kept.",
  );
} else {
  async function add(record, collectionId = null) {
    const encrypted = await newItem(record, alice.metadata.publicKey);
    const item = await request(alice.session.token, "/items", "POST", {
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      ownerWrappedKey: encrypted.ownerWrappedKey,
      collectionId,
      collectionGrants: collectionId
        ? [
            {
              userId: bob.session.userId,
              role: "EDITOR",
              wrappedKey: await wrapForUser(
                encrypted.rawKey,
                bob.metadata.publicKey,
              ),
            },
          ]
        : [],
    });
    return { item, encrypted };
  }
  const { item, encrypted } = await add({
    title: "Demo App",
    username: "alice@demo.test",
    password: "SyntheticDemoLogin!2026",
    url: "http://localhost:8083",
    category: "Personal",
    notes: "Use this synthetic login on the local demo website.",
    totpSecret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  });
  await request(alice.session.token, `/items/${item.id}/shares`, "POST", {
    email: bob.session.email,
    role: "VIEWER",
    wrappedKey: await wrapForUser(encrypted.rawKey, bob.metadata.publicKey),
  });
  await add({
    title: "GitHub Demo",
    username: "demo-developer",
    password: "FakeGitHubSecret!2026",
    url: "https://github.com",
    category: "Work",
    notes: "Synthetic example only; this is not a real GitHub account.",
  });
  await add({
    title: "Community Demo",
    username: "demo-member",
    password: "FakeCommunitySecret!2026",
    url: "https://community.example.org",
    category: "Social",
    notes: "A synthetic personal credential.",
  });
  const team = await request(alice.session.token, "/workspaces", "POST", {
    name: "Demo team",
  });
  await request(alice.session.token, `/workspaces/${team.id}/members`, "POST", {
    email: bob.session.email,
    role: "EDITOR",
    envelopes: [],
  });
  const folder = await request(
    alice.session.token,
    `/workspaces/${team.id}/collections`,
    "POST",
    { name: "Work logins" },
  );
  await add(
    {
      title: "Team Portal",
      username: "team@example.test",
      password: "SyntheticTeamSecret!2026",
      url: "https://portal.example.com",
      category: "Work",
      notes:
        "Bob can edit this team credential; Demo App is shared with him as Viewer.",
    },
    folder.id,
  );
  console.log(
    "Created Alice, Bob, four synthetic credentials and a shared collection.",
  );
}
for (const session of [alice.session, bob.session])
  await request(session.token, "/auth/logout", "POST");
console.log("Demo login: alice@demo.test / bob@demo.test");
console.log(
  "Account password: DemoAccount!2026 — master password: DemoMaster!2026",
);
