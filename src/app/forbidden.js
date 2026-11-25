import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="route-error">
      <div className="eyebrow">403</div>
      <h1>Akses ditolak</h1>
      <p>Akun Anda tidak memiliki izin untuk membuka halaman ini.</p>
      <Link className="button" href="/">Kembali ke dashboard</Link>
    </main>
  );
}
