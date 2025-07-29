'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUserRole } from '@/hooks/useUserRole'; // ✅ NEW: User role detection
import { useToast } from '@/hooks/use-toast'; // ✅ NEW: Toast notifications

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
  
  // ✅ NEW: Handler for admin-only score adjustments
  const handleScoreAdjustment = (amount: number) => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: 'Admin Access Required',
        description: 'Only administrators can adjust scores. Please contact an admin to modify scores.',
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
    <Card className="bg-muted/50">
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('totalPoints')}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-8 w-8 shrink-0 rounded-full ${!isAdmin ? 'opacity-50' : ''}`} // ✅ Visual indicator for disabled state
              onClick={() => handleScoreAdjustment(-5)}
              disabled={!roleLoading && (!isAdmin || totalScore <= 0)} // ✅ Disable for non-admin users or zero score
              title={!isAdmin ? 'Only administrators can adjust scores' : undefined} // ✅ Tooltip for explanation
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Decrease score by 5</span>
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold font-headline text-primary min-w-[4ch] text-center">
                {totalScore}
              </span>
              {!isAdmin && (
                <span className="text-xs text-muted-foreground">(Admin Only)</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-8 w-8 shrink-0 rounded-full ${!isAdmin ? 'opacity-50' : ''}`} // ✅ Visual indicator for disabled state
              onClick={() => handleScoreAdjustment(5)}
              disabled={!roleLoading && !isAdmin} // ✅ Disable for non-admin users
              title={!isAdmin ? 'Only administrators can adjust scores' : undefined} // ✅ Tooltip for explanation
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Increase score by 5</span>
            </Button>
          </div>
        </div>
        <div>
          <Progress value={completionPercentage} className="w-full h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{t('taskProgress')}</span>
            <span>{completionPercentage.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
