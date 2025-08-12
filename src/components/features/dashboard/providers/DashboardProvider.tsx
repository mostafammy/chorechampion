/**
 * ✅ ENTERPRISE DASHBOARD PROVIDER
 * 
 * Context provider for dashboard domain state management.
 * Implements dependency injection and state isolation.
 * 
 * @module DashboardProvider
 * @version 1.0.0
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import type { DashboardContextValue, DashboardMemberData, DashboardStats } from '../types';

// ✅ CONTEXT DEFINITION
const DashboardContext = createContext<DashboardContextValue | null>(null);

// ✅ STATE MANAGEMENT: Dashboard state interface
interface DashboardState {
  memberData: DashboardMemberData[];
  stats: DashboardStats;
  isLoading: boolean;
  error: Error | null;
}

// ✅ STATE MANAGEMENT: Dashboard actions
type DashboardAction =
  | { type: 'SET_MEMBER_DATA'; payload: DashboardMemberData[] }
  | { type: 'SET_STATS'; payload: DashboardStats }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: { memberData: DashboardMemberData[]; stats: DashboardStats } }
  | { type: 'REFRESH_ERROR'; payload: Error };

// ✅ REDUCER: Pure state transitions
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_MEMBER_DATA':
      return { ...state, memberData: action.payload };
    
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'REFRESH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        memberData: action.payload.memberData,
        stats: action.payload.stats,
        isLoading: false,
        error: null
      };
    
    case 'REFRESH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    
    default:
      return state;
  }
}

// ✅ INITIAL STATE
const initialState: DashboardState = {
  memberData: [],
  stats: {
    totalMembers: 0,
    totalActiveTasks: 0,
    totalCompletedTasks: 0,
    totalPoints: 0,
    averageCompletion: 0,
    topPerformer: null
  },
  isLoading: false,
  error: null
};

// ✅ PROVIDER PROPS
interface DashboardProviderProps {
  children: React.ReactNode;
  /** Optional initial state override */
  initialData?: Partial<DashboardState>;
}

/**
 * ✅ ENTERPRISE PROVIDER: Dashboard Context
 * 
 * Provides dashboard state management through React context.
 * Implements proper state isolation and dependency injection.
 * 
 * @param props Provider properties
 * @returns Provider component
 */
export function DashboardProvider({ children, initialData }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, {
    ...initialState,
    ...initialData
  });

  // ✅ ACTIONS: Memoized action creators
  const actions = useMemo(() => ({
    updateMemberData: (data: DashboardMemberData[]) => {
      dispatch({ type: 'SET_MEMBER_DATA', payload: data });
    },
    
    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },
    
    setError: (error: Error | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    
    refresh: async () => {
      dispatch({ type: 'REFRESH_START' });
      try {
        // This would typically fetch fresh data from API
        // For now, we'll simulate the refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In real implementation, you'd fetch new data here
        dispatch({ 
          type: 'REFRESH_SUCCESS', 
          payload: { 
            memberData: state.memberData, 
            stats: state.stats 
          } 
        });
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Refresh failed');
        dispatch({ type: 'REFRESH_ERROR', payload: errorObj });
      }
    }
  }), [state.memberData, state.stats]);

  // ✅ PERFORMANCE: Memoized context value
  const contextValue = useMemo<DashboardContextValue>(() => ({
    state,
    actions
  }), [state, actions]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

/**
 * ✅ ENTERPRISE HOOK: Dashboard Context Consumer
 * 
 * Type-safe hook for consuming dashboard context.
 * Provides proper error handling for missing provider.
 * 
 * @returns Dashboard context value
 * @throws Error if used outside DashboardProvider
 */
export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext);
  
  if (!context) {
    throw new Error(
      'useDashboardContext must be used within a DashboardProvider. ' +
      'Please wrap your component with <DashboardProvider>.'
    );
  }
  
  return context;
}
