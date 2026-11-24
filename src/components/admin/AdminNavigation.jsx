import Link from "next/link";

const items = [
  { href: "/admin/leave-types", label: "Jenis cuti" },
  { href: "/admin/users", label: "Pengguna" },
  { href: "/admin/divisions", label: "Divisi" },
];

export function AdminNavigation({ active }) {
  return (
    <nav className="admin-tabs" aria-label="Administrasi">
      {items.map((item) => (
        <Link
          className={`filter-chip ${active === item.href ? "filter-active" : ""}`}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
