import type { Role } from "../../../shared/types";
export const rank = (role: Role) =>
  ({ VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4 })[role];
