"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "@/components/AuthForm.module.css";
import { PasswordInput } from "@/components/PasswordInput";
import { getErrorMessage, register } from "@/lib/auth-api";

export default function RegisterPage() {
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
      await register(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <h1 className={styles.title}>Регистрация</h1>
      <p className={styles.subtitle}>Создайте аккаунт FinanceTracker</p>

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
        label="Пароль (мин. 8 символов)"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <button className={styles.submit} type="submit" disabled={loading}>
        {loading ? "Создаём…" : "Зарегистрироваться"}
      </button>

      <p className={styles.footer}>
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </form>
  );
}
