import Link from "next/link";

export function LeaveTypeForm({ action, leaveType }) {
  return (
    <form className="panel admin-form" action={action}>
      {leaveType ? <input type="hidden" name="id" value={leaveType.id} /> : null}
      <label className="field" htmlFor="code">
        Kode
        <input className="input" id="code" name="code" required maxLength="30" defaultValue={leaveType?.code ?? ""} />
      </label>
      <label className="field" htmlFor="name">
        Nama jenis cuti
        <input className="input" id="name" name="name" required maxLength="100" defaultValue={leaveType?.name ?? ""} />
      </label>
      <label className="field" htmlFor="description">
        Deskripsi
        <textarea className="textarea" id="description" name="description" rows="3" defaultValue={leaveType?.description ?? ""} />
      </label>
      <div className="form-grid">
        <label className="field" htmlFor="quotaPerYear">
          Kuota per tahun (kosong = tanpa batas)
          <input className="input" id="quotaPerYear" name="quotaPerYear" type="number" min="0" step="0.5" defaultValue={leaveType?.quota_per_year ?? ""} />
        </label>
        <label className="field" htmlFor="minNoticeDays">
          Minimum pemberitahuan (hari)
          <input className="input" id="minNoticeDays" name="minNoticeDays" type="number" min="0" step="1" defaultValue={leaveType?.min_notice_days ?? 0} />
        </label>
        <label className="field" htmlFor="maxBackdateDays">
          Batas pengajuan mundur (hari)
          <input className="input" id="maxBackdateDays" name="maxBackdateDays" type="number" min="0" step="1" defaultValue={leaveType?.max_backdate_days ?? 0} />
        </label>
      </div>
      <div className="admin-options">
        <label><input type="checkbox" name="requiresAttachment" defaultChecked={leaveType?.requires_attachment ?? false} /> Wajib lampiran</label>
        <label><input type="checkbox" name="deductsAnnualQuota" defaultChecked={leaveType?.deducts_annual_quota ?? false} /> Potong kuota tahunan</label>
        <label><input type="checkbox" name="isActive" defaultChecked={leaveType?.is_active ?? true} /> Aktif</label>
      </div>
      <div className="form-actions">
        <Link className="button button-secondary" href="/admin/leave-types">Batal</Link>
        <button className="button" type="submit">{leaveType ? "Simpan perubahan" : "Tambah jenis cuti"}</button>
      </div>
    </form>
  );
}
