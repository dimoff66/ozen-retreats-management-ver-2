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
  const initials = currentUser?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "";

  if (isLoadingUsers) {
    return <div className="ozen-user-message">{strLoading}</div>;
  }

  if (usersLoadError) {
    return <div className="ozen-user-message ozen-user-message-error">{strLoadError}</div>;
  }

  return (
    <label className="ozen-user-selector" aria-label={strCurrentUser}>
      <span className="ozen-user-avatar">{initials}</span>
      <span className="ozen-user-copy">
        <strong>{currentUser?.name}</strong>
        <small>{currentUser?.role}</small>
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="m6 8 4 4 4-4" /></svg>
      <select value={currentUser?.id ?? ""} onChange={onUserChange}>
        {userOptions.map((user) => (
          <option key={user.id} value={user.id}>{user.label}</option>
        ))}
      </select>
    </label>
  );
}
