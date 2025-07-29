'use client';

// import {  } from 'next-intl/navigation';
import { Link,usePathname } from '@/lib/navigation'; // Import from your navigation config
import { Archive, Home, Trophy, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import LoadingSpinner from './loading-spinner';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';


export function Header() {
  const router = useRouter();
  const { toast } = useToast();

  const t = useTranslations('Header');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  console.log('typeof usePathname:', typeof usePathname);
  const pathname = usePathname(); 
  const isArchivePage = pathname.includes('/archive');

  // ✅ ENTERPRISE: Logout function with proper error handling and fetchWithAuth
  const handleLogout = async (isMobile: boolean = false) => {
    try {
      setLogoutLoading(true);
      
      // Show immediate feedback to user
      toast({
        title: 'Logging out...',
        description: 'Please wait while we log you out securely.',
        variant: 'default',
      });

      // Close mobile sheet if applicable
      if (isMobile) {
        setOpen(false);
      }

      // Use enterprise fetchWithAuth with proper configuration
      const response = await fetchWithAuth('/api/auth/logout', {
        method: 'POST',
        correlationId: `logout-${Date.now()}`,
        enableRefresh: false, // Disable refresh for logout calls
        throwOnSessionExpiry: false, // Don't throw on 401 during logout
        onSessionExpired: () => {
          // Custom handler for logout-specific session expiry
          console.log('[Header] Session already expired during logout - proceeding with redirect');
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Success feedback
      toast({
        title: 'Logged out successfully',
        description: 'You have been securely logged out. Redirecting to login...',
        variant: 'success',
      });

      // Add small delay for better UX before redirect
      setTimeout(() => {
        setLoading(true);
        router.push('/login?message=logged-out');
      }, 1000);

    } catch (error) {
      console.error('[Header] Logout error:', error);
      
      // Error feedback with fallback action
      toast({
        title: 'Logout Error',
        description: 'Logout encountered an issue, but you will be redirected to login for security.',
        variant: 'destructive',
      });

      // Even on error, redirect to login for security
      setTimeout(() => {
        setLoading(true);
        router.push('/login?message=logout-error');
      }, 1500);

    } finally {
      setLogoutLoading(false);
    }
  };

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
      {(loading || logoutLoading) && <LoadingSpinner />}
      <div className="container mx-auto flex items-center justify-between p-4 ">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-headline text-foreground no-underline">
            {t('title')}
          </span>
        </Link>
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Button variant={!isArchivePage ? 'secondary' : 'ghost'} asChild onClick={async (e)=>{
            e.preventDefault();
            setLoading(true);
            router.push('/');
          }}>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t('dashboard')}
            </Link>
          </Button>
          <Button variant={isArchivePage ? 'secondary' : 'ghost'} asChild onClick={async (e)=>{
            e.preventDefault();
            setLoading(true);
            router.push('/archive');
          }}>
            <Link href="/archive">
              <Archive className="mr-2 h-4 w-4" />
              {t('archive')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <ThemeToggle />
          {/* ✅ DESKTOP LOGOUT BUTTON */}
          <Button 
            variant="outline" 
            onClick={() => handleLogout(false)}
            disabled={logoutLoading || loading}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
          >
            {logoutLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {logoutLoading ? 'Logging out...' : t('logout')}
          </Button>
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
                
                {/* ✅ MOBILE LOGOUT BUTTON */}
                <Button 
                  variant="outline" 
                  className="justify-start w-full mt-4 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  onClick={() => handleLogout(true)}
                  disabled={logoutLoading || loading}
                >
                  {logoutLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {logoutLoading ? 'Logging out...' : t('logout')}
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
