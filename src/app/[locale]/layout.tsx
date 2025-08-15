import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import '@/app/globals.css'
import {baseUrl} from "@/lib/utils";
import {initialMembers} from "@/data/seed";
import {ConditionalAppProvider} from "@/components/conditional-app-provider";
import {taskCompletionStateService} from "@/lib/services/taskCompletionStateService";
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
      
      // ✅ ENTERPRISE: Fetch all tasks using enhanced service (server-side)
      const allTasksFromService = await getAllTasksService();
      
      // ✅ PRINCIPAL ENGINEER: Apply enterprise-grade completion state processing
      console.log('[Layout] 🚀 Processing task completion state with enterprise service...');
      try {
        const completionStateResult = await taskCompletionStateService.processTaskCompletionState(allTasksFromService);
        
        // ✅ ENTERPRISE ARCHITECTURE: Use processed results from single source of truth
        initialActiveTasks = completionStateResult.activeTasks;
        initialArchivedTasks = completionStateResult.completedTasks.map(task => ({
          ...task,
          completedDate: task.completedAt ? new Date(task.completedAt) : new Date(), // Type-safe conversion
        })) as ArchivedTask[];
        
        // ✅ ENTERPRISE METRICS: Log performance and completion insights
        console.log('[Layout] ✅ Enterprise completion state processing completed:', {
          totalProcessed: completionStateResult.metrics.totalTasks,
          activeTasks: completionStateResult.activeTasks.length,
          completedTasks: completionStateResult.completedTasks.length,
          processingTime: `${completionStateResult.metrics.redisOperationTimeMs.toFixed(2)}ms`,
          periodDistribution: completionStateResult.metrics.periodDistribution,
          errors: completionStateResult.metrics.keyCheckErrors
        });
        
      } catch (error) {
        console.error('[Layout] ❌ Enterprise completion state processing failed:', error);
        
        // ✅ CIRCUIT BREAKER: Fallback to basic task separation with proper error handling
        console.warn('[Layout] 🔄 Falling back to basic task separation...');
        initialActiveTasks = allTasksFromService.filter(task => !task.completed);
        const basicArchivedTasks = allTasksFromService.filter(task => task.completed);
        
        // ✅ TYPE SAFETY: Ensure proper ArchivedTask type conversion with fallback date
        initialArchivedTasks = basicArchivedTasks.map(task => ({
          ...task,
          completedDate: task.completedAt ? new Date(task.completedAt) : new Date(), // Safe fallback
        })) as ArchivedTask[];
        
        console.log('[Layout] ⚠️ Using fallback task separation:', {
          activeTasks: initialActiveTasks.length,
          archivedTasks: initialArchivedTasks.length
        });
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
        totalTasksFromService: allTasksFromService.length,
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
