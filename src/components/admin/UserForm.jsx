import Link from "next/link";

const roles = [
  ["employee", "Karyawan"],
  ["division_head", "Kepala divisi"],
  ["hrd", "HRD"],
  ["admin", "Administrator"],
];

export function UserForm({ action, user, divisions }) {
  return (
    <form className="panel admin-form" action={action}>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <div className="form-grid">
        <label className="field" htmlFor="fullName">
          Nama lengkap
          <input className="input" id="fullName" name="fullName" required maxLength="150" defaultValue={user?.full_name ?? ""} />
        </label>
        <label className="field" htmlFor="username">
          Username
          <input className="input" id="username" name="username" required maxLength="50" defaultValue={user?.username ?? ""} />
        </label>
        <label className="field" htmlFor="email">
          Email
          <input className="input" id="email" name="email" type="email" required maxLength="150" defaultValue={user?.email ?? ""} />
        </label>
        <label className="field" htmlFor="password">
          Password {user ? "(kosongkan jika tidak diganti)" : "(minimal 8 karakter)"}
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required={!user} minLength="8" />
        </label>
        <label className="field" htmlFor="role">
          Peran
          <select className="input" id="role" name="role" defaultValue={user?.role ?? "employee"}>
            {roles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="divisionId">
          Divisi
          <select className="input" id="divisionId" name="divisionId" defaultValue={user?.division_id ?? ""}>
            <option value="">Tanpa divisi</option>
            {divisions.map((division) => <option value={division.id} key={division.id}>{division.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="joinDate">
          Tanggal bergabung
          <input className="input" id="joinDate" name="joinDate" type="date" required defaultValue={user?.join_date ? new Date(user.join_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="field" htmlFor="annualQuota">
          Kuota cuti tahunan
          <input className="input" id="annualQuota" name="annualQuota" type="number" min="0" step="0.5" required defaultValue={user?.annual_quota ?? 12} />
        </label>
        <label className="field" htmlFor="phone">
          Telepon
          <input className="input" id="phone" name="phone" maxLength="30" defaultValue={user?.phone ?? ""} />
        </label>
        <label className="field" htmlFor="address">
          Alamat
          <input className="input" id="address" name="address" maxLength="500" defaultValue={user?.address ?? ""} />
        </label>
      </div>
      <div className="form-actions">
        <Link className="button button-secondary" href="/admin/users">Batal</Link>
        <button className="button" type="submit">{user ? "Simpan perubahan" : "Tambah pengguna"}</button>
      </div>
    </form>
  );
}
