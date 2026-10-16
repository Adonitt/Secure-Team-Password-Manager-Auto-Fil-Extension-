import { describe, expect, it } from "vitest";
import { matchesCredentialSearch } from "./credentialSearch";
import type { Item, VaultRecord } from "../../../shared/types";

const entry = {
  item: { ownerEmail: "alex.owner@example.com" } as Item,
  record: {
    title: "GitHub Work",
    username: "alex@company.test",
    url: "https://www.github.com/login",
    category: "Work",
  } as VaultRecord,
};

describe("vault credential search", () => {
  it("matches credential names and login emails without case sensitivity", () => {
    expect(matchesCredentialSearch(entry, "github work")).toBe(true);
    expect(matchesCredentialSearch(entry, "ALEX@COMPANY.TEST")).toBe(true);
    expect(matchesCredentialSearch(entry, "alex.owner@example.com")).toBe(true);
  });

  it("matches website domains with or without www and URL protocol", () => {
    expect(matchesCredentialSearch(entry, "github.com")).toBe(true);
    expect(matchesCredentialSearch(entry, "www.github.com")).toBe(true);
    expect(matchesCredentialSearch(entry, "https://github.com/login")).toBe(true);
  });

  it("allows a query to combine words from different fields", () => {
    expect(matchesCredentialSearch(entry, "github alex@company.test")).toBe(true);
    expect(matchesCredentialSearch(entry, "github missing@example.test")).toBe(false);
  });

  it("handles old or partial records with missing optional fields", () => {
    expect(matchesCredentialSearch({ item: { ownerEmail: "" }, record: { title: "Legacy" } }, "legacy")).toBe(true);
    expect(matchesCredentialSearch({ item: { ownerEmail: "" }, record: {} }, "anything")).toBe(false);
    expect(matchesCredentialSearch(entry, "   ")).toBe(true);
  });
});
