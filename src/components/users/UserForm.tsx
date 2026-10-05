'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { Role, Retreat, User } from "@/services/database";

export type UserFormData = {
  name: string;
  login: string;
  password?: string;
  role: string;
  retreat_id: number | null;
};

type UserFormProps = {
  user: User | null;
  roles: Role[];
  retreats: Retreat[];
  actionError: string;
  onSaveActionClick: (data: UserFormData) => Promise<void>;
  onCancelActionClick: () => void;
};

export default function UserForm({
  user,
  roles,
  retreats,
  actionError,
  onSaveActionClick,
  onCancelActionClick,
}: UserFormProps) {
  const strAddTitle = "Add user";
  const strEditTitle = "Edit user";
  const strName = "Name";
  const strLogin = "Login";
  const strPassword = "Password";
  const strPasswordOptional = "Leave blank to keep the current password";
  const strShowPassword = "Show password";
  const strRole = "Role";
  const strRetreat = "Retreat";
  const strNoRetreat = "No retreat";
  const strSave = "Save";
  const strCancel = "Cancel";
  const strSaving = "Saving...";

  const [name, setName] = useState(user?.name ?? "");
  const [login, setLogin] = useState(user?.login ?? "");
  const [password, setPassword] = useState(user?.password ?? "");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [role, setRole] = useState(user?.role ?? roles[0]?.role_name ?? "");
  const [retreatId, setRetreatId] = useState(user?.retreat_id?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const formTitle = user ? strEditTitle : strAddTitle;

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLogin(event.target.value);
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const onPasswordVisibilityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsPasswordVisible(event.target.checked);
  };

  const onRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value;
    setRole(nextRole);

    if (nextRole !== "organizer") {
      setRetreatId("");
    }
  };

  const onRetreatChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRetreatId(event.target.value);
  };

  const onSubmitHandler = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data: UserFormData = {
      name: name.trim(),
      login: login.trim(),
      role,
      retreat_id: role === "organizer" && retreatId ? Number(retreatId) : null,
    };

    if (password) {
      data.password = password;
    }

    setIsSaving(true);

    try {
      await onSaveActionClick(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-xl font-semibold">{formTitle}</h2>
        <form onSubmit={onSubmitHandler}>
          <div className="mb-4">
            <label htmlFor="user-name" className="mb-1 block text-sm font-medium">{strName}</label>
            <input id="user-name" value={name} onChange={onNameChange} required className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label htmlFor="user-login" className="mb-1 block text-sm font-medium">{strLogin}</label>
            <input id="user-login" value={login} onChange={onLoginChange} required autoComplete="username" className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="mb-4">
            <label htmlFor="user-password" className="mb-1 block text-sm font-medium">{strPassword}</label>
            <input id="user-password" type={isPasswordVisible ? "text" : "password"} value={password} onChange={onPasswordChange} required={!user} autoComplete="new-password" className="w-full rounded-md border border-gray-300 px-3 py-2" />
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={isPasswordVisible} onChange={onPasswordVisibilityChange} />
              <span>{strShowPassword}</span>
            </label>
            {user ? <p className="mt-1 text-xs text-gray-500">{strPasswordOptional}</p> : null}
          </div>
          <div className="mb-4">
            <label htmlFor="user-role" className="mb-1 block text-sm font-medium">{strRole}</label>
            <select id="user-role" value={role} onChange={onRoleChange} required className="w-full rounded-md border border-gray-300 px-3 py-2">
              {roles.map((item) => (
                <option key={item.role_name} value={item.role_name}>{item.role_name}</option>
              ))}
            </select>
          </div>
          {role === "organizer" ? (
            <div className="mb-6">
              <label htmlFor="user-retreat" className="mb-1 block text-sm font-medium">{strRetreat}</label>
              <select id="user-retreat" value={retreatId} onChange={onRetreatChange} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">{strNoRetreat}</option>
                {retreats.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>
          ) : null}
          {actionError ? <div role="alert" className="mb-4 text-sm text-red-600">{actionError}</div> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancelActionClick} disabled={isSaving} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">{strCancel}</button>
            <button type="submit" disabled={isSaving || roles.length === 0} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? strSaving : strSave}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
