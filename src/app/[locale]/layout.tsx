import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import '@/app/globals.css'
import {baseUrl, SSRfetchAllTasksFromApi} from "@/lib/utils";
import {initialMembers} from "@/data/seed";
import {AppProvider} from "@/context/app-provider";
import {MergeCompletionDate} from "@/lib/completionDateService";

// Add this line to enable ISR with 60-second revalidation
export const revalidate = 60;

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Layout'});

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const messages = await getMessages({locale});





  const tasks = await SSRfetchAllTasksFromApi(); // SSR Fetch tasks from API

  const activeTasks = tasks.filter(t => !t.completed);
  const archivedTasks = tasks
      .filter(t => t.completed)
      .map(t => ({
        ...t,
        completedDate: new Date(),
      }));

    const enrichedArchivedTasks = await MergeCompletionDate(initialMembers,archivedTasks);

    console.log("Enriched Archived Tasks:", enrichedArchivedTasks);


  const members = initialMembers; // or however you get your members

  const adjustments: Record<string, number> = {};

  await Promise.all(
      members.map(async (member) => {
        const res = await fetch(`${baseUrl}/api/score/${member.id}`, {
          method: "GET",
          cache: "default" });
        if (res.ok) {
          const data = await res.json();
          adjustments[member.id] = data.adjustment ?? 0;
        } else {
          adjustments[member.id] = 0;
        }
      })
  );


  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProvider
        initialActiveTasks={activeTasks}
        initialArchivedTasks={enrichedArchivedTasks}
        initialScoreAdjustments={adjustments}
      >
        {children}
      </AppProvider>
    </NextIntlClientProvider>
  );
}
