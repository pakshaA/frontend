"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage, type AuthUser } from "@/lib/auth-api";
import {
  changePassword,
  fetchProfile,
  updatePreferences,
  updateProfile,
} from "@/lib/users-api";
import styles from "./page.module.css";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы открыть профиль");
      return;
    }

    fetchProfile()
      .then((profile) => {
        setUser(profile);
        setEmail(profile.email);
        setTheme(profile.preferences.theme);
        document.documentElement.setAttribute(
          "data-theme",
          profile.preferences.theme === "system"
            ? "dark"
            : profile.preferences.theme,
        );
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateProfile(email.trim());
      setUser(updated);
      setMessage("Профиль обновлён");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveTheme(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updatePreferences({ theme });
      setUser(updated);
      document.documentElement.setAttribute(
        "data-theme",
        theme === "system" ? "dark" : theme,
      );
      setMessage("Тема сохранена");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Пароль изменён");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className={styles.muted}>Загрузка…</p>;

  if (!user) {
    return (
      <p className={styles.muted}>
        {error ?? "Нет доступа"}. <Link href="/login">Войти</Link>
      </p>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>
      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.card} onSubmit={onSaveProfile}>
        <h2>Email</h2>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={saving}>
          Сохранить email
        </button>
      </form>

      <form className={styles.card} onSubmit={onSaveTheme}>
        <h2>Тема</h2>
        <label>
          Оформление
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as "light" | "dark" | "system")
            }
          >
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
            <option value="system">Системная</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>
          Сохранить тему
        </button>
      </form>

      <form className={styles.card} onSubmit={onChangePassword}>
        <h2>Смена пароля</h2>
        <PasswordInput
          id="current-password"
          label="Текущий пароль"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordInput
          id="new-password"
          label="Новый пароль"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <button type="submit" disabled={saving}>
          Сменить пароль
        </button>
      </form>
    </div>
  );
}
