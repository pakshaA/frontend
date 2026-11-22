import Link from "next/link";
import styles from "./page.module.css";

export default function OfflinePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Нет сети</h1>
      <p className={styles.lead}>
        FinanceTracker работает офлайн в ограниченном режиме. Транзакции,
        созданные без сети, попадут в очередь и синхронизируются при
        появлении соединения.
      </p>
      <Link href="/" className={styles.link}>
        На главную
      </Link>
    </div>
  );
}
