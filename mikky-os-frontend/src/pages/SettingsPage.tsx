/**
 * Settings Page - System Settings
 * Configure system preferences and integrations.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Key, Container, Save, Eye, EyeOff } from 'lucide-react';

const STORAGE_KEYS = {
    OPENROUTER_API_KEY: 'mikky_openrouter_key',
    DOCKER_STRICT_MODE: 'mikky_docker_strict',
};

export function SettingsPage() {
    const [apiKey, setApiKey] = useState('');
    const [dockerStrictMode, setDockerStrictMode] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY) || '';
        const savedDockerMode = localStorage.getItem(STORAGE_KEYS.DOCKER_STRICT_MODE) === 'true';

        setApiKey(savedApiKey);
        setDockerStrictMode(savedDockerMode);
    }, []);

    // Save settings to localStorage
    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // Save to localStorage
            localStorage.setItem(STORAGE_KEYS.OPENROUTER_API_KEY, apiKey);
            localStorage.setItem(STORAGE_KEYS.DOCKER_STRICT_MODE, dockerStrictMode.toString());

            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 500));

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-heading font-bold text-zinc-100 tracking-tight">
                    Settings
                </h1>
                <p className="text-zinc-400 mt-1">
                    Configure system preferences and integrations.
                </p>
            </div>

            {/* API Configuration Section */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-cyan-400" />
                        <h2 className="text-xl font-heading font-bold text-zinc-100">
                            API Configuration
                        </h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-zinc-300">
                            OpenRouter API Key
                        </Label>
                        <p className="text-sm text-zinc-500 mb-3">
                            Your OpenRouter API key is used to power AI analysis via DeepSeek R1.
                            Get your key from{' '}
                            <a
                                href="https://openrouter.ai/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline"
                            >
                                openrouter.ai/keys
                            </a>
                        </p>
                        <div className="relative">
                            <Input
                                id="api-key"
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-or-..."
                                className="pr-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {showApiKey ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {apiKey && (
                            <p className="text-xs text-emerald-500 font-mono">
                                ✓ API key configured
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Docker Configuration Section */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center gap-3">
                        <Container className="h-5 w-5 text-purple-400" />
                        <h2 className="text-xl font-heading font-bold text-zinc-100">
                            Docker Configuration
                        </h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <Label htmlFor="docker-strict" className="text-zinc-300 cursor-pointer">
                                Docker Strict Mode
                            </Label>
                            <p className="text-sm text-zinc-500 mt-1">
                                Enforce strict security policies for Docker containers. When enabled,
                                containers run with minimal privileges, read-only filesystems, and
                                enhanced isolation. Recommended for production environments.
                            </p>
                        </div>
                        <Switch
                            id="docker-strict"
                            checked={dockerStrictMode}
                            onCheckedChange={setDockerStrictMode}
                            className="data-[state=checked]:bg-cyan-500"
                        />
                    </div>

                    {dockerStrictMode && (
                        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                            <p className="text-sm text-cyan-400 font-mono">
                                ⚡ Strict mode enabled. Scans will run with enhanced security constraints.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)]"
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

                {/* Save Status Feedback */}
                {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-500 font-mono text-sm animate-in fade-in duration-200">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Settings saved successfully
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-500 font-mono text-sm animate-in fade-in duration-200">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Failed to save settings
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                    Storage Location
                </h3>
                <p className="text-sm text-zinc-500 font-mono leading-relaxed">
                    All settings are stored locally in your browser's localStorage.
                    No data is sent to external servers. Clear your browser cache to reset settings.
                </p>
            </div>
        </div>
    );
}
