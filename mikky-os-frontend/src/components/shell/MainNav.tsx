import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Crosshair, Cpu, Database, ShieldAlert, ShieldCheck, Settings, HelpCircle } from 'lucide-react';

interface MainNavProps {
    onNavigate?: () => void;
    isCollapsed?: boolean;
}

const navigationItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Targets', href: '/targets', icon: Crosshair },
    { label: 'Operations', href: '/operations', icon: Cpu },
    { label: 'Intel', href: '/intel', icon: Database },
    { label: 'Vulns', href: '/vulns', icon: ShieldAlert },
    { label: 'Code Audit', href: '/code-audit', icon: ShieldCheck },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export function MainNav({ onNavigate, isCollapsed = false }: MainNavProps) {
    const location = useLocation();

    return (
        <nav className="flex flex-col space-y-2">
            {navigationItems.map((item) => {
                const Icon = item.icon || HelpCircle;
                const isActive = location.pathname === item.href;

                return (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onNavigate}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative',
                            isCollapsed ? 'justify-center px-2 rounded-xl' : 'overflow-hidden',
                            isActive
                                ? (isCollapsed
                                    ? 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.18)]'
                                    : 'text-cyan-400 bg-cyan-500/10')
                                : 'text-zinc-400 hover:text-cyan-200 hover:bg-zinc-800/50'
                        )}
                    >
                        {/* Active Indicator Bar - Only when expanded */}
                        {isActive && !isCollapsed && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        )}

                        {/* Icon */}
                        <span
                            className={cn(
                                'transition-colors flex-shrink-0 z-10',
                                isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-cyan-300'
                            )}
                        >
                            <Icon className="h-5 w-5" />
                        </span>

                        {/* Label - Hidden when collapsed */}
                        {!isCollapsed && (
                            <span className="tracking-wide whitespace-nowrap overflow-hidden z-10">{item.label}</span>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
}
