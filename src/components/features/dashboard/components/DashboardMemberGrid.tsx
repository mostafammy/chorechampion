/**
 * ✅ ENTERPRISE DASHBOARD MEMBER GRID COMPONENT
 * 
 * Member grid component following single responsibility principle.
 * Handles only member card display and grid layout.
 * 
 * @module DashboardMemberGrid
 * @version 1.0.0
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemberCardGradients } from '../hooks/useMemberCardGradients';
import { DashboardMemberCard } from '../index';
import type { DashboardMemberGridProps } from '../types';

/**
 * ✅ ENTERPRISE DASHBOARD MEMBER GRID
 * 
 * Single responsibility: Display member cards in responsive grid layout.
 * Delegates member card logic to DashboardMemberCard component.
 * 
 * @param props Member grid properties
 * @returns Member grid component
 */
export const DashboardMemberGrid = memo<DashboardMemberGridProps>(({ 
  memberData, 
  onToggleTask, 
  onAdjustScore, 
  isLoading = false, 
  className 
}) => {
  const t = useTranslations('Dashboard');
  const { getGradient } = useMemberCardGradients();

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-4 w-24 mx-auto mb-2" />
              <Skeleton className="h-2 w-full mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (!memberData || memberData.length === 0) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('familyMembers') || 'Family Members'}
            </h2>
          </div>
        </div>
        
        <Card className="p-12 text-center">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noMembersYet') || 'No family members yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('addMembersToStart') || 'Add family members to start tracking tasks and achievements'}
          </p>
          <Button variant="default" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            {t('addMember') || 'Add Member'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* ✅ SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('familyMembers') || 'Family Members'}
          </h2>
          <span className="text-sm text-gray-500">
            ({memberData.length})
          </span>
        </div>
        
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          {t('addMember') || 'Add Member'}
        </Button>
      </div>

      {/* ✅ MEMBER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {memberData.map((member, index) => {
          const gradient = getGradient(index);
          
          return (
            <DashboardMemberCard
              key={member.id}
              member={member}
              gradient={gradient}
              onToggleTask={onToggleTask}
              onAdjustScore={onAdjustScore}
            />
          );
        })}
      </div>

      {/* ✅ GRID INSIGHTS */}
      {memberData.length > 0 && (
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {memberData.length === 1 
              ? (t('singleMemberMessage') || 'Add more family members to create friendly competition!')
              : memberData.length < 4
              ? (t('fewMembersMessage') || 'Great start! Consider adding more family members.')
              : (t('fullFamilyMessage') || 'What a wonderful family! Keep up the great teamwork.')
            }
          </div>
        </Card>
      )}
    </div>
  );
});

DashboardMemberGrid.displayName = 'DashboardMemberGrid';
