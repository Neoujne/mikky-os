/**
 * Profile Page - User profile with cyberpunk styling.
 * Uses Clerk for identity data and Convex for live aggregated stats.
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Target, Scan, Calendar, Mail, Pencil, User, Image } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function ProfilePage() {
    const { user, isLoaded } = useUser();
    const { toast } = useToast();

    // Real stats from Convex collections.
    const scans = useQuery(api.scans.listAll, { limit: 1000 }) || [];
    const targets = useQuery(api.targets.list, {}) || [];
    const vulns = useQuery(api.vulnerabilities.list, {}) || [];

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.fullName || '');
            setAvatarUrl(user.imageUrl || '');
        }
    }, [user]);

    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);

        try {
            const parts = (name || '').trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            await user.update({ firstName, lastName });

            const currentAvatar = user.imageUrl || '';
            const newAvatar = (avatarUrl || '').trim();
            let avatarUpdateFailed = false;

            if (newAvatar && newAvatar !== currentAvatar) {
                try {
                    // Some Clerk SDK versions support imageUrl directly.
                    await (user as any).update({ imageUrl: newAvatar });
                } catch {
                    try {
                        // Fallback path: fetch URL and upload blob to Clerk.
                        const response = await fetch(newAvatar);
                        if (!response.ok) {
                            throw new Error(`Image URL returned ${response.status}`);
                        }
                        const blob = await response.blob();
                        await user.setProfileImage({ file: blob });
                    } catch (imgErr) {
                        console.warn('Failed to update avatar:', imgErr);
                        avatarUpdateFailed = true;
                    }
                }
            }

            if (avatarUpdateFailed) {
                toast({
                    title: 'Profile Partially Updated',
                    description: 'Name was saved, but avatar URL could not be applied.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Profile Updated',
                    description: 'Your profile information has been updated successfully.',
                });
            }

            setIsDialogOpen(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({
                title: 'Error Updating Profile',
                description: 'There was an issue updating your profile. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const displayName = user.fullName || user.username || 'Operator';
    const displayAvatar = user.imageUrl;
    const email = user.primaryEmailAddress?.emailAddress || '';
    const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const memberSince = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Unknown';

    return (
        <div className="space-y-8 pb-20 max-w-3xl mx-auto">
            <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                OPERATOR PROFILE
            </h1>

            <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-cyan-500/20 via-zinc-900 to-purple-500/20" />

                <div className="px-8 -mt-14">
                    <Avatar className="h-24 w-24 border-4 border-zinc-900 shadow-lg shadow-cyan-500/10">
                        <AvatarImage src={displayAvatar} alt={displayName} />
                        <AvatarFallback className="bg-zinc-800 text-cyan-400 text-2xl font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="px-8 pt-4 pb-8 space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">{displayName}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Member since {memberSince}</span>
                        </div>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700 text-zinc-400 font-mono text-xs hover:text-cyan-400 hover:border-cyan-500/50"
                            >
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                Edit Profile
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Profile</DialogTitle>
                                <DialogDescription>
                                    Update your profile information
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        <User className="h-4 w-4" />
                                    </Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="avatar" className="text-right">
                                        <Image className="h-4 w-4" />
                                    </Label>
                                    <Input
                                        id="avatar"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Avatar URL"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<Scan className="h-5 w-5 text-cyan-400" />}
                    label="Scans Completed"
                    value={scans.length}
                />
                <StatCard
                    icon={<Target className="h-5 w-5 text-emerald-400" />}
                    label="Targets Monitored"
                    value={targets.length}
                />
                <StatCard
                    icon={<Shield className="h-5 w-5 text-red-400" />}
                    label="Vulns Discovered"
                    value={vulns.length}
                />
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-zinc-800/50">{icon}</div>
            <div>
                <div className="text-2xl font-bold text-zinc-100 font-mono">{value}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
            </div>
        </div>
    );
}
