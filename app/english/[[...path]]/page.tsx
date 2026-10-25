import Link from "next/link";
import { notFound } from "next/navigation";
import { context } from "@/lib/english-mastery/server";
import { Module } from "@/components/english-mastery/Module";
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
          This module requires an enabled environment and an English Mastery
          invitation. Your existing Smart Plan account is used; no new account
          is needed.
        </p>
        <Link href="/login">Sign in with Smart Plan</Link>
        <p className="my-4">
          If already signed in, ask the administrator to check your module
          permissions and staging configuration.
        </p>
      </section>
    );
  }
  return <Module path={path} permissions={permissions} />;
}
