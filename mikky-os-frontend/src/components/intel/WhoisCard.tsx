import { Calendar, User, Server, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WhoisData {
    registrar?: string;
    registrantOrg?: string;
    creationDate?: string;
    expirationDate?: string;
    nameServers?: string[];
    dnssec?: string;
}

interface WhoisCardProps {
    whois: WhoisData;
}

export function WhoisCard({ whois }: WhoisCardProps) {
    const isExpired = whois.expirationDate && new Date(whois.expirationDate) < new Date();

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="h-4 w-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-zinc-100 font-heading tracking-wide">
                    DOMAIN INTEL
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-mono mb-1">
                        <Server className="h-3 w-3" /> Registrar
                    </div>
                    <div className="text-sm font-semibold text-zinc-200 truncate" title={whois.registrar}>
                        {whois.registrar || "Unknown"}
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-mono mb-1">
                        <User className="h-3 w-3" /> Registrant
                    </div>
                    <div className="text-sm font-semibold text-zinc-200 truncate" title={whois.registrantOrg}>
                        {whois.registrantOrg || "Redacted"}
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-mono mb-1">
                        <Calendar className="h-3 w-3" /> Created
                    </div>
                    <div className="text-sm font-mono text-zinc-300">
                        {whois.creationDate ? new Date(whois.creationDate).toLocaleDateString() : "Unknown"}
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase font-mono mb-1">
                        <Calendar className="h-3 w-3" /> Expires
                    </div>
                    <div className={`text-sm font-mono ${isExpired ? "text-red-500" : "text-emerald-400"}`}>
                        {whois.expirationDate ? new Date(whois.expirationDate).toLocaleDateString() : "Unknown"}
                        {whois.expirationDate && (
                            <span className="block text-[10px] opacity-70">
                                {formatDistanceToNow(new Date(whois.expirationDate), { addSuffix: true })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {whois.nameServers && whois.nameServers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-800/50">
                    <div className="text-xs text-zinc-500 uppercase font-mono mb-2">Nameservers</div>
                    <div className="flex flex-wrap gap-2">
                        {whois.nameServers.slice(0, 2).map((ns) => (
                            <span key={ns} className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-mono">
                                {ns.toLowerCase()}
                            </span>
                        ))}
                        {whois.nameServers.length > 2 && (
                            <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-500 font-mono">
                                +{whois.nameServers.length - 2} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
