import { LogOut, RotateCcw, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/UserAvatar'
import { useAuth } from '@/context/AuthContext'
import { resetMockData } from '@/lib/mock/store'
import { isMockMode } from '@/lib/supabase'

/** "button-label" from Figma: avatar + name. Opens account actions. */
export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  // No name yet (new account): show the email until the user sets a name.
  const name = profile?.display_name || user?.email || 'Account'

  async function handleSignOut() {
    const { error } = await signOut()
    if (error) toast.error(error.message)
    else navigate('/login', { replace: true })
  }

  // Mock mode only: delete all local users, data, and images.
  async function handleResetMock() {
    await signOut()
    await resetMockData()
    window.location.assign('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[220px] px-2 sm:pr-3" aria-label={`Account menu for ${name}`}>
          <UserAvatar url={profile?.avatarUrl} name={name} size="sm" />
          <span className="hidden truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuGroup className="flex flex-col gap-1">
          <DropdownMenuItem onSelect={() => navigate('/account')}>
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isMockMode && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleResetMock}>
              <RotateCcw />
              Reset mock data
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
