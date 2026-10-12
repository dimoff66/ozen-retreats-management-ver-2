'use client';

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@/services/database";

export type UserDirectoryEntry = {
  id: number;
  name: string;
};

type CurrentUserContextValue = {
  users: UserDirectoryEntry[];
  currentUser: User;
  setUsers: (users: UserDirectoryEntry[]) => void;
  setCurrentUser: (user: User) => void;
};

type CurrentUserProviderProps = {
  children: ReactNode;
  initialUser: User;
  initialUsers: UserDirectoryEntry[];
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider(props: CurrentUserProviderProps) {
  const [users, setUsers] = useState<UserDirectoryEntry[]>(props.initialUsers);
  const [currentUser, setCurrentUser] = useState<User>(props.initialUser);

  return (
    <CurrentUserContext.Provider value={{ users, currentUser, setUsers, setCurrentUser }}>
      {props.children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used inside CurrentUserProvider.");
  }

  return context;
}
