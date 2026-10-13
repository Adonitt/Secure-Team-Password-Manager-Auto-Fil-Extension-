import { request } from "../../../shared/api";
import type { Grant, Item, Role } from "../../../shared/types";
type Payload = { ciphertext: string; nonce: string };
type WrappedGrant = { userId: string; wrappedKey: string; role: Role };
export const vaultService = {
  list: (token: string) => request<Item[]>(token, "/items"),
  grants: (token: string, id: string) =>
    request<Grant[]>(token, `/items/${id}/grants`),
  create: (
    token: string,
    body: Payload & {
      ownerWrappedKey: string;
      collectionId: string | null;
      collectionGrants: WrappedGrant[];
    },
  ) => request<Item>(token, "/items", "POST", body),
  update: (token: string, id: string, body: Payload & { version: number }) =>
    request<Item>(token, `/items/${id}`, "PUT", body),
  move: (
    token: string,
    id: string,
    body: {
      collectionId: string | null;
      collectionGrants: WrappedGrant[];
      version: number;
    },
  ) => request<Item>(token, `/items/${id}/move`, "POST", body),
  remove: (token: string, id: string) =>
    request<void>(token, `/items/${id}`, "DELETE"),
  share: (
    token: string,
    id: string,
    body: { email: string; role: Role; wrappedKey: string },
  ) => request<void>(token, `/items/${id}/shares`, "POST", body),
  changeRole: (token: string, id: string, userId: string, role: Role) =>
    request<void>(token, `/items/${id}/shares/${userId}`, "PUT", { role }),
  rekey: (
    token: string,
    id: string,
    body: Payload & {
      version: number;
      removeUserId: string;
      grants: (WrappedGrant & { source: string })[];
    },
  ) => request<Item>(token, `/items/${id}/rekey`, "POST", body),
};
