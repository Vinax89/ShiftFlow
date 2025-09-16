import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex-1">
        {/* Placeholder for breadcrumbs or page title */}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
