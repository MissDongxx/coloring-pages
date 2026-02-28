import { redirect } from 'next/navigation';

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect(`/${locale}/activity/ai-tasks`);
}
