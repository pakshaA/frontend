"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "@/components/AuthForm.module.css";
import { PasswordInput } from "@/components/PasswordInput";
import { getErrorMessage, login } from "@/lib/auth-api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1 className={styles.title}>Вход</h1>
      <p className={styles.subtitle}>Войдите в FinanceTracker</p>

      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <PasswordInput
        id="password"
        label="Пароль"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? "Входим…" : "Войти"}
      </button>

      <p className={styles.footer}>
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
    </form>
  );
}
