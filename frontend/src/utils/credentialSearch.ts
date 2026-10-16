import type { Item, VaultRecord } from "../../../shared/types";

type SearchableCredential = {
  item: Pick<Item, "ownerEmail">;
  record: Partial<VaultRecord>;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Search identifiers consistently regardless of the browser's locale.
    .toLowerCase()
    .trim();
}

function websiteValues(value: unknown): string[] {
  const website = normalize(value);
  if (!website) return [];

  try {
    const parsed = new URL(website.includes("://") ? website : `https://${website}`);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return [
      website,
      parsed.hostname,
      hostname,
      parsed.pathname,
      `${hostname}${parsed.pathname}${parsed.search}${parsed.hash}`,
    ];
  } catch {
    return [website];
  }
}

export function matchesCredentialSearch(
  entry: SearchableCredential,
  query: string,
): boolean {
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const identities = [entry.record.username, entry.item.ownerEmail]
    .map(normalize)
    .map((value) => value.replace(/\s+/g, ""));
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  if (identities.some((identity) => identity.includes(compactQuery))) return true;

  const fields = [
    entry.record.title,
    entry.record.username,
    entry.item.ownerEmail,
    entry.record.category,
    ...websiteValues(entry.record.url),
  ].map(normalize);

  const websiteQuery =
    !/\s/.test(normalizedQuery) &&
    !normalizedQuery.includes("@") &&
    (normalizedQuery.includes("://") ||
      normalizedQuery.startsWith("www.") ||
      /^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(normalizedQuery));
  const queryWebsiteValues = websiteQuery
    ? websiteValues(query).map(normalize)
    : [];
  if (queryWebsiteValues.some((phrase) => fields.some((field) => field.includes(phrase))))
    return true;

  // Every search word must match somewhere, so a query can combine fields,
  // for example a site name and an account email.
  return terms.every((term) => fields.some((field) => field.includes(term)));
}
