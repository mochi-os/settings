import { useEffect, useState } from 'react'
import { CircleUser, LogOut, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { readProfileCookie } from '@/lib/profile-cookie'
import { useTheme } from '@/context/theme-provider'
import useDialogState from '@/hooks/use-dialog-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { AppsDropdown } from '@/components/apps-dropdown'
import { useSearch } from '@/context/search-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'

export function TopBar() {
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useDialogState()
  const { theme } = useTheme()
  const { setOpen: setSearchOpen } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')

  const email = useAuthStore((state) => state.email)
  const profile = readProfileCookie()
  const displayName = profile.name || 'User'
  const displayEmail = email || 'user@example.com'

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const themeColor = theme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [theme])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Open the command menu with the search query
      setSearchOpen(true)
    }
  }

  const handleSearchClick = () => {
    setSearchOpen(true)
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 h-16 w-full shadow-sm',
          offset > 10 && 'shadow'
        )}
      >
        <div
          className={cn(
            'relative flex h-full items-center gap-4 px-4 sm:px-6',
            offset > 10 &&
              'after:bg-background/80 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg'
          )}
        >
          {/* Logo */}
          <a href="/" className="flex shrink-0 items-center">
            <img
              src="/images/logo-header.svg"
              alt="Mochi"
              className="h-8 w-8"
            />
          </a>

          {/* Center Search Bar */}
          <div className="flex flex-1 items-center justify-center px-4">
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full max-w-xl"
            >
              <div
                className="relative cursor-pointer"
                onClick={handleSearchClick}
              >
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={handleSearchClick}
                  className="h-10 w-full rounded-full border-border/50 bg-accent/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground/70 hover:bg-accent focus:bg-background focus-visible:ring-1 focus-visible:ring-ring"
                  readOnly
                />
              </div>
            </form>
          </div>

          {/* Right Side Icons */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Apps Dropdown */}
            <AppsDropdown />

            {/* Notifications */}
            <NotificationsDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <CircleUser className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-56" align="end">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="grid px-2 py-1.5 text-start text-sm leading-tight">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {displayEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setOpen(true)}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
