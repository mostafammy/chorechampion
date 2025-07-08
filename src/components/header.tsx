'use client';

// import {  } from 'next-intl/navigation';
import { Link,usePathname } from '@/lib/navigation'; // Import from your navigation config
import { Archive, Home, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';

export function Header() {
  const t = useTranslations('Header');
  console.log('typeof usePathname:', typeof usePathname);
  const pathname = usePathname(); 
  const isArchivePage = pathname.includes('/archive');

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between p-4 ">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-headline text-foreground no-underline">
            {t('title')}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant={!isArchivePage ? 'secondary' : 'ghost'} asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t('dashboard')}
            </Link>
          </Button>
          <Button variant={isArchivePage ? 'secondary' : 'ghost'} asChild>
            <Link href="/archive">
              <Archive className="mr-2 h-4 w-4" />
              {t('archive')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
