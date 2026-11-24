import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LeaveRequestCard } from "@/components/leave/LeaveRequestCard";
import { StatCard } from "@/components/ui/StatCard";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getDashboardData } from "@/lib/leave";

const roleCopy = {
  employee: {
    title: "Ruang kerja Anda",
    description: "Pantau jatah dan pengajuan cuti dalam satu tempat.",
  },
  division_head: {
    title: "Persetujuan divisi",
    description: "Pantau pengajuan cuti dari anggota divisi Anda.",
  },
  hrd: {
    title: "Ringkasan HRD",
    description: "Kelola persetujuan akhir dan pantau pengajuan karyawan.",
  },
  admin: {
    title: "Ringkasan sistem",
    description: "Pantau aktivitas cuti dan pengguna perusahaan.",
  },
};

const queueTitles = {
  employee: "Pengajuan terbaru",
  division_head: "Pengajuan tim menunggu persetujuan",
  hrd: "Pengajuan menunggu HRD",
  admin: "Pengajuan yang masih terbuka",
};

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dashboard = await getDashboardData(user);
  const copy = roleCopy[user.role] ?? roleCopy.employee;
  const stats =
    user.role === "employee"
      ? [
          { label: "Sisa cuti tahunan", value: dashboard.remaining, note: "Hari tersedia tahun ini" },
          { label: "Menunggu keputusan", value: dashboard.pending, note: "Pengajuan Anda" },
          { label: "Pengajuan tahun ini", value: dashboard.total, note: "Semua jenis cuti" },
        ]
      : [
          { label: user.role === "division_head" ? "Menunggu ketua divisi" : user.role === "hrd" ? "Menunggu HRD" : "Belum selesai", value: dashboard.pending, note: user.role === "division_head" ? "Divisi Anda" : "Perlu ditinjau" },
          { label: "Pengajuan tahun ini", value: dashboard.total, note: "Semua status" },
          { label: "Karyawan", value: dashboard.employees, note: "Dalam cakupan Anda" },
        ];

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Dashboard / {user.role.replace("_", " ")}</div>
          <h1>{copy.title}</h1>
          <p>Halo, {user.full_name}. {copy.description}</p>
        </div>
        {user.role === "employee" || user.role === "division_head" ? (
          <Link className="button" href="/leaves/new">Ajukan cuti</Link>
        ) : null}
      </div>

      <section className="stats-grid" aria-label="Ringkasan cuti">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="panel" aria-labelledby="requests-heading">
        <div className="panel-heading">
          <h2 id="requests-heading">
            {queueTitles[user.role]}
          </h2>
        </div>
        {dashboard.requests.length ? (
          <div className="request-list">
            {dashboard.requests.map((request) => (
              <LeaveRequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Belum ada pengajuan cuti untuk ditampilkan.</div>
        )}
      </section>
    </AppShell>
  );
}
