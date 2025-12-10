import { useLocation } from '@tanstack/react-router'

// Map routes to their display titles
const routeTitles: Record<string, string> = {
  '/user/account': 'Account',
  '/user/sessions': 'Sessions',
  '/user/preferences': 'Preferences',
  '/domains': 'Domains',
  '/system/settings': 'Settings',
  '/system/users': 'Users',
  '/system/status': 'Status',
}

export function PageHeader() {
  const location = useLocation()
  const pathname = location.pathname
  
  // Get title from route map or extract from path
  const title = routeTitles[pathname] || 
    pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
    'Settings'

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
    </div>
  )
}
