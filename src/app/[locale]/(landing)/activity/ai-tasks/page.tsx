import { getTranslations } from 'next-intl/server';

import { AITaskStatus } from '@/extensions/ai';
import { AudioPlayer, Empty, LazyImage } from '@/shared/blocks/common';
import { TableCard } from '@/shared/blocks/table';
import { AITask, getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { getColoringPages } from '@/shared/models/coloring_page';
import { getUserInfo } from '@/shared/models/user';
import { Button } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';
import { Link } from '@/core/i18n/navigation';
import { generateSlug } from '@/shared/lib/coloring-helper';

export default async function AiTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('activity.ai-tasks');

  const aiTasks = await getAITasks({
    userId: user.id,
    mediaType: type,
    page,
    limit,
  });

  const total = await getAITasksCount({
    userId: user.id,
    mediaType: type,
  });

  // Fetch all coloring pages for this user to create a slug-based lookup map
  // Note: We use slug because AI task imageUrl differs from coloring page imageUrl (R2 upload)
  const coloringPages = await getColoringPages({
    userId: user.id,
    limit: 1000,
  });

  // Create a map of prompt slug to coloring page for quick lookup
  const coloringPageBySlug = new Map(
    coloringPages.map((page) => [page.slug, page])
  );

  const table: Table = {
    title: t('list.title'),
    columns: [
      { name: 'prompt', title: t('fields.prompt'), type: 'copy' },
      { name: 'mediaType', title: t('fields.media_type'), type: 'label' },
      { name: 'provider', title: t('fields.provider'), type: 'label' },
      { name: 'model', title: t('fields.model'), type: 'label' },
      // { name: 'options', title: t('fields.options'), type: 'copy' },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'costCredits', title: t('fields.cost_credits'), type: 'label' },
      {
        name: 'result',
        title: t('fields.result'),
        callback: (item: AITask) => {
          if (item.taskInfo) {
            const taskInfo = JSON.parse(item.taskInfo);
            if (taskInfo.errorMessage) {
              return (
                <div className="text-red-500">
                  Failed: {taskInfo.errorMessage}
                </div>
              );
            } else if (taskInfo.songs && taskInfo.songs.length > 0) {
              const songs: any[] = taskInfo.songs.filter(
                (song: any) => song.audioUrl
              );
              if (songs.length > 0) {
                return (
                  <div className="flex flex-col gap-2">
                    {songs.map((song: any) => (
                      <AudioPlayer
                        key={song.id}
                        src={song.audioUrl}
                        title={song.title}
                        className="w-80"
                      />
                    ))}
                  </div>
                );
              }
            } else if (taskInfo.images && taskInfo.images.length > 0) {
              return (
                <div className="flex flex-col gap-2">
                  {taskInfo.images.map((image: any, index: number) => {
                    const imageUrl = image.imageUrl || image.url || image;
                    // Try to find coloring page by generating slug from prompt
                    const slug = item.prompt ? generateSlug(item.prompt) : null;
                    const matchingPage = slug ? coloringPageBySlug.get(slug) : null;

                    if (matchingPage) {
                      return (
                        <Link
                          key={index}
                          href={`/coloring/generated/${matchingPage.id}`}
                          className="block cursor-pointer"
                        >
                          <LazyImage
                            src={matchingPage.imageUrl}
                            alt="Generated image"
                            className="h-32 w-auto hover:opacity-80 transition-opacity"
                          />
                        </Link>
                      );
                    }

                    return (
                      <LazyImage
                        key={index}
                        src={imageUrl}
                        alt="Generated image"
                        className="h-32 w-auto"
                      />
                    );
                  })}
                </div>
              );
            } else {
              return '-';
            }
          }

          return '-';
        },
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'action',
        title: t('fields.action'),
        type: 'dropdown',
        callback: (item: AITask) => {
          const items: Button[] = [];

          if (
            item.status === AITaskStatus.PENDING ||
            item.status === AITaskStatus.PROCESSING
          ) {
            items.push({
              title: t('list.buttons.refresh'),
              url: `/activity/ai-tasks/${item.id}/refresh`,
              icon: 'RiRefreshLine',
            });
          }

          return items;
        },
      },
    ],
    data: aiTasks,
    emptyMessage: t('list.empty_message'),
    pagination: {
      total,
      page,
      limit,
    },
  };

  return (
    <div className="space-y-8">
      <TableCard title={t('list.title')} table={table} />
    </div>
  );
}
