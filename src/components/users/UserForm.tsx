'use client';

import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import type { ManagedUser, Role, Retreat } from "@/services/database";

export type UserFormData = {
  name: string;
  login: string;
  password?: string;
  role: string;
  retreat_id: number | null;
  link_code: string | null;
};

type UserFormProps = {
  user: ManagedUser | null;
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
  const strLinkCode = "Link code";
  const strLinkCodeNote = "Permanent passwordless login code. Leave blank to disable the login link.";
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
  const [linkCode, setLinkCode] = useState(user?.link_code ?? "");
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

  const onLinkCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLinkCode(event.target.value);
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
      link_code: linkCode.trim() || null,
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
    <div className="project-modal-backdrop">
      <div className="project-form-modal">
        <div className="project-form-modal-header"><h2>{formTitle}</h2></div>
        <form onSubmit={onSubmitHandler} className="project-form-body">
          <label htmlFor="user-name" className="project-form-field"><span>{strName}</span><input id="user-name" value={name} onChange={onNameChange} required /></label>
          <label htmlFor="user-login" className="project-form-field"><span>{strLogin}</span><input id="user-login" value={login} onChange={onLoginChange} required autoComplete="username" /></label>
          <div className="project-form-field">
            <label htmlFor="user-password">{strPassword}</label>
            <input id="user-password" type={isPasswordVisible ? "text" : "password"} value={password} onChange={onPasswordChange} required={!user} autoComplete="new-password" minLength={8} maxLength={256} />
            <label className="project-checkbox-field project-checkbox-field-compact"><input type="checkbox" checked={isPasswordVisible} onChange={onPasswordVisibilityChange} /><span>{strShowPassword}</span></label>
            {user && <p className="project-field-note">{strPasswordOptional}</p>}
          </div>
          <label htmlFor="user-link-code" className="project-form-field"><span>{strLinkCode}</span><input id="user-link-code" value={linkCode} onChange={onLinkCodeChange} maxLength={255} autoComplete="off" /><small className="project-field-note">{strLinkCodeNote}</small></label>
          <label htmlFor="user-role" className="project-form-field"><span>{strRole}</span><select id="user-role" value={role} onChange={onRoleChange} required>{roles.map(item => <option key={item.role_name} value={item.role_name}>{item.role_name}</option>)}</select></label>
          {role === "organizer" && (
            <label htmlFor="user-retreat" className="project-form-field"><span>{strRetreat}</span><select id="user-retreat" value={retreatId} onChange={onRetreatChange}><option value="">{strNoRetreat}</option>{retreats.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          )}
          {actionError && <div role="alert" className="project-state-message project-state-error">{actionError}</div>}
          <div className="project-form-footer"><button type="button" onClick={onCancelActionClick} disabled={isSaving} className="project-action-button project-action-button-secondary">{strCancel}</button><button type="submit" disabled={isSaving || roles.length === 0} className="project-action-button project-action-button-primary">{isSaving ? strSaving : strSave}</button></div>
        </form>
      </div>
    </div>
  );
}
