import { LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@clerk/clerk-react';

interface UserMenuProps {
    onLogout?: () => void;
    isCollapsed?: boolean;
}

export function UserMenu({ onLogout, isCollapsed = false }: UserMenuProps) {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className={cn("w-full p-2 flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                {!isCollapsed && (
                    <div className="flex flex-col gap-2">
                        <div className="h-3 w-24 bg-zinc-800 animate-pulse rounded" />
                        <div className="h-2 w-16 bg-zinc-800 animate-pulse rounded" />
                    </div>
                )}
            </div>
        );
    }

    if (!user) return null;

    // Get initials from name
    const displayName = user.fullName || user.username || 'User';
    const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Get primary email
    const email = user.primaryEmailAddress?.emailAddress || '';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn(
                    "w-full p-2 h-auto hover:bg-zinc-900 group",
                    isCollapsed ? "justify-center" : "justify-start"
                )}>
                    <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "gap-3")}>
                        <Avatar className="h-9 w-9 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors flex-shrink-0">
                            <AvatarImage src={user.imageUrl} alt={displayName} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400 group-hover:text-cyan-400">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                            <div className="flex flex-col items-start text-left truncate overflow-hidden">
                                <span className="text-sm font-medium text-zinc-300 group-hover:text-cyan-400 truncate w-full">
                                    {displayName}
                                </span>
                                <span className="text-xs text-zinc-500 truncate w-full">{email}</span>
                            </div>
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-56 bg-zinc-950 border-zinc-800 text-zinc-200 bottom-full mb-2"
            >
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="focus:bg-zinc-900 focus:text-cyan-400 cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onLogout}
                    className="text-red-400 focus:text-red-300 focus:bg-red-950/20 cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
