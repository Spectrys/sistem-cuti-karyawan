import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { LeaveForm } from "@/components/leave/LeaveForm";
import { submitLeaveAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { getHandoverUsers, getLeaveTypes } from "@/lib/leave";

const errorMessages = {
  invalid: "Data pengajuan tidak valid.",
  notice: "Tanggal mulai tidak memenuhi minimum pemberitahuan jenis cuti.",
  backdate: "Tanggal mulai melebihi batas cuti mundur yang diizinkan.",
  attachment: "Lampiran surat/dokumen wajib dilampirkan.",
  overlap: "Periode cuti bertabrakan dengan pengajuan lain.",
  tenure: "Cuti tahunan baru dapat diajukan setelah masa kerja satu tahun.",
  quota: "Jatah cuti tahunan tidak mencukupi.",
};

export default async function NewLeavePage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [leaveTypes, handovers] = await Promise.all([
    getLeaveTypes(),
    getHandoverUsers(user),
  ]);
  const params = await searchParams;

  return (
    <AppShell user={user}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Pengajuan baru</div>
          <h1>Ajukan cuti</h1>
          <p>Lengkapi data pengajuan dengan informasi yang jelas.</p>
        </div>
      </div>

      {params?.error ? (
        <div style={{ marginBottom: 18 }}>
          <Alert>{errorMessages[params.error] ?? errorMessages.invalid}</Alert>
        </div>
      ) : null}

      <LeaveForm leaveTypes={leaveTypes} handovers={handovers} action={submitLeaveAction} />
    </AppShell>
  );
}
