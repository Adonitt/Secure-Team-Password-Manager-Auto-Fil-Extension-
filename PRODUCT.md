# Team Vault product context

## Product

Team Vault is a browser-based password vault for small teams. People use it to keep personal credentials, share credentials directly, and organize team credentials in collections. A Chrome extension can fill a selected credential into a website.

## People and jobs

- Small teams that need to organize and share account access.
- An individual user signing in with an account password, then unlocking the encrypted vault with a separate master password.
- Team members with Viewer, Editor, Admin, or Owner permissions.

The core job is finding the right credential quickly and understanding where it is stored and who can access it.

## Product truths

- Credential fields are encrypted in the browser. The API manages encrypted records and access permissions.
- A vault can include personal credentials, directly shared credentials, and team collection credentials.
- Members can manage teams, collections, and roles according to their permissions.
- Removing a team member or direct recipient rotates shared item keys.
- Import accepts supported formats up to 1,000 entries and 2 MB per file. Export includes only owned personal vault entries.
- The Chrome extension requires the user to select a matching credential and never submits a form automatically.
- This repository describes a technical demo; the interface must not imply recovery, MFA, or other unsupported capabilities.

## Experience principles

1. Make search and location filters easy to reach when the vault is large.
2. Keep the credential inventory dense and scannable; reveal editing and sharing details only when requested.
3. Make ownership, team location, and permission visible at the point of use.
4. Preserve clear labels for primary actions and use accessible icon buttons for compact row actions.
5. Treat passwords as sensitive: mask by default, explain copy/reveal actions, and preserve explicit user control.
6. Keep the same visual language across sign-in, vault, teams, and import/export.

## Visual direction

A quiet workspace for frequent, careful use: warm neutral canvas, deep ink typography, restrained evergreen actions, compact but breathable tables, fine separators, and a distinctive locally sourced editorial sans paired with tabular numerals. No decorative dashboard metrics, gradients, or repeated card grids. The interface should feel dependable and human, with the data doing most of the visual work.
