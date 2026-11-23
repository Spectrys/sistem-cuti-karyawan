"use client";

import { useState } from "react";
import Link from "next/link";

export function LeaveForm({ leaveTypes, handovers, action }) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState("false");
  const [calculation, setCalculation] = useState("");

  async function calculateDays() {
    if (!leaveTypeId || !startDate || !endDate) return;
    setCalculation("Menghitung...");
    try {
      const response = await fetch("/api/leaves/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId,
          startDate,
          endDate,
          isHalfDay: isHalfDay === "true",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCalculation(`${data.totalDays} hari kerja`);
    } catch (error) {
      setCalculation(error.message);
    }
  }

  return (
    <form className="form-panel panel" action={action}>
      <div className="form-grid">
        <label className="field" htmlFor="leaveTypeId">
          Jenis cuti
          <select
            className="input"
            id="leaveTypeId"
            name="leaveTypeId"
            required
            value={leaveTypeId}
            onChange={(event) => setLeaveTypeId(event.target.value)}
          >
            <option value="">Pilih jenis cuti</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="isHalfDay">
          Bentuk cuti
          <select
            className="input"
            id="isHalfDay"
            name="isHalfDay"
            value={isHalfDay}
            onChange={(event) => setIsHalfDay(event.target.value)}
          >
            <option value="false">Cuti harian penuh</option>
            <option value="true">Setengah hari</option>
          </select>
        </label>
        <label className="field" htmlFor="startDate">
          Tanggal mulai
          <input className="input" id="startDate" name="startDate" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="field" htmlFor="endDate">
          Tanggal selesai
          <input className="input" id="endDate" name="endDate" type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <div className="calculation-row field-full">
          <button className="button button-secondary" type="button" onClick={calculateDays}>
            Hitung hari kerja
          </button>
          {calculation ? <span>{calculation}</span> : null}
        </div>
        <label className="field field-full" htmlFor="reason">
          Alasan
          <textarea className="textarea" id="reason" name="reason" rows="4" required />
        </label>
        <label className="field" htmlFor="handoverUserId">
          Rekan pengganti
          <select className="input" id="handoverUserId" name="handoverUserId">
            <option value="">Tanpa rekan pengganti</option>
            {handovers.map((person) => (
              <option key={person.id} value={person.id}>{person.full_name}</option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="handoverNotes">
          Catatan serah terima
          <input className="input" id="handoverNotes" name="handoverNotes" />
        </label>
        <label className="field" htmlFor="leaveAddress">
          Alamat selama cuti
          <input className="input" id="leaveAddress" name="leaveAddress" />
        </label>
        <label className="field" htmlFor="emergencyPhone">
          Nomor darurat
          <input className="input" id="emergencyPhone" name="emergencyPhone" />
        </label>
        <label className="field" htmlFor="attachmentPath">
          Lampiran (nama/lokasi file)
          <input className="input" id="attachmentPath" name="attachmentPath" placeholder="contoh: uploads/surat-dokter.pdf" />
        </label>
      </div>
      <div className="form-actions">
        <Link className="button button-secondary" href="/leaves">Batal</Link>
        <button className="button" type="submit">Kirim pengajuan</button>
      </div>
    </form>
  );
}
