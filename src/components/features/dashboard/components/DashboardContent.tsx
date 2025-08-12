/**
 * ✅ ENTERPRISE DASHBOARD CONTENT COMPONENT
 * 
 * Single Responsibility: Member cards display and management
 * Type-safe, performance optimized with member card composition
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { DashboardMemberCard } from '../index';
import { useMemberCardGradients } from '../hooks/useMemberCardGradients';
import type { DashboardContentProps } from '../types';

/**
 * ✅ ENTERPRISE COMPONENT: Dashboard Content
 * 
 * Performance: Memoized with AnimatePresence for smooth transitions
 * Type Safety: Fully typed props with readonly member data
 * Accessibility: Proper grid layout with responsive design
 * 
 * @param props - Type-safe dashboard content props
 */
export const DashboardContent = memo<DashboardContentProps>(({ 
  memberData, 
  onToggleTask,
  onAdjustScore,
  isLoading = false 
}) => {
  const t = useTranslations('Dashboard');
  const { getGradient } = useMemberCardGradients();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ✅ PERFORMANCE: Loading skeleton with proper grid layout */}
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="h-64 bg-muted/20 rounded-lg animate-pulse"
            aria-label={t('loading.memberCard')}
          />
        ))}
      </div>
    );
  }

  if (memberData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('noMembers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">
        {t('familyMembers')}
      </h2>
      
      {/* ✅ ENTERPRISE: Responsive member grid with animations */}
      <AnimatePresence mode="wait">
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {memberData.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
            >
              <DashboardMemberCard 
                member={member} 
                gradient={getGradient(index)}
                onToggleTask={onToggleTask}
                onAdjustScore={onAdjustScore}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

DashboardContent.displayName = 'DashboardContent';
