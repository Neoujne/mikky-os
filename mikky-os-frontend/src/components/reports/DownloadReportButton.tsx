import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface DownloadReportButtonProps {
    scanId: string;
    disabled?: boolean;
}

const BACKEND_URL = import.meta.env.VITE_MIKKY_BACKEND_URL || 'http://localhost:5000';

export function DownloadReportButton({ scanId, disabled }: DownloadReportButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDownload = () => {
        setLoading(true);
        window.open(`${BACKEND_URL}/api/scan/${scanId}/report`, '_blank');
        // Reset loading after a short delay (PDF streams directly)
        setTimeout(() => setLoading(false), 3000);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={disabled || loading}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-mono text-xs"
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
                <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            {loading ? 'Generating...' : 'PDF Report'}
        </Button>
    );
}
