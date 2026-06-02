import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'ระบบช่วยจัดทำแผนการจัดการเรียนรู้กึ่งอัตโนมัติ (Enterprise Edition)',
  description: 'สร้างแผนการเรียนรู้อย่างรวดเร็วด้วยระบบกรอกข้อมูลอัตโนมัติและผู้ช่วย AI อัจฉริยะ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <header className="app-header">
          <div className="app-header-brand">
            <div className="logo">📝</div>
            <div>
              <h1>ระบบช่วยจัดทำแผนการจัดการเรียนรู้</h1>
              <p>Lesson Plan AutoFill System v2.8.5 — Next.js Edition</p>
            </div>
          </div>
          <div className="app-header-right">
            <div className="status-dot ok"></div>
            <span style={{ fontSize: '12.5px', color: '#fff', fontWeight: 500 }}>
              ระบบออนไลน์ (Supabase Connected)
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
