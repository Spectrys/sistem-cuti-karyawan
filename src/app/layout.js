import "./globals.css";

export const metadata = {
  title: "Ruang Cuti | Manajemen Cuti Karyawan",
  description: "Ajukan dan kelola cuti karyawan dalam satu tempat.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
