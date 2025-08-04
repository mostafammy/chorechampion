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
  let initialUserRole: 'ADMIN' | 'USER' | null = null; // ✅ ADD: User role
  let initialIsAdmin: boolean = false; // ✅ ADD: Admin status

  try {
    // Fetch initial data for server-side rendering
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (accessToken) {
      console.log('[Layout] ✅ Access token found - fetching server-side data');
      
      // ✅ NEW: Decode user role from JWT token server-side
      try {
        const jwtPayload = JSON.parse(
          Buffer.from(accessToken.split('.')[1], 'base64').toString()
        );
        
        initialUserRole = jwtPayload.role || null;
        initialIsAdmin = initialUserRole === 'ADMIN';
        
        console.log('[Layout] ✅ User role decoded from JWT:', {
          role: initialUserRole,
          isAdmin: initialIsAdmin,
          userId: jwtPayload.id
        });
      } catch (jwtError) {
        console.warn('[Layout] ⚠️ Failed to decode JWT for user role:', jwtError);
        // Continue without role info - will be handled client-side as fallback
      }
      
      // Fetch all tasks using the service directly (server-side)
      const allTasks = await getAllTasksService();
      
      // Separate active and archived tasks
      initialActiveTasks = allTasks.filter(task => !task.completed);
      const rawArchivedTasks = allTasks.filter(task => task.completed) as ArchivedTask[];
      
      // ✅ PRINCIPAL ENGINEER: Apply real completion dates from Redis logs
      console.log('[Layout] 🕐 Enriching archived tasks with real completion dates...');
      try {
        initialArchivedTasks = await MergeCompletionDate(initialMembers, rawArchivedTasks);
        console.log('[Layout] ✅ Real completion dates applied successfully');
      } catch (error) {
        console.error('[Layout] ❌ Failed to merge completion dates:', error);
        // Fallback to raw archived tasks without completion date enrichment
        initialArchivedTasks = rawArchivedTasks;
      }
      
      // ✅ NEW: Fetch score adjustments (not total scores) for all members server-side
      console.log('[Layout] ✅ Fetching score adjustments for all members server-side...');
      
      try {
        const scorePromises = initialMembers.map(async (member) => {
          try {
            console.log(`[Layout] Fetching score adjustments for ${member.name} (${member.id})`);
            const scoreData = await getScoreSummary(member.id);
            
            if (scoreData && typeof scoreData.adjustment === 'number') {
              console.log(`[Layout] ✅ Score adjustments for ${member.name}: ${scoreData.adjustment}`);
              return {
                memberId: member.id,
                adjustmentScore: scoreData.adjustment  // Only the manual adjustments, not total
              };
            } else {
              console.warn(`[Layout] ⚠️ Invalid score adjustment data for ${member.name}:`, scoreData);
              return {
                memberId: member.id,
                adjustmentScore: 0
              };
            }
          } catch (error) {
            console.error(`[Layout] ❌ Error fetching score adjustments for ${member.name}:`, error);
            return {
              memberId: member.id,
              adjustmentScore: 0
            };
          }
        });

        const scores = await Promise.all(scorePromises);
        
        // Build initial score adjustments from real backend adjustment data (not total scores)
        scores.forEach(({ memberId, adjustmentScore }) => {
          initialScoreAdjustments[memberId] = adjustmentScore;
        });
        
        console.log('[Layout] ✅ Server-side score adjustments fetched:', initialScoreAdjustments);
        
      } catch (error) {
        console.error('[Layout] ❌ Error fetching score adjustments server-side:', error);
        // Continue with empty adjustments - client will handle fetching if needed
      }

      console.log('[Layout] ✅ Server-side data fetched successfully', {
        totalTasks: allTasks.length,
        activeTasks: initialActiveTasks.length,
        archivedTasks: initialArchivedTasks.length,
        scoreAdjustmentsLoaded: Object.keys(initialScoreAdjustments).length,
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
        initialUserRole={initialUserRole} // ✅ ADD: Pass user role
        initialIsAdmin={initialIsAdmin}   // ✅ ADD: Pass admin status
      >
        {children}
      </ConditionalAppProvider>
    </NextIntlClientProvider>
  );
}
