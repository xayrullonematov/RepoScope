"use client";

import { createContext, useContext, type ReactNode } from "react";
import { MOCK_USER, type CurrentUser } from "./mock-user";

const UserContext = createContext<CurrentUser>(MOCK_USER);

export function UserProvider({
  children,
  user = MOCK_USER,
}: {
  children: ReactNode;
  user?: CurrentUser;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  return useContext(UserContext);
}
