'use client';

import { usePathname,useRouter  } from '@/lib/navigation'; // Import from your navigation config
import { useTransition } from 'react';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const onSelectChange = (locale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-50"
      >
        <DropdownMenuItem 
          onClick={() => onSelectChange('en')}
          className="hover:bg-slate-100 dark:hover:bg-slate-600 focus:bg-slate-100 dark:focus:bg-slate-600 hover:text-slate-900 dark:hover:text-white focus:text-slate-900 dark:focus:text-white"
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onSelectChange('ar')}
          className="hover:bg-slate-100 dark:hover:bg-slate-600 focus:bg-slate-100 dark:focus:bg-slate-600 hover:text-slate-900 dark:hover:text-white focus:text-slate-900 dark:focus:text-white"
        >
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
