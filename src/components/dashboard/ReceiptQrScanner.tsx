"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  parseFiscalReceiptQr,
  type ParsedFiscalReceipt,
} from "@/lib/receipt-qr";
import styles from "./dashboard.module.css";

const SCANNER_ID = "ft-receipt-qr-reader";

type ReceiptQrScannerProps = {
  onScan: (parsed: ParsedFiscalReceipt) => void;
  onClose: () => void;
  onError?: (message: string) => void;
};

export function ReceiptQrScanner({
  onScan,
  onClose,
  onError,
}: ReceiptQrScannerProps) {
  const [status, setStatus] = useState("Запуск камеры…");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    async function start() {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          (decoded) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            try {
              const parsed = parseFiscalReceiptQr(decoded);
              setStatus("Чек распознан");
              void scanner
                .stop()
                .catch(() => undefined)
                .finally(() => onScan(parsed));
            } catch (err) {
              handledRef.current = false;
              const message =
                err instanceof Error ? err.message : "Не удалось разобрать QR";
              onError?.(message);
              setStatus(message);
            }
          },
          () => {
            /* ignore frame errors */
          },
        );
        if (!cancelled) setStatus("Наведите камеру на QR чека");
      } catch {
        if (cancelled) return;
        const message =
          "Не удалось открыть камеру. Разрешите доступ или откройте сайт по HTTPS.";
        setStatus(message);
        onError?.(message);
      }
    }

    void start();

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current?.isScanning) {
        void current.stop().catch(() => undefined);
      }
      try {
        current?.clear();
      } catch {
        /* ignore */
      }
    };
  }, [onScan, onError]);

  return (
    <div className={styles.qrOverlay} role="dialog" aria-modal="true">
      <div className={styles.qrPanel}>
        <div className={styles.qrHeader}>
          <h3>Сканер чека</h3>
          <button type="button" className={styles.ghostBtn} onClick={onClose}>
            Закрыть
          </button>
        </div>
        <p className={styles.qrHint}>{status}</p>
        <div id={SCANNER_ID} className={styles.qrViewport} />
      </div>
    </div>
  );
}
