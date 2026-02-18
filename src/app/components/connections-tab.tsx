// components/ConnectionsTab.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Star, Gift, Trophy, Coins, Zap, X, CheckCircle2 } from 'lucide-react';

type ConnectionInfo = {
    provider: string;
    providerAccountId: string;
    createdAt: string;
} | null;

type Connections = {
    twitch: ConnectionInfo;
    discord: ConnectionInfo;
};

export function ConnectionsTab({ mounted }: { mounted: boolean }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToast();

    const [connections, setConnections] = useState<Connections>({ twitch: null, discord: null });
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    // Nach OAuth-Redirect: ?success= oder ?error= auswerten
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'twitch_connected') {
            addToast({ title: '🎉 Twitch verbunden!', description: 'Dein Twitch-Account ist jetzt verknüpft.' });
            router.replace('/dashboard?tab=connections');
            fetchConnections();
        }

        if (error) {
            const messages: Record<string, string> = {
                twitch_already_used: 'Dieser Twitch-Account ist bereits mit einem anderen User verknüpft.',
                already_connected: 'Twitch ist bereits mit deinem Account verbunden.',
                user_not_found: 'Session-Fehler. Bitte versuche es erneut.',
                link_failed: 'Verknüpfung fehlgeschlagen. Bitte versuche es erneut.',
            };
            addToast({
                title: 'Fehler',
                description: messages[error] ?? 'Etwas ist schiefgelaufen.',
                variant: 'destructive',
            });
            router.replace('/dashboard?tab=connections');
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchConnections = useCallback(async () => {
        try {
            const res = await fetch('/api/user/connections');
            if (res.ok) {
                const data = await res.json();
                setConnections(data.connections);
            }
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleConnectTwitch = async () => {
        setConnecting(true);
        try {
            // 1. Cookie serverseitig setzen (markiert diesen Request als "link"-Intent)
            const res = await fetch('/api/user/connections/twitch/prepare');
            const data = await res.json();

            if (!res.ok) {
                const messages: Record<string, string> = {
                    already_connected: 'Twitch ist bereits verbunden.',
                    Unauthorized: 'Bitte zuerst einloggen.',
                };
                addToast({
                    title: 'Fehler',
                    description: messages[data.error] ?? data.error,
                    variant: 'destructive',
                });
                setConnecting(false);
                return;
            }

            // 2. OAuth-Flow direkt starten – signIn() handled CSRF automatisch
            //    und leitet ohne Zwischenseite direkt zu Twitch weiter
            await signIn('twitch', {
                callbackUrl: '/dashboard?tab=connections',
                // redirect: true ist Standard → Browser wird direkt zu Twitch geschickt
            });
        } catch (err) {
            console.error('Connect failed:', err);
            addToast({ title: 'Fehler', description: 'Verbindung fehlgeschlagen.', variant: 'destructive' });
            setConnecting(false);
        }
    };

    const handleDisconnect = async (provider: string) => {
        setDisconnecting(provider);
        try {
            const res = await fetch('/api/user/connections', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider }),
            });

            const data = await res.json();

            if (!res.ok) {
                addToast({ title: 'Fehler', description: data.error, variant: 'destructive' });
                return;
            }

            setConnections((prev) => ({ ...prev, [provider]: null }));
            addToast({ title: 'Getrennt', description: `${provider} wurde entknüpft.` });
        } catch {
            addToast({ title: 'Fehler', description: 'Trennung fehlgeschlagen.', variant: 'destructive' });
        } finally {
            setDisconnecting(null);
        }
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

    const isTwitchConnected = !!connections.twitch;

    const animStyle = (delay: string): React.CSSProperties => ({
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}`,
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-8">
            {/* Hero Header */}
            <div style={animStyle('0s')}>
                <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Connect Your World
          </span>
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl">
                    Unite your gaming profiles and unlock exclusive perks across platforms
                </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Discord Card (coming soon) ── */}
                <div className="group relative" style={animStyle('0.1s')}>
                    <div className="relative h-full glass-strong rounded-3xl p-8 border border-white/[0.05] overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-110">
                                        <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">Discord</h3>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/20">
                                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Not Connected</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-400 text-base leading-relaxed mb-6">
                                Join our thriving community server and unlock special roles that give you access to exclusive channels, events, and insider updates.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <Star className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="text-sm text-indigo-300 font-medium">Exclusive Roles</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <Gift className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                    <span className="text-sm text-indigo-300 font-medium">Early Access</span>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <button
                                    disabled
                                    className="w-full rounded-xl bg-indigo-500/30 px-6 py-4 flex items-center justify-center gap-3 cursor-not-allowed opacity-60"
                                >
                                    <Zap className="w-5 h-5 text-white" />
                                    <span className="text-white font-bold text-lg">Coming Soon</span>
                                </button>
                                <p className="text-center text-xs text-gray-500 mt-3">Discord integration coming soon</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Twitch Card ── */}
                <div className="group relative" style={animStyle('0.2s')}>
                    <div className={`relative h-full glass-strong rounded-3xl p-8 border overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                        isTwitchConnected
                            ? 'border-green-500/20 hover:border-green-500/40 hover:shadow-green-500/10'
                            : 'border-white/[0.05] hover:border-purple-500/30 hover:shadow-purple-500/10'
                    }`}>
                        {isTwitchConnected && (
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full" />
                        )}
                        {!isTwitchConnected && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5" />
                            </div>
                        )}

                        <div className="relative z-10 h-full flex flex-col">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-xl shadow-purple-500/30 transition-transform duration-300 group-hover:scale-110">
                                            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                                            </svg>
                                        </div>
                                        {isTwitchConnected && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center shadow-lg">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-1">Twitch</h3>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                                            isTwitchConnected
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-gray-500/10 border-gray-500/20'
                                        }`}>
                                            <div className={`w-2 h-2 rounded-full ${isTwitchConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${isTwitchConnected ? 'text-green-400' : 'text-gray-400'}`}>
                        {loading ? '...' : isTwitchConnected ? 'Connected' : 'Not Connected'}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-400 text-base leading-relaxed mb-6">
                                Earn exclusive rewards while streaming your favorite games or watching other creators. Your activity unlocks special benefits.
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    <Trophy className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    <span className="text-sm text-purple-300 font-medium">Stream Rewards</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                    <Coins className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    <span className="text-sm text-purple-300 font-medium">Watch & Earn</span>
                                </div>
                            </div>

                            {isTwitchConnected && connections.twitch ? (
                                <>
                                    <div className="px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/10 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Connected Since</p>
                                                <p className="text-sm font-bold text-white">{formatDate(connections.twitch.createdAt)}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <button
                                            onClick={() => handleDisconnect('twitch')}
                                            disabled={disconnecting === 'twitch'}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-semibold transition-all duration-300 disabled:opacity-50"
                                        >
                                            {disconnecting === 'twitch' ? (
                                                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                            <span>Disconnect Account</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-auto">
                                    <button
                                        onClick={handleConnectTwitch}
                                        disabled={loading || connecting}
                                        className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 p-[2px] transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
                                    >
                                        <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-[10px] px-6 py-4 flex items-center justify-center gap-3">
                                            {connecting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span className="text-white font-bold text-lg">Verbinde...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-5 h-5 text-white" />
                                                    <span className="text-white font-bold text-lg">Connect Twitch</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                    <p className="text-center text-xs text-gray-500 mt-3">
                                        Instant setup • Less than 30 seconds
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Privacy Notice */}
            <div
                className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 p-6"
                style={animStyle('0.3s')}
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-bl-full" />
                <div className="relative flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white mb-2">Your Privacy is Protected</h4>
                        <p className="text-gray-400 leading-relaxed">
                            We only use your connected accounts to verify your identity and provide platform-specific features. All data is encrypted and you maintain full control — disconnect anytime with a single click.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}