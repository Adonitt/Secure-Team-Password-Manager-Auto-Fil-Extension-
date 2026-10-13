# Team Vault

**Team Vault** is a full-stack password manager demo for small teams. It lets people store login credentials in a personal vault, share them with registered users, organize shared logins in team collections, and use a Chrome extension to find, copy, and fill credentials.

Credential contents are encrypted in the browser before they are sent to the API. The API stores encrypted payloads and enforces access permissions; it does not receive credential titles, usernames, passwords, notes, or TOTP secrets in plaintext.

> This repository is an educational, locally runnable demo. It is not a production password manager or an independent security audit.

## Contents

- [Features](#features)
- [How the app is organized](#how-the-app-is-organized)
- [Security and encryption](#security-and-encryption)
- [Requirements](#requirements)
- [Run with Docker](#run-with-docker)
- [Demo accounts](#demo-accounts)
- [Use the web app](#use-the-web-app)
- [Install the Chrome extension](#install-the-chrome-extension)
- [Import and export](#import-and-export)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Development and tests](#development-and-tests)
- [Troubleshooting](#troubleshooting)
- [Security boundaries](#security-boundaries)
- [Further reading](#further-reading)

## Features

### Web vault

- Sign in with an account password, then unlock the vault locally with a separate master password.
- Create, view, edit, search, filter, move, and delete credentials.
- Store a credential in a personal vault or an accessible team collection.
- Search credential titles, usernames, websites, and categories locally after unlocking.
- Browse large vaults with pagination. Choose 10, 20, 50, or 100 credentials per page.
- See the credential location and your access role.
- Reveal or copy sensitive fields only when needed.

### Sharing and teams

- Share a personal credential directly with another registered user.
- Create teams, add registered users, assign roles, and create collections for team credentials.
- Change roles and remove access; removing a user also rotates the encryption keys for credentials they could access.
- Open a credential from its team collection to see its details and available actions.

Roles are checked by the API on every protected operation, as well as reflected in the UI:

| Role | Read and copy | Edit | Manage sharing | Delete or own |
| --- | --- | --- | --- | --- |
| Viewer | Yes | No | No | No |
| Editor | Yes | Yes | No | No |
| Admin | Yes | Yes | Yes | No |
| Owner | Yes | Yes | Yes | Yes |

Owners are assigned through ownership and team setup flows. Owner is not an ordinary role that can be granted through direct sharing.

### Chrome extension

- Search and select a matching credential from the extension popup.
- Use the toolbar popup or the **Ctrl+Shift+L** shortcut (**Command+Shift+L** on macOS, if available in Chrome).
- Fill a login form only after selecting a credential. The extension does not submit the form.
- Copy a username, password, or current TOTP code from the popup.
- Offer an explicit Save or Update action after detecting a submitted login form.
- Choose the personal vault or an accessible team collection for a newly captured login.
- Lock after inactivity and keep temporary extension session data in Chrome's session storage.

Chrome can reserve the shortcut for another extension. Change it at chrome://extensions/shortcuts if needed.

### Import and export

- Import Chrome CSV, 1Password CSV, Bitwarden CSV or JSON, and Team Vault CSV or JSON.
- Export credentials you own in your personal vault to CSV or JSON.
- Import is limited to 1,000 entries and 2 MB per file.
- CSV and JSON exports contain plaintext credentials. Store and delete exported files carefully.

## How the app is organized

This is a single repository with a React and TypeScript web client, a Spring Boot API, a PostgreSQL database, shared TypeScript encryption utilities, and a Manifest V3 Chrome extension.

At a high level:

1. The browser authenticates the user with the API.
2. The user enters the master password to unlock the locally encrypted private key.
3. The client downloads encrypted credential records and the user's wrapped item keys.
4. The client decrypts the selected credential in memory.
5. When sharing, the client wraps the credential's AES key for each recipient's public key.
6. The API checks access and role rules, then stores the encrypted record and wrapped keys.

The browser performs search because titles and other credential fields are encrypted at rest. The API returns records the signed-in user is allowed to access; filtering happens in the unlocked client.

## Security and encryption

Team Vault uses browser cryptography through the Web Crypto API. It combines symmetric encryption for credential records with public-key encryption for sharing.

### Registration and sign-in

The account password is used to authenticate with the API. The backend stores a salted PBKDF2-HMAC-SHA256 password hash using 600,000 iterations. Login returns a random, opaque session token; the server stores only its SHA-256 hash and expires the session after one hour.

The account password and master password are separate. The account password does not unlock credential contents.

### Unlocking the vault

At registration, the client generates an RSA-OAEP 2048-bit key pair. The master password and a random salt are used locally with PBKDF2-HMAC-SHA256 (600,000 iterations) to derive an AES-256-GCM key. That key encrypts the private RSA key before the encrypted key is uploaded.

When the user unlocks the vault, the client repeats the derivation and decrypts the private key in the browser. The master password and decrypted private key are not sent to the API.

### Encrypting a credential

Every credential gets a random 256-bit AES key. The entire credential record—including title, username, password, website, category, notes, and optional TOTP secret—is encrypted using AES-256-GCM with a fresh 96-bit nonce.

The client then wraps the small AES key with RSA-OAEP/SHA-256 using the owner's public key. The API stores the ciphertext, nonce, public keys, encrypted private-key metadata, and wrapped AES keys. It also stores information needed to enforce access, such as user, role, team, and collection relationships.

### Sharing and revoking access

To share a credential, the owner's client encrypts a copy of the AES key for the recipient's public key. The recipient uses their locally unlocked private key to unwrap that AES key and decrypt the same credential ciphertext.

When access is removed, the client creates a new AES key, encrypts a fresh payload, and wraps the new key only for users who retain access. This protects future versions. It cannot make a recipient forget a password they have already seen or copied; rotate the password on the destination website when that matters.

### Locking

The web vault locks after ten minutes of inactivity and can be locked manually. The extension also auto-locks after ten minutes. The extension keeps temporary unlocked session data in chrome.storage.session, which Chrome clears when it closes. These controls reduce the time decrypted data remains available; they do not protect a compromised device or browser.

## Requirements

For the Docker setup:

- Docker Desktop with Docker Compose
- Node.js 24 and npm, for building the extension, running tests, and using the scripts
- Google Chrome, if you want to install and test the extension

Java 21 is required only when running the Spring Boot backend directly on the host instead of in Docker.

## Run with Docker

Open PowerShell in the repository root.

### 1. Start the services

~~~powershell
docker compose up -d --build
~~~

The first run builds the web app and API images and starts PostgreSQL. The database uses a persistent Docker volume named vault-db.

### 2. Install JavaScript dependencies and build the extension

~~~powershell
npm ci
npm run build -w extension
~~~

### 3. Add optional demo data

~~~powershell
npm run seed
~~~

The seed command creates two synthetic accounts and four sample credentials the first time. It can be run again; if the demo accounts already have credentials, it keeps their data.

### 4. Open the apps

| Service | Address |
| --- | --- |
| Team Vault web app | http://localhost:5174 |
| Spring Boot API | http://localhost:8082 |
| API health check | http://localhost:8082/health |
| Local demo login site for extension testing | http://localhost:8083 |
| PostgreSQL (local development connection) | localhost:5433 |

Ports are bound to localhost for this local demo. The API base URL used by the clients is configured in shared/api.ts.

### One-command Windows startup

The included script builds and starts Docker services, installs dependencies, and builds the extension:

~~~powershell
.\scripts\start.ps1
~~~

To stop the services while keeping the database volume:

~~~powershell
docker compose down
~~~

## Demo accounts

The optional seed creates these synthetic users:

| User | Email |
| --- | --- |
| Alice | alice@demo.test |
| Bob | bob@demo.test |

Both seeded users use the same demo-only credentials:

- Account password: DemoAccount!2026
- Master password: DemoMaster!2026

Use these public credentials only with this local synthetic demo data. Never reuse them for real accounts. The seed includes sample personal credentials, a direct share, and a team collection so you can try the main flows.

## Use the web app

1. Open the web app and sign in, or register a new account.
2. Enter the master password to unlock the vault.
3. In Vault, create a credential and choose a title, website, username, password, category, and optional notes or TOTP secret.
4. Save it to your personal vault or a team collection you can access.
5. Use search and filters to find a credential. Select the page size and move between pages as needed.
6. Open the credential details to copy or reveal fields, edit the record, or manage sharing if your role allows it.
7. Use Teams to create a team, add registered users by email, and create collections.
8. Use Lock when finished. Inactivity locking is enabled as an additional safeguard.

A personal credential can be shared directly with an existing registered user. If a credential already has direct shares, remove those shares before moving it into a team collection. Credentials stored in a collection inherit access from team membership and collection permissions.

## Install the Chrome extension

Build the extension from the project root:

~~~powershell
npm ci
npm run build -w extension
~~~

Then in Chrome:

1. Open chrome://extensions.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the repository's extension/dist folder.
5. Pin **Team Vault Demo** from the Extensions menu if you want quick access.
6. Sign in using the same account as the web app, then unlock with the same master password.
7. Visit the local test page at http://localhost:8083 or another supported login form.
8. Select a credential from the popup or use the keyboard shortcut, then confirm the fields before submitting the site's form yourself.

After changing extension source, rebuild it and click **Reload** on its card in chrome://extensions. For capture testing, submit only synthetic test credentials.

The extension matches the base website domain with public-suffix-aware parsing. It requires HTTPS on ordinary websites; HTTP is allowed for localhost demo testing. Unusual forms, cross-origin iframes, and browser restrictions can require manual filling. OAuth buttons such as **Continue with Google** do not expose a site's Google password to the page, so the extension cannot and should not capture it.

## Import and export

Open **Import & export** in the web app. Choose the input format, select a CSV or JSON file, and review the import result.

Supported import formats:

- Chrome CSV
- 1Password CSV
- Bitwarden CSV
- Bitwarden JSON
- Team Vault CSV
- Team Vault JSON

Exports are available as Team Vault CSV or JSON and include only credentials owned by the signed-in user in their personal vault. Credentials shared by another user or stored in team collections are not included. Export files are plaintext; keep them private and delete them when no longer needed.

Import supports at most 1,000 entries and 2 MB per file. Common TOTP seeds using SHA1, six digits, and a 30-second interval are supported; unsupported TOTP settings are rejected. If an import is interrupted, the UI reports any partial result.

## API overview

All routes other than registration, login, and health require a bearer session token.

| Area | Routes | Purpose |
| --- | --- | --- |
| Health | GET /health | Check API availability |
| Authentication | POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me, GET /auth/crypto | Create a session, sign in/out, retrieve account and public/encrypted key metadata |
| Credentials | GET /items, GET /items/{id}, POST /items, PUT /items/{id}, POST /items/{id}/move, DELETE /items/{id} | List accessible encrypted records and create, update, move, or delete them |
| Credential access | GET /items/{id}/grants, POST /items/{id}/shares, PUT /items/{id}/shares/{userId}, POST /items/{id}/rekey | Inspect and manage grants, direct shares, roles, and key rotation |
| Teams and collections | GET /workspaces, POST /workspaces, GET /workspaces/{id}, PUT/DELETE /workspaces/{id}, POST /workspaces/{id}/collections, PUT/DELETE /workspaces/{id}/collections/{collectionId}, POST /workspaces/{id}/members, PUT /workspaces/{id}/members/{userId}, POST /workspaces/{id}/members/{userId}/remove | Manage teams, collections, membership, and roles |
| User lookup | GET /users/search, GET /users/lookup, GET /users/{id}/public-key | Find registered users and retrieve public-key metadata |

The API is implemented in the Spring Boot controllers under backend/src/main/java/com/teamvault/controllers. Request and response shapes are defined in the DTO package.

## Project structure

~~~text
.
├── backend/                 Spring Boot API and database migrations
│   └── src/main/java/com/teamvault/
│       ├── config/           Spring Security and CORS configuration
│       ├── controllers/      HTTP routes
│       ├── dtos/             Validated request and response objects
│       ├── entities/         JPA database entities
│       ├── repositories/     Spring Data database access
│       ├── security/         Bearer sessions, token hashing, login throttling
│       ├── services/         Authentication, vault, team, and permission rules
│       └── utils/            Payload validation and permission helpers
├── frontend/                 React and TypeScript web application
│   └── src/
│       ├── components/       Vault list, forms, details, sharing, help
│       ├── hooks/            Vault state and inactivity locking
│       ├── pages/            Sign-in, unlock, teams, and import/export
│       ├── services/         Typed API clients
│       └── styles/           Responsive application styles
├── extension/                Chrome Manifest V3 extension
│   └── src/                  Popup, service worker, and content script
├── shared/                   Shared TypeScript types, Web Crypto, and helpers
├── demo-site/                Local login form used for extension testing
├── docs/                     Requirements and Albanian project explanation
├── scripts/                  Startup, seed, smoke, and Chrome test scripts
├── compose.yaml              Local PostgreSQL, API, web, and demo-site services
└── package.json              Workspace scripts
~~~

This is one application split into modules, not a microservice architecture. The web client, extension, and shared utilities reuse the same record and encryption formats.

## Development and tests

### Build all client packages

~~~powershell
npm ci
npm run build
~~~

### Run client unit tests

~~~powershell
npm test
~~~

### Test the API and permissions against the local PostgreSQL service

Start the Docker services first, then run:

~~~powershell
npm run smoke
~~~

### Run the Java backend tests

Java 21 is required:

~~~powershell
cd backend
.\mvnw.cmd test
~~~

### Run browser tests in Google Chrome

With the local Docker app running and Chrome installed:

~~~powershell
npm run test:chrome
~~~

The Chrome test uses an isolated temporary browser profile and synthetic data. Reports and screenshots are written to test-results. It does not use the normal Chrome profile. Chrome may reserve the extension shortcut, so test the shortcut manually after installation if necessary.

For local IDE development, start PostgreSQL and the demo site with docker compose up -d postgres demo-login, run scripts/backend-dev.ps1 in one terminal, and run npm run dev in another. Stop the Docker API and frontend first if they are using the same ports.

The requirement-to-implementation mapping is in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). The Albanian walkthrough, encryption explanation, and presentation notes are in [docs/SHPJEGIMI.md](docs/SHPJEGIMI.md). Additional test notes are in [docs/TESTING.md](docs/TESTING.md).

## Troubleshooting

### The web page still shows an old build

The Docker frontend serves a static production build. Rebuild and restart that service after changing web source:

~~~powershell
docker compose up -d --build frontend
~~~

Then hard-refresh the page with Ctrl+F5.

### The API is not responding

Check Docker service status and API logs:

~~~powershell
docker compose ps
docker compose logs -f api
~~~

### The extension shows an old version

Run npm run build -w extension, then open chrome://extensions and press **Reload** on the unpacked extension.

### A local port is already in use

The default ports are configured in compose.yaml and shared/api.ts. Stop the process using that port or update both the Docker port mapping and the corresponding client configuration.

### Database data is still present after stopping Docker

docker compose down stops the services but keeps the named database volume. That preserves demo accounts and credentials for the next startup.

## Security boundaries

This project demonstrates encryption and access control, but it has important limitations:

- The local demo uses HTTP on localhost. A real deployment needs HTTPS, production secrets, a reviewed extension permission policy, monitoring, backups, and an independent security review.
- Credential fields are encrypted client-side. Account email, public keys, workspace and collection names, and access relationships are visible to the API.
- The API supplies recipient public keys. The demo does not verify their fingerprints through an independent trusted channel; a malicious API could substitute keys.
- A compromised device, browser, extension, or frontend code running while the vault is unlocked can access decrypted data.
- There is no master-password recovery, MFA, email invitation service, or ownership transfer.
- Removing access prevents future server reads and rotates keys for future encrypted versions. It cannot revoke information already seen or copied.
- CSV and JSON exports are plaintext.
- The login throttle is held by one API process; multiple API instances would need shared rate-limit storage.
- Extension capture supports ordinary HTML login forms. The extension detects a submitted form but cannot tell whether the website accepted the login.
- The demo is not designed to protect credentials used with phishing websites. Always verify the website address before filling a password.

Use synthetic credentials for demos and tests. Do not store real passwords in this local demonstration.

## Further reading

- [Requirements coverage](docs/REQUIREMENTS.md)
- [Project and encryption walkthrough (Albanian)](docs/SHPJEGIMI.md)
- [Verified demo test notes](docs/TESTING.md)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Chrome extension end-to-end testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)
