import { request } from "../../../shared/api";
import type { CryptoInfo, Session } from "../../../shared/types";
export const authService = {
  register: (body: CryptoInfo & {
    firstName: string;
    lastName: string;
    email: string;
    accountPassword: string;
  }) =>
    request<Session>(null, "/auth/register", "POST", body),
  login: (body: { email: string; accountPassword: string }) =>
    request<Session>(null, "/auth/login", "POST", body),
  crypto: (token: string) => request<CryptoInfo>(token, "/auth/crypto"),
  lookup: (token: string, email: string) =>
    request<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      publicKey: string;
    }>(
      token,
      `/users/lookup?email=${encodeURIComponent(email)}`,
    ),
  searchUsers: (token: string, query: string) =>
    request<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      publicKey: string;
    }[]>(
      token,
      `/users/search?q=${encodeURIComponent(query)}`,
    ),
  logout: (token: string) => request<void>(token, "/auth/logout", "POST"),
};
