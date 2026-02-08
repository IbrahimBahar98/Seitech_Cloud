export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 animate-pulse font-medium">Loading Page...</p>
        </div>
    );
}
