'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserRole } from '@/hooks/useUserRole'; // ✅ NEW: User role detection
import { useToast } from '@/hooks/use-toast'; // ✅ NEW: Toast notifications
// ✅ PRINCIPAL ENGINEER: Import enterprise design system
import { usePerformanceTheme, useAdminAwareTheme } from '@/lib/design-system/theme-utils';

interface PerformanceSummaryProps {
  completedScore: number;
  totalPossibleScore: number;
  memberId: string;
  adjustment: number;
  onAdjustScore: (memberId: string, amount: number) => void;
}

export function PerformanceSummary({
  completedScore,
  totalPossibleScore,
  memberId,
  adjustment,
  onAdjustScore,
}: PerformanceSummaryProps) {
  const t = useTranslations('PerformanceSummary');
  const { toast } = useToast();
  
  // ✅ NEW: User role detection for admin-only controls
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  // ✅ PRINCIPAL ENGINEER: Enterprise design system integration
  const performanceTheme = usePerformanceTheme();
  const adminTheme = useAdminAwareTheme(isAdmin, roleLoading);
  
  // ✅ NEW: Handler for admin-only score adjustments
  const handleScoreAdjustment = (amount: number) => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: t('adminAccessRequired'),
        description: t('adminAccessRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }
    onAdjustScore(memberId, amount);
  };
  
  const { totalScore, completionPercentage } = useMemo(() => {
    const currentTotalScore = completedScore + adjustment;
    const percentage =
      totalPossibleScore > 0
        ? (currentTotalScore / totalPossibleScore) * 100
        : 0;

    return { totalScore: currentTotalScore, completionPercentage: Math.max(0, percentage) };
  }, [completedScore, totalPossibleScore, adjustment]);

  return (
    <Card className={performanceTheme.card}>
      <CardContent className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${performanceTheme.progress.text}`}>
            {t('totalPoints')}
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-9 w-9 shrink-0 ${
                totalScore <= 0 
                  ? adminTheme.getAdminStyle(performanceTheme.button.destructive)
                  : adminTheme.getAdminStyle(performanceTheme.button.primary)
              }`}
              onClick={() => handleScoreAdjustment(-5)}
              disabled={!roleLoading && (!isAdmin || totalScore <= 0)}
              title={!isAdmin ? t('adminOnlyTooltip') : undefined}
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Decrease score by 5</span>
            </Button>
            <div className={`flex flex-col items-center ${performanceTheme.score.display}`}>
              <span className={`text-3xl font-bold font-headline min-w-[4ch] text-center ${performanceTheme.score.primary}`}>
                {totalScore}
              </span>
              {!isAdmin && (
                <span className={`text-xs ${performanceTheme.progress.text}`}>
                  ({t('adminOnly')})
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-9 w-9 shrink-0 ${adminTheme.getAdminStyle(performanceTheme.button.primary)}`}
              onClick={() => handleScoreAdjustment(5)}
              disabled={!roleLoading && !isAdmin}
              title={!isAdmin ? t('adminOnlyTooltip') : undefined}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Increase score by 5</span>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Progress 
            value={completionPercentage} 
            className={`w-full h-3 ${performanceTheme.progress.background}`}
            style={{
              '--progress-background': performanceTheme.progress.background,
              '--progress-foreground': performanceTheme.progress.fill,
            } as React.CSSProperties}
          />
          <div className={`flex justify-between text-xs ${performanceTheme.progress.text}`}>
            <span className="font-medium">{t('taskProgress')}</span>
            <span className={`font-bold ${performanceTheme.score.accent}`}>
              {completionPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
