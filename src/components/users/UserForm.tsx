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
  const [password, setPassword] = useState("");
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
    <div className="ozen-modal-backdrop">
      <div className="ozen-form-modal">
        <div className="ozen-form-modal-header"><h2>{formTitle}</h2></div>
        <form onSubmit={onSubmitHandler} className="ozen-form-body">
          <label htmlFor="user-name" className="ozen-form-field"><span>{strName}</span><input id="user-name" value={name} onChange={onNameChange} required /></label>
          <label htmlFor="user-login" className="ozen-form-field"><span>{strLogin}</span><input id="user-login" value={login} onChange={onLoginChange} required autoComplete="username" /></label>
          <div className="ozen-form-field">
            <label htmlFor="user-password">{strPassword}</label>
            <input id="user-password" type={isPasswordVisible ? "text" : "password"} value={password} onChange={onPasswordChange} required={!user} autoComplete="new-password" minLength={8} maxLength={256} />
            <label className="ozen-checkbox-field ozen-checkbox-field-compact"><input type="checkbox" checked={isPasswordVisible} onChange={onPasswordVisibilityChange} /><span>{strShowPassword}</span></label>
            {user ? <p className="ozen-field-note">{strPasswordOptional}</p> : null}
          </div>
          <label htmlFor="user-role" className="ozen-form-field"><span>{strRole}</span><select id="user-role" value={role} onChange={onRoleChange} required>{roles.map((item) => <option key={item.role_name} value={item.role_name}>{item.role_name}</option>)}</select></label>
          {role === "organizer" ? (
            <label htmlFor="user-retreat" className="ozen-form-field"><span>{strRetreat}</span><select id="user-retreat" value={retreatId} onChange={onRetreatChange}><option value="">{strNoRetreat}</option>{retreats.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          ) : null}
          {actionError ? <div role="alert" className="ozen-state-message ozen-state-error">{actionError}</div> : null}
          <div className="ozen-form-footer"><button type="button" onClick={onCancelActionClick} disabled={isSaving} className="ozen-action-button ozen-action-button-secondary">{strCancel}</button><button type="submit" disabled={isSaving || roles.length === 0} className="ozen-action-button ozen-action-button-primary">{isSaving ? strSaving : strSave}</button></div>
        </form>
      </div>
    </div>
  );
}
