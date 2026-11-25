import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { updateProfileAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

const roleNames = {
  admin: "Administrator",
  employee: "Karyawan",
  division_head: "Kepala divisi",
  hrd: "HRD",
};

export default async function ProfilePage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profileResult, params] = await Promise.all([
    db.query(
      `SELECT u.username, u.full_name, u.email, u.phone, u.address, u.role,
              u.annual_quota, d.name AS division_name,
              COALESCE(SUM(lr.total_days) FILTER (
                WHERE lr.status = 'approved'
                  AND lr.deducts_quota = TRUE
                  AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              ), 0)::numeric AS used
       FROM users u
       LEFT JOIN divisions d ON d.id = u.division_id
       LEFT JOIN leave_requests lr ON lr.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, d.name`,
      [user.id],
    ),
    searchParams,
  ]);
  const profile = profileResult.rows[0];
  if (!profile) redirect("/login");

  const used = Number(profile.used);
  const remaining = Math.max(0, Number(profile.annual_quota) - used);

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Akun</div>
          <h1>Profil saya</h1>
          <p>{profile.username} · {roleNames[profile.role] ?? profile.role} · {profile.division_name ?? "Tanpa divisi"}</p>
        </div>
      </div>

      {params?.success ? <div className="alert alert-success" role="status">Profil berhasil diperbarui.</div> : null}
      {params?.error ? (
        <div className="alert">
          {params.error === "duplicate" ? "Email sudah digunakan." : "Nama atau email tidak valid."}
        </div>
      ) : null}

      <section className="stats-grid" aria-label="Informasi kuota cuti">
        <StatCard label="Kuota terpakai" value={used} note="Cuti disetujui tahun ini" />
        <StatCard label="Sisa kuota" value={remaining} note={`Dari ${profile.annual_quota} hari per tahun`} />
      </section>

      <form className="panel admin-form" action={updateProfileAction}>
        <div className="form-grid">
          <label className="field" htmlFor="fullName">
            Nama lengkap
            <input className="input" id="fullName" name="fullName" required maxLength="150" defaultValue={profile.full_name} />
          </label>
          <label className="field" htmlFor="email">
            Email
            <input className="input" id="email" name="email" type="email" required maxLength="150" defaultValue={profile.email} />
          </label>
          <label className="field" htmlFor="phone">
            Telepon
            <input className="input" id="phone" name="phone" maxLength="30" defaultValue={profile.phone ?? ""} />
          </label>
          <label className="field" htmlFor="address">
            Alamat
            <input className="input" id="address" name="address" maxLength="500" defaultValue={profile.address ?? ""} />
          </label>
        </div>
        <div className="form-actions">
          <button className="button" type="submit">Simpan perubahan</button>
        </div>
      </form>
    </AppShell>
  );
}
