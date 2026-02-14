/**
 * Settings Page - System Settings
 * Persisted settings UI backed by Convex.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, ServerCog, SlidersHorizontal, Save, Eye, EyeOff, Palette, Bell } from 'lucide-react';

type ThemeMode = 'cyberpunk' | 'matrix';

const DEFAULT_WORKER_URL = 'http://localhost:5000';
const LS_WORKER_URL_KEY = 'mikky_worker_url';

function applyThemeClass(mode: ThemeMode) {
    const body = document.body;
    body.classList.remove('theme-cyberpunk', 'theme-matrix');
    body.classList.add(mode === 'matrix' ? 'theme-matrix' : 'theme-cyberpunk');
}

export function SettingsPage() {
    const settings = useQuery(api.settings.getSettings);
    const saveSettingsMutation = useMutation(api.settings.saveSettings);

    const convexUrl = import.meta.env.VITE_CONVEX_URL || '';
    const workerEnvUrl = import.meta.env.VITE_MIKKY_BACKEND_URL || '';
    const workerAutoDetected = Boolean(workerEnvUrl);

    const [openRouterKey, setOpenRouterKey] = useState('');
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem('mikky_theme');
        return (stored === 'matrix' || stored === 'cyberpunk') ? stored : 'cyberpunk';
    });

    const [workerNodeUrl, setWorkerNodeUrl] = useState(() => {
        if (workerEnvUrl) return workerEnvUrl;
        return localStorage.getItem(LS_WORKER_URL_KEY) || DEFAULT_WORKER_URL;
    });
    const [concurrencyLimit, setConcurrencyLimit] = useState(3);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const hydratedFromServer = useRef(false);

    // Apply theme class to <body> whenever theme changes
    useEffect(() => {
        applyThemeClass(theme);
        localStorage.setItem('mikky_theme', theme);
    }, [theme]);

    useEffect(() => {
        if (!settings || hydratedFromServer.current) return;

        setTheme(settings.theme ?? 'cyberpunk');
        setNotificationsEnabled(settings.notifications ?? true);
        setOpenRouterKey(settings.openRouterKey ?? '');
        setConcurrencyLimit(Math.min(5, Math.max(1, settings.concurrency ?? 3)));

        if (!workerAutoDetected) {
            const serverUrl = settings.workerUrl || DEFAULT_WORKER_URL;
            setWorkerNodeUrl(serverUrl);
            localStorage.setItem(LS_WORKER_URL_KEY, serverUrl);
        }

        hydratedFromServer.current = true;
    }, [settings, workerAutoDetected]);

    const effectiveWorkerNodeUrl = useMemo(() => {
        if (workerAutoDetected) return workerEnvUrl;
        return workerNodeUrl || DEFAULT_WORKER_URL;
    }, [workerAutoDetected, workerEnvUrl, workerNodeUrl]);

    const persistSettings = async (
        overrides?: Partial<{
            theme: ThemeMode;
            notifications: boolean;
            concurrency: number;
            workerUrl: string;
            openRouterKey: string;
        }>,
        showFeedback = true
    ) => {
        const payload = {
            theme: overrides?.theme ?? theme,
            notifications: overrides?.notifications ?? notificationsEnabled,
            concurrency: overrides?.concurrency ?? concurrencyLimit,
            workerUrl: overrides?.workerUrl ?? effectiveWorkerNodeUrl,
            openRouterKey: overrides?.openRouterKey ?? openRouterKey,
        };

        setIsSaving(true);
        if (showFeedback) setSaveStatus('idle');

        try {
            await saveSettingsMutation(payload);
            if (showFeedback) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 2500);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            if (showFeedback) {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 2500);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleThemeToggle = async (enabled: boolean) => {
        const nextTheme: ThemeMode = enabled ? 'matrix' : 'cyberpunk';
        setTheme(nextTheme);
        await persistSettings({ theme: nextTheme }, false);
    };

    const handleNotificationsToggle = async (enabled: boolean) => {
        setNotificationsEnabled(enabled);
        await persistSettings({ notifications: enabled }, false);
    };

    const handleConcurrencyCommit = async (value: number) => {
        const normalized = Math.min(5, Math.max(1, value));
        setConcurrencyLimit(normalized);
        await persistSettings({ concurrency: normalized }, false);
    };

    if (!settings && !hydratedFromServer.current) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm">LOADING SETTINGS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">Settings</h1>
                <p className="text-zinc-400 mt-1">Manage interface behavior, scan engine limits, and API configuration.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="border-b border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                            <Palette className="h-4 w-4 text-cyan-400" />
                            <CardTitle className="text-lg font-heading">General</CardTitle>
                        </div>
                        <CardDescription>Customize dashboard behavior and user alerts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="theme-toggle" className="text-zinc-200">Theme Mode</Label>
                                <p className="text-sm text-zinc-500">Toggle between Cyberpunk and Matrix visual mood.</p>
                                <p className="text-xs font-mono text-zinc-400">Active: {theme === 'matrix' ? 'Matrix' : 'Cyberpunk'}</p>
                            </div>
                            <Switch
                                id="theme-toggle"
                                checked={theme === 'matrix'}
                                onCheckedChange={handleThemeToggle}
                                className="data-[state=checked]:bg-emerald-500"
                                aria-label="Toggle Matrix theme"
                            />
                        </div>

                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Bell className="h-3.5 w-3.5 text-zinc-400" />
                                    <Label htmlFor="notifications-toggle" className="text-zinc-200">Notifications</Label>
                                </div>
                                <p className="text-sm text-zinc-500">Show scan completion and failure notifications.</p>
                            </div>
                            <Switch
                                id="notifications-toggle"
                                checked={notificationsEnabled}
                                onCheckedChange={handleNotificationsToggle}
                                className="data-[state=checked]:bg-cyan-500"
                                aria-label="Toggle notifications"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                            <ServerCog className="h-4 w-4 text-amber-400" />
                            <CardTitle className="text-lg font-heading">Scanning Engine</CardTitle>
                        </div>
                        <CardDescription>Control worker endpoint and runtime agent parallelism.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="worker-node-url" className="text-zinc-200">Worker Node URL</Label>
                                {workerAutoDetected && (
                                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        AUTO-DETECTED
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-zinc-500">Endpoint used to trigger scan execution and live operations.</p>
                            <Input
                                id="worker-node-url"
                                value={effectiveWorkerNodeUrl}
                                onChange={(e) => setWorkerNodeUrl(e.target.value)}
                                onBlur={() => {
                                    if (!workerAutoDetected) {
                                        const trimmed = workerNodeUrl.trim() || DEFAULT_WORKER_URL;
                                        localStorage.setItem(LS_WORKER_URL_KEY, trimmed);
                                        void persistSettings({ workerUrl: trimmed }, false);
                                    }
                                }}
                                readOnly={workerAutoDetected}
                                placeholder={DEFAULT_WORKER_URL}
                                className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <Label htmlFor="concurrency-limit" className="text-zinc-200">Concurrency Limit</Label>
                                    <p className="text-sm text-zinc-500">Limit how many agents run simultaneously.</p>
                                </div>
                                <div className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-mono text-cyan-300">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    {concurrencyLimit}
                                </div>
                            </div>
                            <input
                                id="concurrency-limit"
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={concurrencyLimit}
                                onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
                                onMouseUp={(e) => void handleConcurrencyCommit(Number(e.currentTarget.value))}
                                onTouchEnd={(e) => void handleConcurrencyCommit(Number(e.currentTarget.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-cyan-500"
                            />
                            <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                                <span>1</span>
                                <span>2</span>
                                <span>3</span>
                                <span>4</span>
                                <span>5</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                    <CardHeader className="border-b border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                            <KeyRound className="h-4 w-4 text-fuchsia-400" />
                            <CardTitle className="text-lg font-heading">API Keys</CardTitle>
                        </div>
                        <CardDescription>Keep credentials local and verify deployment endpoints.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="openrouter-api-key" className="text-zinc-200">OpenRouter API Key</Label>
                            <p className="text-sm text-zinc-500">Used by AI report generation and reasoning workflows.</p>
                            <div className="relative">
                                <Input
                                    id="openrouter-api-key"
                                    type={showOpenRouterKey ? 'text' : 'password'}
                                    value={openRouterKey}
                                    onChange={(e) => setOpenRouterKey(e.target.value)}
                                    onBlur={() => void persistSettings({ openRouterKey: openRouterKey.trim() }, false)}
                                    placeholder="sk-or-..."
                                    className="pr-10 bg-zinc-950 border-zinc-800 text-zinc-100 font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOpenRouterKey((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    aria-label={showOpenRouterKey ? 'Hide API key' : 'Show API key'}
                                >
                                    {showOpenRouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="convex-url" className="text-zinc-200">Convex URL</Label>
                            <p className="text-sm text-zinc-500">Current deployment URL from your frontend environment.</p>
                            <Input
                                id="convex-url"
                                value={convexUrl || 'VITE_CONVEX_URL not set'}
                                readOnly
                                className="bg-zinc-950 border-zinc-800 text-zinc-400 font-mono text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <Button
                    onClick={() => void persistSettings(undefined, true)}
                    disabled={isSaving}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold"
                >
                    {isSaving ? (
                        <>
                            <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>

                {saveStatus === 'success' && (
                    <p className="text-sm text-emerald-400 font-mono">Settings saved.</p>
                )}
                {saveStatus === 'error' && (
                    <p className="text-sm text-red-400 font-mono">Failed to save settings.</p>
                )}
            </div>
        </div>
    );
}
