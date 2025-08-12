/**
 * ✅ ENTERPRISE DASHBOARD - MIGRATION WRAPPER
 * 
 * Drop-in replacement for original Dashboard component.
 * Maintains backward compatibility while using new enterprise architecture.
 * 
 * @module EnterpriseDashboard
 * @version 1.0.0
 */

'use client';

import { DashboardProvider } from './providers/DashboardProvider';
import { Dashboard } from './components/Dashboard';
import type { DashboardProps } from './types';

/**
 * ✅ ENTERPRISE DASHBOARD WRAPPER
 * 
 * Provides the new Dashboard with necessary context providers.
 * Can be used as a direct replacement for the original Dashboard component.
 * 
 * @param props Dashboard properties
 * @returns Enterprise dashboard with providers
 */
export function EnterpriseDashboard(props: DashboardProps) {
  return (
    <DashboardProvider>
      <Dashboard {...props} />
    </DashboardProvider>
  );
}

// ✅ BACKWARD COMPATIBILITY: Default export
export default EnterpriseDashboard;
