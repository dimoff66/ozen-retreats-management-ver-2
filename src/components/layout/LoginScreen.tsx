'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";

const KNOWN_LOGINS_STORAGE_KEY = "project-known-logins";
const MAX_SAVED_LOGINS = 8;

type LoginResponse = {
  error?: string;
};

function readKnownLogins(): string[] {
  try {
    const value = window.localStorage.getItem(KNOWN_LOGINS_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) as unknown : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function saveKnownLogin(login: string): void {
  const existing = readKnownLogins().filter(item => item !== login);
  const next = [login, ...existing].slice(0, MAX_SAVED_LOGINS);
  window.localStorage.setItem(KNOWN_LOGINS_STORAGE_KEY, JSON.stringify(next));
}

type LoginScreenProps = {
  invalidLink?: boolean;
};

export default function LoginScreen(props: LoginScreenProps) {
  const strTitle = "Sign in";
  const strCaption = "Enter your login and password.";
  const strLogin = "Login";
  const strPassword = "Password";
  const strSignIn = "Sign in";
  const strSigningIn = "Signing in...";
  const strLoginError = "Invalid login or password.";
  const strInvalidLink = "Invalid login link.";
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [knownLogins, setKnownLogins] = useState<string[]>([]);
  const [error, setError] = useState((props.invalidLink ?? false) ? strInvalidLink : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedLogins = readKnownLogins();
    setKnownLogins(savedLogins);
    setLogin(savedLogins[0] ?? "");
  }, []);

  const onLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLogin(event.target.value);
    setError("");
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setError("");
  };

  const onSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const data = await response.json() as LoginResponse;

      if (!response.ok) {
        setError(response.status === 401 ? strLoginError : data.error || strLoginError);
        return;
      }

      const normalizedLogin = login.trim();
      saveKnownLogin(normalizedLogin);
      window.location.reload();
    } catch {
      setError(strLoginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="project-login-screen">
      <section className="project-login-card">
        <div className="project-login-brand">
          <span className="project-login-brand-mark">✦</span>
          <strong>ozen</strong>
        </div>
        <div className="project-login-heading">
          <h1>{strTitle}</h1>
          <p>{strCaption}</p>
        </div>
        <form onSubmit={onSubmit} className="project-login-form">
          <label htmlFor="login-name" className="project-form-field">
            <span>{strLogin}</span>
            <input
              id="login-name"
              value={login}
              onChange={onLoginChange}
              list={knownLogins.length > 0 ? "known-logins" : undefined}
              autoComplete="username"
              required
            />
          </label>
          {knownLogins.length > 0 && (
            <datalist id="known-logins">
              {knownLogins.map(knownLogin => <option key={knownLogin} value={knownLogin} />)}
            </datalist>
          )}
          <label htmlFor="login-password" className="project-form-field">
            <span>{strPassword}</span>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={onPasswordChange}
              autoComplete="current-password"
              maxLength={256}
              required
            />
          </label>
          {error && <div role="alert" className="project-state-message project-state-error">{error}</div>}
          <button type="submit" disabled={isSubmitting} className="project-action-button project-action-button-primary project-login-submit">
            {isSubmitting ? strSigningIn : strSignIn}
          </button>
        </form>
      </section>
    </main>
  );
}
