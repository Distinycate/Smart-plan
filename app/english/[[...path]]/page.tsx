import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { context } from "@/lib/english-mastery/server";
import { Module } from "@/components/english-mastery/Module";
export const metadata: Metadata = { title: "ฝึกภาษาอังกฤษ | English Mastery", description: "ฝึกภาษาอังกฤษ A1–C2 ด้วยคำแนะนำไทยและอังกฤษ เรียนทีละขั้นและกลับมาฝึกต่อได้" };
export const dynamic = "force-dynamic";
export default async function EnglishPage(props: {
  params: Promise<{ path?: string[] }>;
}) {
  const params = await props.params;
  const path = params.path || [];
  if (
    path.length > 3 ||
    ![
      "",
      "units",
      "sessions",
      "practice",
      "review",
      "assessments",
      "writing",
      "speaking",
      "mediation",
      "interaction",
      "progress",
      "exam",
      "author",
      "reviewer",
      "admin",
    ].includes(path[0] || "")
  )
    notFound();
  let permissions: string[] = [];
  try {
    const { actor } = await context();
    permissions = actor.grants.map((g) => g.permission);
  } catch {
    return (
      <section className="mx-auto max-w-3xl p-8">
        <h2 className="text-2xl font-bold">English Mastery Hub</h2>
        <p className="my-4">
          พื้นที่ฝึกนี้ใช้บัญชี Smart Plan เดิมของคุณ หากยังเข้าไม่ได้ ให้ผู้ดูแลเปิดสิทธิ์การเรียนก่อน
          / Use your Smart Plan account. An English Mastery invitation is required.
        </p>
        <Link href="/login">เข้าสู่ระบบเพื่อเริ่มฝึก / Sign in with Smart Plan</Link>
        <p className="my-4">
          หากเข้าสู่ระบบแล้วแต่ยังพบหน้านี้ กรุณาติดต่อผู้ดูแลเพื่อตรวจสิทธิ์
          / Already signed in? Ask the administrator to check your access.
        </p>
      </section>
    );
  }
  return <Module path={path} permissions={permissions} />;
}
