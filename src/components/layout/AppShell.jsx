import Link from "next/link";
import { logoutAction } from "@/app/actions";

const roleNames = {
  admin: "Administrator",
  employee: "Karyawan",
  division_head: "Kepala divisi",
  hrd: "HRD",
};

export function AppShell({ user, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">R</span>
          <div>
            <div className="brand-name">Ruang Cuti</div>
            <div className="brand-caption">Leave management</div>
          </div>
        </div>
        <nav aria-label="Navigasi utama">
          <div className="nav-caption">Menu</div>
          <Link className="nav-item nav-item-active" href="/">
            <span className="nav-icon" aria-hidden="true">⌂</span>
            Dashboard
          </Link>
          <Link className="nav-item" href="/leaves">
            <span className="nav-icon" aria-hidden="true">□</span>
            Pengajuan cuti
          </Link>
          {["division_head", "hrd", "admin"].includes(user.role) ? (
            <Link className="nav-item" href="/approvals">
              <span className="nav-icon" aria-hidden="true">✓</span>
              Persetujuan
            </Link>
          ) : null}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <div className="user-name">{user.full_name}</div>
            <div className="user-role">{roleNames[user.role] ?? user.role}</div>
          </div>
          <form action={logoutAction}>
            <button className="logout-button" type="submit">Keluar ↗</button>
          </form>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <strong>Portal Karyawan</strong>
          <span className="topbar-date">
            {new Intl.DateTimeFormat("id-ID", {
              dateStyle: "long",
              timeZone: "Asia/Jakarta",
            }).format(new Date())}
          </span>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
