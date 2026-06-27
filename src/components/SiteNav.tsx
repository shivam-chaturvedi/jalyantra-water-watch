import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SiteMenu } from '@/components/SiteMenu';

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-end gap-2 md:justify-center">
      <div className="hidden md:flex">
        <SiteMenu />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden h-9 w-9 shrink-0 border-border"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100vw-2rem,320px)]">
          <SheetHeader>
            <SheetTitle className="text-left text-teal-700">Menu</SheetTitle>
          </SheetHeader>
          <SiteMenu
            className="mt-6 flex-col items-stretch gap-1 text-sm normal-case tracking-normal"
            onNavigate={() => setOpen(false)}
            vertical
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
