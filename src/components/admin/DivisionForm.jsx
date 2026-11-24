import Link from "next/link";

export function DivisionForm({ action, division, leaders }) {
  return (
    <form className="panel admin-form" action={action}>
      {division ? <input type="hidden" name="id" value={division.id} /> : null}
      <label className="field" htmlFor="name">
        Nama divisi
        <input className="input" id="name" name="name" required maxLength="100" defaultValue={division?.name ?? ""} />
      </label>
      <label className="field" htmlFor="description">
        Deskripsi
        <textarea className="textarea" id="description" name="description" rows="3" defaultValue={division?.description ?? ""} />
      </label>
      <label className="field" htmlFor="leaderId">
        Kepala divisi
        <select className="input" id="leaderId" name="leaderId" defaultValue={division?.leader_id ?? ""}>
          <option value="">Belum ditentukan</option>
          {leaders.map((leader) => (
            <option value={leader.id} key={leader.id}>{leader.full_name}</option>
          ))}
        </select>
      </label>
      <div className="form-actions">
        <Link className="button button-secondary" href="/admin/divisions">Batal</Link>
        <button className="button" type="submit">{division ? "Simpan perubahan" : "Tambah divisi"}</button>
      </div>
    </form>
  );
}
