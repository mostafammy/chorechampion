import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import '@/app/globals.css'
import {baseUrl} from "@/lib/utils";
import {initialMembers} from "@/data/seed";
import {ConditionalAppProvider} from "@/components/conditional-app-provider";
import {MergeCompletionDate} from "@/lib/completionDateService";
import getAllTasksService from "@/lib/getAllTasksService";
import {getScoreSummary} from "@/lib/scoreService";
import {cookies} from "next/headers";
import {fetchWithAuthAdvanced} from "@/lib/auth/fetchWithAuth";
import {ArchivedTask, Task} from "@/types";
import { headers } from 'next/headers';

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

  console.log('[Layout] Initializing with locale:', locale);

  // Always provide initial data - ConditionalAppProvider will decide when to use it
  let initialActiveTasks: Task[] = [];
  let initialArchivedTasks: ArchivedTask[] = [];
  let initialScoreAdjustments: Record<string, number> = {};

  try {
    // Fetch initial data for server-side rendering
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      console.log('[Layout] ✅ Access token found - fetching server-side data');
      
      // Fetch all tasks
      const allTasks = await getAllTasksService();
      
      // Separate active and archived tasks
      initialActiveTasks = allTasks.filter(task => !task.completed);
      initialArchivedTasks = allTasks.filter(task => task.completed) as ArchivedTask[];
      
      // For now, use empty score adjustments (can be enhanced later)
      initialScoreAdjustments = {};

      console.log('[Layout] ✅ Server-side data fetched successfully', {
        totalTasks: allTasks.length,
        activeTasks: initialActiveTasks.length,
        archivedTasks: initialArchivedTasks.length,
      });
    } else {
      console.log('[Layout] ⚠️ No access token - client will handle data fetching');
    }
  } catch (error) {
    console.error('[Layout] ❌ Error fetching server-side data:', error);
    // Continue with empty data - client will handle fetching
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConditionalAppProvider
        initialActiveTasks={initialActiveTasks}
        initialArchivedTasks={initialArchivedTasks}
        initialScoreAdjustments={initialScoreAdjustments}
      >
        {children}
      </ConditionalAppProvider>
    </NextIntlClientProvider>
  );
}
