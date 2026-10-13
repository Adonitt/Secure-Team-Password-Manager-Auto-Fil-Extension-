# Verified demo checks

Run on **10 October 2026**, using the local Docker deployment (Spring Boot, PostgreSQL 17, nginx) and **Google Chrome 154.0.8037.98**.

| Check | Result |
| --- | --- |
| Frontend and extension production build | Passed |
| Client unit tests | 8 passed: encryption/sharing/revocation, altered ciphertext rejection, CSV/JSON import, domain boundaries, TOTP, locking |
| Java service security tests | 5 passed: Viewer restrictions, Editor restrictions and stale writes, rejected role escalation, revoked access, collection roles |
| API smoke test against PostgreSQL | Passed: encrypted records, Viewer/Editor/Admin, re-sharing, teams, member removal, key rotation and logout |
| End-to-end Google Chrome test | 11 flows passed, listed below |
| Database inspection | The smoke test's unique synthetic password marker was absent from the local PostgreSQL data dump |
| Demo seed | Created Alice/Bob and four synthetic records; a second run kept the existing data |

## Google Chrome flows

1. Registration and saving an encrypted credential; its POST payload contains neither title, password, secure notes nor master password in plaintext.
2. Real-time search and category filtering.
3. Manual lock, wrong-master rejection and successful unlock.
4. Direct sharing, Viewer restrictions, Editor update and owner refresh.
5. Team collections, changing member permissions and revoking membership.
6. Importing a Chrome CSV file and downloading a JSON export.
7. Loading the actual Manifest V3 extension, sign-in/unlock and inline autofill.
8. Update and Save prompts, with the resulting encrypted records verified through the API.
9. Simulated ten-minute inactivity: the private key and popup plaintext are cleared; persistent extension storage contains no vault data.
10. Autofill of a shared credential using the recipient's private key.
11. Clipboard copy of username, password and six-digit TOTP from the extension popup.

The test uses a temporary Chrome profile and synthetic accounts. It does not modify the user's normal browser profile. The Ctrl+Shift+L shortcut is configured in the manifest; demonstrate it manually after installing the extension because Chrome may reserve it for another extension.

## Run again

From the project root, with Docker services running:

```powershell
npm test
npm run smoke
npm run test:chrome
```

From `backend`: `./mvnw.cmd test`. Test JSON reports and screenshots are written to the ignored `test-results` folder; Java results are in `backend/target/surefire-reports`.

These checks verify the demo's implemented behavior. They are not an independent penetration test or a production security audit. The README describes the actual security boundaries.
