'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { User } from "@/services/database";
import usersService from "@/services/usersService";

type CurrentUserContextValue = {
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  isLoadingUsers: boolean;
  usersLoadError: boolean;
};

type CurrentUserProviderProps = {
  children: ReactNode;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  children,
}: CurrentUserProviderProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState(false);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUsersLoadError(false);

    try {
      const data = await usersService.getUsers();

      setUsers(data);

      const admin = data.find(
        (user) => user.login === "admin" && user.role === "admin"
      );

      const defaultUser = admin ?? data[0] ?? null;

      setCurrentUser(defaultUser);
    } catch {
      setUsersLoadError(true);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const value: CurrentUserContextValue = {
    users,
    currentUser,
    setCurrentUser,
    isLoadingUsers,
    usersLoadError,
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error(
      "useCurrentUser must be used inside CurrentUserProvider."
    );
  }

  return context;
}