'use client';

import { usePathname } from 'next/navigation';
import { AppProvider } from '@/context/app-provider';
import type { ArchivedTask, Task } from '@/types';
import type { ReactNode } from 'react';

interface ConditionalAppProviderProps {
  children: ReactNode;
  initialActiveTasks?: Task[];
  initialArchivedTasks?: ArchivedTask[];
  initialScoreAdjustments?: Record<string, number>;
  initialUserRole?: 'ADMIN' | 'USER' | null; // ✅ ADD: Initial user role
  initialIsAdmin?: boolean; // ✅ ADD: Initial admin status
}

// Define public routes that don't need AppProvider authentication
const publicRoutes = ['/login', '/signup', '/test-auth', '/phase2-test', '/test', '/simple-login', '/test-today', '/debug-archive', '/diagnostic-task-completion'];

export function ConditionalAppProvider({ 
  children, 
  initialActiveTasks = [], 
  initialArchivedTasks = [], 
  initialScoreAdjustments = {},
  initialUserRole = null, // ✅ ADD: Default to null
  initialIsAdmin = false, // ✅ ADD: Default to false
}: ConditionalAppProviderProps) {
  const pathname = usePathname();
  
  // Remove locale prefix to get the actual route path
  const routePath = pathname.replace(/^\/(en|ar)/, '') || '/';
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => 
    routePath === route || routePath.startsWith(route + '/')
  );

  console.log('[ConditionalAppProvider] Current path:', pathname);
  console.log('[ConditionalAppProvider] Route path:', routePath);
  console.log('[ConditionalAppProvider] Is public route:', isPublicRoute);

  // SMART FIX: Only bypass AppProvider for login/signup pages
  if (isPublicRoute) {
    console.log('[ConditionalAppProvider] ✅ Public route detected - bypassing AppProvider');
    console.log('[ConditionalAppProvider] This prevents authentication blocking on login/signup');
    return <>{children}</>;
  }

  // For authenticated pages, provide AppProvider with context
  console.log('[ConditionalAppProvider] ✅ Authenticated route - providing AppProvider');
  console.log('[ConditionalAppProvider] This allows useAppContext to work on dashboard/app pages');
  
  return (
    <AppProvider 
      initialActiveTasks={initialActiveTasks}
      initialArchivedTasks={initialArchivedTasks}
      initialScoreAdjustments={initialScoreAdjustments}
      initialUserRole={initialUserRole} // ✅ ADD: Pass user role
      initialIsAdmin={initialIsAdmin}   // ✅ ADD: Pass admin status
    >
      {children}
    </AppProvider>
  );
}
