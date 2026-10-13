# Team Vault

A small full-stack password-manager demo built for a junior developer technical task. It includes an encrypted web vault, direct sharing, team collections and a Chrome Manifest V3 extension.

## Run locally

Requirements: **Docker Desktop, Node.js 24 and Google Chrome**. Java 21 is needed only when running the backend outside Docker.

From the project root:

```powershell
docker compose up -d --build
npm ci
npm run build -w extension
```

Or run `./scripts/start.ps1` to perform these steps together.

| Service | Address |
| --- | --- |
| Web app | http://localhost:5174 |
| Spring Boot API | http://localhost:8082 |
| Demo login website for autofill | http://localhost:8083 |
| PostgreSQL, for local development | localhost:5433 |

In Google Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this project's `extension/dist` folder. Create an account in the web app, then sign in and unlock separately in the extension. The shortcut is **Ctrl+Shift+L**; Chrome allows changing it at `chrome://extensions/shortcuts` if another extension has reserved it.

The ports avoid conflicting with the other demo projects on this machine. The API URL is defined once in `shared/api.ts`. This demo configuration binds published Docker ports to the local machine.

## Example accounts

After the app starts, run `npm run seed` to create only synthetic demonstration data:

- Alice: `alice@demo.test`
- Bob: `bob@demo.test`
- Account password for both: `DemoAccount!2026`
- Master password for both: `DemoMaster!2026`

These are public demo credentials. Use them only with the included synthetic vault. The seed command is safe to run again; it skips populated accounts.

## Project structure

```text
backend/src/main/java/com/teamvault/
  entities/       JPA classes mapped to database tables
  dtos/           Validated API requests and response records
  repositories/   Spring Data JPA database operations
  services/       Application rules, permissions and transactions
  controllers/    HTTP routes
  security/       Bearer authentication and login rate limiting
  config/         Spring Security and CORS configuration
  enums/          Roles and sources of access grants
  exceptions/     Consistent API error responses
  utils/          Encrypted-payload validation and role checks
frontend/src/
  pages/          Login, unlock, vault, teams and transfer screens
  components/     Credential form, list and sharing panel
  hooks/          UI state and inactivity locking
  services/       Typed calls to API routes
  utils/          Presentation-level role checks
  styles/         CSS
shared/           Types, Web Crypto functions, import/export and domain helpers
extension/        Background worker, content script and popup
demo-site/        A local login form for Chrome tests
docs/             PRD, requirement mapping and an Albanian explanation guide
scripts/          Startup, seed and end-to-end tests
```

This is one repository and one backend application. There are no microservices, queues or extra deployment layers. The frontend and extension reuse the encryption functions so that their stored formats stay compatible.

## How encryption works

1. The **account password** authenticates against the API. The server stores its PBKDF2-HMAC-SHA256 hash with a random salt and 600,000 iterations.
2. The **master password** stays in the client. PBKDF2-HMAC-SHA256 with a separate random salt and 600,000 iterations derives an AES-256 key. It decrypts the user's RSA private key locally.
3. Each credential has a new random 256-bit AES key. **AES-GCM**, with a fresh 96-bit nonce for each encryption, protects the entire record: title, username, password, URL, category, notes and optional TOTP secret.
4. **RSA-OAEP-2048/SHA256** wraps the small AES item key for the owner and each recipient. The server stores ciphertext and wrapped keys. The recipient's private key unwraps their copy.
5. The API enforces Viewer/Editor/Admin/Owner permissions on every operation. Removing access rotates the AES item key and rewraps it for the remaining users.

RSA encrypts the item key rather than the full record. This implements the PRD's client-side public-key sharing with standard hybrid encryption. The API never receives the master password, plaintext item fields or an unencrypted private key.

Opaque session tokens contain 256 random bits, expire after one hour and are stored as SHA-256 hashes on the server. Web sessions and decrypted keys remain in memory. The extension uses only trusted-context `chrome.storage.session`, which is cleared when Chrome closes; it auto-locks after ten minutes. The content script receives only a user-selected matching credential. Autofill never submits a form automatically.

## Tests

With the Docker services running:

```powershell
npm test
npm run smoke
npm run test:chrome
cd backend
.\mvnw.cmd test
```

`test:chrome` uses the **installed Google Chrome**, an isolated temporary profile and synthetic credentials. It loads the built extension through Chrome's debugging protocol. `test-results/chrome-report.json` records verified flows; screenshots are stored in the same ignored directory. Node.js 24 is required for scripts importing the shared TypeScript source. Rebuild the extension after source changes.

The backend tests use an isolated H2 database. The smoke test checks the real PostgreSQL API, including role enforcement and key rotation. See [requirement coverage](docs/REQUIREMENTS.md) and [the explanation guide](docs/SHPJEGIMI.md).

## Developing in an IDE

Import `backend/pom.xml` in IntelliJ as a Maven project. Start just PostgreSQL and the demo site with `docker compose up -d postgres demo-login`, then run `./scripts/backend-dev.ps1` in one terminal and `npm run dev` in another. Stop the Docker API/frontend first if they already occupy those ports. The backend script supplies explicit local database arguments to prevent unrelated global Spring datasource variables from selecting another database.

Stop the demo with `docker compose down`. Data stays in its named PostgreSQL volume.

## Demo boundaries

- This is a local demo using HTTP on localhost. A real deployment needs HTTPS, restricted extension origins/host permissions, reviewed configuration and an independent security review.
- Account email, public keys, workspace/collection names and access relationships are visible to the server. Credential contents are encrypted.
- The server supplies recipients' public keys. Verification against an independent fingerprint is outside this demo; a malicious server could substitute keys. The demo does not claim protection against a malicious server serving altered frontend code, a compromised device or a compromised browser extension.
- There is no master-password recovery, email invitation service, MFA or ownership transfer. Direct shares require an existing account. If a member owns a collection credential, delete that credential before removing the member.
- New credentials captured by the extension can be saved to the personal vault or to an available team collection. Existing credentials keep their collection when updated; the web details and edit view show the current destination.
- Each user has one grant per credential. If a direct share already exists for a collection credential, remove that direct share before adding that user to the team.
- Revocation blocks server access and protects future encrypted versions; it cannot make somebody forget a password they already viewed or copied.
- Capture targets normal HTML login forms, including forms added dynamically. It detects submission, not whether the website accepted the login. Browser restrictions, unusual forms and cross-origin iframes can require manual filling.
- Social sign-in/OAuth buttons such as “Continue with Google” do not give the website the Google password. Team Vault cannot and should not capture that password from the destination website; save a site's own username/password form instead.
- CSV/JSON exports are plaintext and limited to personal credentials owned by the current user. Import is limited to 1,000 entries / 2 MB per file. Partial imports are reported if interrupted. TOTP supports the common SHA1 / six-digit / 30-second format; unsupported settings are rejected.
- The login throttle runs in one API process. This is enough for the local demo; multiple API instances would need a shared limiter.

## Design references

- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html): authenticated encryption and standard key wrapping.
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): slow password derivation with a random salt.
- [Bitwarden encryption protocols](https://bitwarden.com/help/what-encryption-is-used/): local encryption and keeping vault keys under user control. This demo uses its own implementation, not Bitwarden's source code.
- [Chrome extension testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing): testing a built extension in Chrome.
- [Bitwarden import formats](https://bitwarden.com/help/condition-bitwarden-import/) and [1Password CSV exports](https://support.1password.com/export/): supported login import formats.
#   S e c u r e - T e a m - P a s s w o r d - M a n a g e r - A u t o - F i l - E x t e n s i o n -  
 