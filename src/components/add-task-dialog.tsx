'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Plus, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'; // ✅ Import fetchWithAuth
import { useUserRole } from '@/hooks/useUserRole'; // ✅ NEW: User role detection
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Member, Task } from '@/types';
import { useState } from 'react';

interface AddTaskDialogProps {
  members: Member[];
  onAddTask: (task: Task) => void;
}

export function AddTaskDialog({ members, onAddTask }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useTranslations('AddTaskDialog');
  const { toast } = useToast();
  
  // ✅ NEW: User role detection for admin-only controls
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  const formSchema = z.object({
    name: z.string().min(2, { message: t('validation.taskName') }),
    score: z.coerce.number().min(1, { message: t('validation.score') }),
    assigneeId: z.string({ required_error: t('validation.assignee') }),
    period: z.enum(['daily', 'weekly', 'monthly'], { required_error: t('validation.period') }),
  });

  type AddTaskFormValues = z.infer<typeof formSchema>;
  
  const { register, handleSubmit, control, formState: { errors }, reset, setValue, getValues } = useForm<AddTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      score: 10,
    }
  });

  const onSubmit = async (data: AddTaskFormValues) => {
    // ✅ EARLY WARNING: Check admin role before submission
    if (!roleLoading && !isAdmin) {
      toast({
        title: t('adminAccessRequired'),
        description: t('adminAccessRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
        console.log('Adding task:', data);
        
        // ✅ USE fetchWithAuth for automatic token refresh handling
        const response = await fetchWithAuth('/api/AddTask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                score: data.score,
                assigneeId: data.assigneeId,
                period: data.period,
            }),
            // ✅ Enable automatic token refresh (default: true)
            enableRefresh: true,
            // ✅ Set retry limit for robustness
            maxRetries: 1,
        });

        // ✅ Proper response validation
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const task = await response.json();
        
        // ✅ Validate response has expected task structure
        if (!task || !task.id) {
            throw new Error('Invalid task response from server');
        }
        
        await Promise.resolve(onAddTask(task));
        
        toast({
          title: t('taskAdded'),
          description: t('taskAddedSuccessfully') || 'Task added successfully!',
          variant: 'success',
        });
        
        reset();
        setOpen(false);
        
    } catch (error) {
        console.error("Error adding task:", error);
        
        // ✅ Enhanced error handling with user-friendly messages and admin-only detection
        let userFriendlyMessage = error instanceof Error ? error.message : 'Failed to add task';
        let toastTitle = t('error') || 'Error';
        
        if (userFriendlyMessage.includes('Insufficient privileges') || 
            userFriendlyMessage.includes('Admin role required') ||
            userFriendlyMessage.includes('HTTP 403')) {
          userFriendlyMessage = t('adminAccessRequiredDescription');
          toastTitle = t('adminAccessRequired');
        } else if (userFriendlyMessage.includes('HTTP 401') || userFriendlyMessage.includes('unauthorized')) {
          userFriendlyMessage = 'Please log in to add tasks.';
          toastTitle = 'Authentication Required';
        }
            
        toast({
          title: toastTitle,
          description: userFriendlyMessage,
          variant: 'destructive',
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!roleLoading && !isAdmin} // ✅ Disable for non-admin users
          className={!isAdmin ? 'opacity-50' : ''} // ✅ Visual indicator for disabled state
          title={!isAdmin ? t('adminOnlyTooltip') : undefined} // ✅ Tooltip for explanation
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('addTask')}
          {!isAdmin && <span className="ml-1 text-xs">(Admin Only)</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="font-headline">{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('taskLabel')}</Label>
              <div className="col-span-3">
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="score" className="text-right">{t('scoreLabel')}</Label>
               <div className="col-span-3">
                 <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const score = getValues('score') || 1;
                        setValue('score', Math.max(1, score - 1), { shouldValidate: true });
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input id="score" type="number" {...register("score")} className="w-full text-center" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const score = getValues('score') || 0;
                        setValue('score', score + 1, { shouldValidate: true });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                {errors.score && <p className="text-red-500 text-xs mt-1">{errors.score.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigneeId" className="text-right">{t('assigneeLabel')}</Label>
              <div className="col-span-3">
                <Controller
                  name="assigneeId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPersonPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.assigneeId && <p className="text-red-500 text-xs mt-1">{errors.assigneeId.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="period" className="text-right">{t('frequencyLabel')}</Label>
              <div className="col-span-3">
                 <Controller
                  name="period"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectPeriodPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t('daily')}</SelectItem>
                        <SelectItem value="weekly">{t('weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.period && <p className="text-red-500 text-xs mt-1">{errors.period.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && (
                <svg className="animate-spin mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
