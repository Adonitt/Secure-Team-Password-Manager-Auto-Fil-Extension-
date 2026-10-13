# PRD coverage

The supplied [PRD](PRD.pdf) describes a draft product, so this demo states its practical scope explicitly.

| PRD requirement | Implementation | Verification |
| --- | --- | --- |
| Local master-password derivation | PBKDF2-SHA256, 600,000 iterations, random salt | Crypto unit tests; browser wrong-master rejection |
| Public key and encrypted private key | RSA-OAEP-2048, AES-GCM-encrypted private key | Crypto unit tests; API stores only encrypted metadata |
| Client-side encrypted sharing | AES item key wrapped separately for each user's RSA public key | Smoke test; real Chrome sharing |
| Title, username, password, URL, category, notes | Whole VaultRecord is encrypted; Editors can move an editable credential between personal vault and an accessible team collection with refreshed wrapped keys | Browser request-body check and database marker check |
| CSV/JSON import/export | Chrome CSV, 1Password CSV, Bitwarden CSV/JSON, own CSV/JSON | Import tests and Chrome file import/export |
| Search and filtering | Client-side title/domain/category search plus category dropdown | Chrome test |
| Share individual credentials by email | Search existing registered emails (minimum 2 characters, maximum 10 matches), select one, then choose a role | Smoke and Chrome tests |
| Viewer/Editor/Admin/Owner | Server-side permission checks and corresponding UI | Java security tests, smoke and Chrome tests |
| Team workspaces/collections | Team members selected from registered-user search, shared folders, encrypted keys per member, rename/remove actions and collection credential view | Smoke and Chrome tests |
| Login capture + Save/Update prompt | Standard HTML forms and dynamic additions, explicit confirmation, destination selection for personal or team collection | Real Chrome extension tests |
| Domain matching | Public suffix parsing, HTTPS, port boundaries and private hosting tenants | Domain unit tests |
| Inline icons | Icons over username/text and password fields | Real Chrome extension test |
| Shared autofill | Same item pipeline for direct and collection grants | Real Chrome guest extension test |
| Quick copy of username/password/TOTP | Popup actions; standard SHA1 six-digit TOTP | TOTP test and Chrome clipboard test |
| Quick search shortcut | Ctrl+Shift+L, manifest action opens searchable popup | Manifest configuration; manual Chrome demo |
| Auto-lock | 10 minutes; master-password unlock | Locking tests and simulated inactivity in Chrome |

## Deliberate demo choices

- Use an account password separate from the master password to keep authentication understandable while satisfying “master password never sent to the server.”
- Use hybrid RSA-OAEP + AES-GCM sharing. RSA encrypts the small AES key, not the full record. X25519 is a key-agreement primitive and would need additional protocol details; it is not implemented as a second option.
- Encrypt all credential fields and search locally, so title/domain search does not require plaintext vault metadata on the server.
- Allow Viewer to see/copy the password, as the PRD explicitly states. Viewer is not an “autofill-only hidden password” role.
- Treat Admin and Owner separately only for deletion/ownership; both can re-share as required.
- Keep direct sharing and team collection sharing mutually exclusive for one credential. A personal credential can be shared directly with selected users; a team credential gets access from team membership. Moving to a team collection therefore requires removing existing direct shares first.
- Unlock with master password rather than a PIN. The PRD permits either.
- Include optional TOTP secret input because copying a TOTP code requires a stored seed. Unsupported TOTP settings are rejected.
- Support 1Password CSV; zipped `.1pux` archives and arbitrary vendor JSON structures are outside the supported import formats.
- Key rotation protects future versions after access removal. Already viewed/copied passwords are outside what software revocation can undo.

The project is a demonstrable local implementation, not a claim of production readiness. See the README for the exact boundaries and security threat model.
