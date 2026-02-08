"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong!</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                An error occurred while loading this page. This could be due to a connection issue or a data processing error.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Try again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                    Go to Home
                </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-8 p-4 bg-black/50 rounded text-left text-xs text-red-400 overflow-auto max-w-full">
                    {error.message}
                    {error.stack}
                </pre>
            )}
        </div>
    );
}
