import { redirect } from 'next/navigation';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Use native Next.js redirect in Server Component to avoid production errors
  redirect(`/${locale}/admin/users`);
}
