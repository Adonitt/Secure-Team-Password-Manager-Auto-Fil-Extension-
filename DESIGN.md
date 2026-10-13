# Team Vault interface redesign

## Direction

The interface is a quiet, compact work surface for small teams that share account access. Warm off-white backgrounds, ink text, restrained evergreen actions, fine separators, and IBM Plex Sans Variable replace the former green-on-gray, card-heavy layout. Dense credential lists use tabular-aligned columns and compact row actions.

## Information architecture

- A persistent workspace rail keeps Vault, Teams, and Import & export available.
- The vault is a full-width searchable and filterable table with 10, 20, 50, or 100 rows per page. Search accepts name, website, and username; filters cover category, ownership, location, and sort order.
- Credential details, editing, deletion, and direct sharing open in a right-side drawer so the inventory remains the main surface.
- Team management keeps team, collection, member, and collection credential tasks together. Compact actions use labeled icon buttons.
- Sign-in, unlock, and transfer use the same type, form, and button system.

## Access and safety

Password values remain masked by default. Icon-only controls have accessible names and titles. Role-gated edit/delete/share affordances follow existing permissions. The design keeps existing confirmations and encrypted-storage copy.

## Responsive behavior

The desktop rail collapses to a compact mobile header. The credential table remains horizontally scrollable on narrow screens so names, usernames, location, access, and actions remain available without turning records into tall cards. The detail drawer fills the screen on mobile.

## Audit notes addressed

- Removed the permanently split credential list and form that consumed the inventory width.
- Replaced repeated visual containers with separators and a single inventory surface.
- Added clear search, count, compact filters, sort, empty state, focus states, and keyboard shortcut hint.
- Standardized action icons, form sizing, typography, responsive layout, browser selection, scrollbars, and security status.
