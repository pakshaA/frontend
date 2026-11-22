"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  HiOutlineBars3,
  HiOutlineBuildingLibrary,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineCreditCard,
  HiOutlineFlag,
  HiOutlineHome,
  HiOutlineTag,
  HiOutlineUser,
  HiOutlineXMark,
} from "react-icons/hi2";
import styles from "./SideNav.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: "exact" | "prefix";
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Главная", icon: <HiOutlineHome />, match: "exact" },
  { href: "/charts", label: "Диаграммы", icon: <HiOutlineChartBar /> },
  { href: "/cards", label: "Карты", icon: <HiOutlineCreditCard /> },
  { href: "/deposits", label: "Вклады", icon: <HiOutlineBuildingLibrary /> },
  { href: "/goals", label: "Цели", icon: <HiOutlineFlag /> },
  { href: "/payments", label: "Платежи", icon: <HiOutlineCalendarDays /> },
  { href: "/categories", label: "Категории", icon: <HiOutlineTag /> },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type SideNavProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function SideNav({ mobileOpen, onClose }: SideNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      <div
        className={styles.backdrop}
        data-open={mobileOpen ? "true" : "false"}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={styles.sidebar}
        data-open={mobileOpen ? "true" : "false"}
        aria-label="Основная навигация"
      >
        <div className={styles.brandRow}>
          <Link href="/" className={styles.brand} onClick={onClose}>
            <span className={styles.brandMark} aria-hidden />
            <span className={styles.brandText}>
              Finance<span>Tracker</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть меню"
          >
            <HiOutlineXMark />
          </button>
        </div>

        <p className={styles.sectionLabel}>Разделы</p>

        <nav className={styles.nav}>
          {MAIN_NAV.map((item, index) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.link}
                data-active={active ? "true" : "false"}
                style={{ "--i": index } as React.CSSProperties}
                onClick={onClose}
              >
                <span className={styles.icon} aria-hidden>
                  {item.icon}
                </span>
                <span className={styles.label}>{item.label}</span>
                {active ? (
                  <span className={styles.activeGlow} aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <p className={styles.sectionLabel}>Аккаунт</p>
          <nav className={styles.nav}>
            <Link
              href="/profile"
              className={styles.link}
              data-active={
                isActive(pathname, {
                  href: "/profile",
                  label: "",
                  icon: null,
                })
                  ? "true"
                  : "false"
              }
              style={{ "--i": 0 } as React.CSSProperties}
              onClick={onClose}
            >
              <span className={styles.icon} aria-hidden>
                <HiOutlineUser />
              </span>
              <span className={styles.label}>Профиль</span>
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}

type MobileTopBarProps = {
  onOpen: () => void;
};

export function MobileTopBar({ onOpen }: MobileTopBarProps) {
  return (
    <div className={styles.mobileBar}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={onOpen}
        aria-label="Открыть меню"
      >
        <HiOutlineBars3 />
      </button>
      <Link href="/" className={styles.mobileBrand}>
        FinanceTracker
      </Link>
    </div>
  );
}
