'use client';

import type { ChangeEvent } from "react";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function UserSelector() {
  const strCurrentUser = "Current user";
  const strLoading = "Loading users...";
  const strLoadError = "Failed to load users.";

  const {
    users,
    currentUser,
    setCurrentUser,
    isLoadingUsers,
    usersLoadError,
  } = useCurrentUser();

  const onUserChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(event.target.value);
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    setCurrentUser(user);
  };

  const userOptions = users.map((user) => {
    return {
      id: user.id,
      label: `${user.name} (${user.role})`,
    };
  });

  if (isLoadingUsers) {
    return <div className="text-sm text-gray-500">{strLoading}</div>;
  }

  if (usersLoadError) {
    return <div className="text-sm text-red-600">{strLoadError}</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">{strCurrentUser}</label>
      <select
        value={currentUser?.id ?? ""}
        onChange={onUserChange}
        className="min-w-56 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        {userOptions.map((user) => (
          <option key={user.id} value={user.id}>{user.label}</option>
        ))}
      </select>
    </div>
  );
}