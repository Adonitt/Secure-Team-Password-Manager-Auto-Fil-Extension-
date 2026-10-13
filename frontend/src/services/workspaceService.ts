import { request } from "../../../shared/api";
import type { Role, Workspace, WorkspaceDetails } from "../../../shared/types";
type Rekey = {
  itemId: string;
  ciphertext: string;
  nonce: string;
  version: number;
  grants: { userId: string; wrappedKey: string; role: Role; source: string }[];
};
export const workspaceService = {
  list: (token: string) => request<Workspace[]>(token, "/workspaces"),
  details: (token: string, id: string) =>
    request<WorkspaceDetails>(token, `/workspaces/${id}`),
  create: (token: string, name: string) =>
    request<Workspace>(token, "/workspaces", "POST", { name }),
  update: (token: string, id: string, name: string) =>
    request<Workspace>(token, `/workspaces/${id}`, "PUT", { name }),
  remove: (token: string, id: string) =>
    request<void>(token, `/workspaces/${id}`, "DELETE"),
  createCollection: (token: string, id: string, name: string) =>
    request(token, `/workspaces/${id}/collections`, "POST", { name }),
  updateCollection: (token: string, teamId: string, collectionId: string, name: string) =>
    request(token, `/workspaces/${teamId}/collections/${collectionId}`, "PUT", { name }),
  removeCollection: (token: string, teamId: string, collectionId: string) =>
    request<void>(
      token,
      `/workspaces/${teamId}/collections/${collectionId}`,
      "DELETE",
    ),
  addMember: (
    token: string,
    id: string,
    body: {
      email: string;
      role: Role;
      envelopes: { itemId: string; wrappedKey: string }[];
    },
  ) => request<void>(token, `/workspaces/${id}/members`, "POST", body),
  changeRole: (token: string, id: string, userId: string, role: Role) =>
    request<void>(token, `/workspaces/${id}/members/${userId}`, "PUT", {
      role,
    }),
  removeMember: (token: string, id: string, userId: string, items: Rekey[]) =>
    request<void>(token, `/workspaces/${id}/members/${userId}/remove`, "POST", {
      items,
    }),
};
