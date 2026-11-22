import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;
  const hasError = params?.error === "invalid";

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-mark">R</span>
          <div>
            <div className="brand-name">Ruang Cuti</div>
            <div className="brand-caption">Leave management</div>
          </div>
        </div>
        <div>
          <h1>Cuti tertata, kerja tetap terjaga.</h1>
          <p>Ajukan cuti, cek saldo, dan pantau persetujuan dengan mudah.</p>
        </div>
        <small>Portal manajemen cuti karyawan</small>
      </section>
      <section className="login-card-wrap">
        <form className="login-card" action={loginAction}>
          <div className="eyebrow">Selamat datang</div>
          <h2>Masuk ke akun</h2>
          <p>Gunakan username dan password yang diberikan perusahaan.</p>
          {hasError ? (
            <Alert>Username atau password tidak sesuai.</Alert>
          ) : null}
          <Field
            id="username"
            name="username"
            label="Username"
            autoComplete="username"
            required
          />
          <Field
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button type="submit">Masuk</Button>
          <div className="demo-hint">
            Akun demo tersedia setelah database diisi dengan <code>database/database.sql</code>.
            Password akun demo: <strong>password123</strong>.
          </div>
        </form>
      </section>
    </main>
  );
}
