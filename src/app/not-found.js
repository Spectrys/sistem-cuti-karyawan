import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-error">
      <div className="eyebrow">404</div>
      <h1>Halaman tidak ditemukan</h1>
      <p>Halaman yang Anda cari tidak tersedia.</p>
      <Link className="button" href="/">Kembali ke dashboard</Link>
    </main>
  );
}
