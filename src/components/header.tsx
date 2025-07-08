'use client';

// import {  } from 'next-intl/navigation';
import { Link,usePathname } from '@/lib/navigation'; // Import from your navigation config
import { Archive, Home, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import LoadingSpinner from './loading-spinner';

export function Header() {
  const t = useTranslations('Header');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  console.log('typeof usePathname:', typeof usePathname);
  const pathname = usePathname(); 
  const isArchivePage = pathname.includes('/archive');

  // Hide loading spinner after navigation
  useEffect(() => {
    if (!loading) return;
    const handleComplete = () => setLoading(false);
    window.addEventListener('nextjs-route-change-complete', handleComplete);
    window.addEventListener('nextjs-route-change-error', handleComplete);
    return () => {
      window.removeEventListener('nextjs-route-change-complete', handleComplete);
      window.removeEventListener('nextjs-route-change-error', handleComplete);
    };
  }, [loading]);

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      {loading && <LoadingSpinner />}
      <div className="container mx-auto flex items-center justify-between p-4 ">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-headline text-foreground no-underline">
            {t('title')}
          </span>
        </Link>
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
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
        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-80 max-w-full">
              {/* Visually hidden title for accessibility */}
              <SheetTitle className="sr-only">{t('title')}</SheetTitle>
              <div className="flex flex-col h-full p-6 gap-4">
                {/* Remove custom close icon, keep only logo */}
                <div className="flex flex-col items-center mb-6 mt-10">
                  <Link href="/" className="flex items-center gap-2" onClick={() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur()}>
                    <Trophy className="h-10 w-10 text-primary" />
                    <span className="text-3xl font-bold font-headline text-foreground">
                      {t('title')}
                    </span>
                  </Link>
                </div>
                {/* Nav links with fade-out on click */}
                <Button variant={!isArchivePage ? 'secondary' : 'ghost'} className="justify-start w-full" onClick={async (e) => {
                  e.preventDefault();
                  setOpen(false);
                  setTimeout(() => {
                    setLoading(true);
                    router.push('/');
                  }, 350);
                }}>
                  <Home className="mr-2 h-4 w-4" />
                  {t('dashboard')}
                </Button>
                <Button variant={isArchivePage ? 'secondary' : 'ghost'} className="justify-start w-full" onClick={async (e) => {
                  e.preventDefault();
                  setOpen(false);
                  setTimeout(() => {
                    setLoading(true);
                    router.push('/archive');
                  }, 350);
                }}>
                  <Archive className="mr-2 h-4 w-4" />
                  {t('archive')}
                </Button>
                <div className="flex gap-2 mt-4">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
