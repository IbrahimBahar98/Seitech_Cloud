
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMQTT } from "@/lib/mqtt-context";
import { Activity, ChevronDown, ChevronRight, Plus, Trash2, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useConfig } from '@/lib/config-context';
import { useTheme } from '@/components/ThemeProvider';

export const Sidebar = () => {
    const pathname = usePathname();
    const { deviceTypes } = useConfig();
    const { theme, setTheme } = useTheme();
    const { isConnected, connectionError } = useMQTT();

    // Initialize state dynamically based on config
    // Note: detailed state management might need refactoring if types change often, 
    // but for now we initialize based on what's available.
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [devices, setDevices] = useState<Record<string, number[]>>({});

    // Effect to sync state when deviceTypes change (e.g. new category added)
    useEffect(() => {
        setCollapsed(prev => {
            const next = { ...prev };
            deviceTypes.forEach(t => {
                if (next[t.id] === undefined) next[t.id] = false;
            });
            return next;
        });

        setDevices(prev => {
            const next = { ...prev };
            deviceTypes.forEach(t => {
                if (!next[t.id]) next[t.id] = Array.from({ length: t.defaultCount }, (_, i) => i + 1);
            });
            return next;
        });
    }, [deviceTypes]);

    const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path);

    const toggleSection = (sectionId: string) => {
        setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const addDevice = (typeId: string) => {
        setDevices(prev => {
            const currentIds = prev[typeId] || [];
            const newId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
            return {
                ...prev,
                [typeId]: [...currentIds, newId]
            };
        });
    };

    const removeDevice = (e: React.MouseEvent, typeId: string, id: number) => {
        e.preventDefault();
        setDevices(prev => ({
            ...prev,
            [typeId]: prev[typeId].filter(deviceId => deviceId !== id)
        }));
    };

    const NavItem = ({ href, icon: Icon, label, onDelete }: { href: string; icon: any; label: string; onDelete?: (e: React.MouseEvent) => void }) => (
        <Link
            href={href}
            className={twMerge(
                clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                    isActive(href)
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                )
            )}
        >
            <Icon size={20} className={clsx("transition-colors", isActive(href) ? "text-primary" : "text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white")} />
            <span className="font-medium tracking-wide">{label}</span>

            {onDelete && (
                <button
                    onClick={onDelete}
                    className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                    title="Remove Device"
                >
                    <Trash2 size={14} />
                </button>
            )}

            {isActive(href) && !onDelete && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
            )}
        </Link>
    );

    const SectionHeader = ({ title, sectionId, onAdd }: { title: string, sectionId: string, onAdd: () => void }) => (
        <div className="flex items-center justify-between px-2 mb-2 group">
            <button
                onClick={() => toggleSection(sectionId)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
                {collapsed[sectionId] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {title}
            </button>
            <button
                onClick={onAdd}
                className="p-1 text-gray-600 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title={`Add ${title} `}
            >
                <Plus size={14} />
            </button>
        </div>
    );

    const AppLogo = () => (
        <Link href="/" className="flex items-center gap-3 mb-10 px-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                <Activity className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 group-hover:opacity-80 transition-opacity">
                Seitech Cloud
            </h1>
        </Link>
    );

    return (
        <aside className="fixed left-0 top-0 h-screen w-72 bg-white/90 dark:bg-[#0a0f1e]/90 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 p-6 flex flex-col z-50 transition-colors duration-300">
            <AppLogo />

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <NavItem
                    href="/"
                    icon={Activity}
                    label="Overview"
                />

                {deviceTypes.map((type) => (
                    <div key={type.id}>
                        <SectionHeader
                            title={type.label}
                            sectionId={type.id}
                            onAdd={() => addDevice(type.id)}
                        />

                        <div className={clsx("space-y-1 overflow-hidden transition-all duration-300", collapsed[type.id] ? "max-h-0" : "max-h-[500px]")}>
                            {devices[type.id]?.map((id) => (
                                <NavItem
                                    key={`${type.id}-${id}`}
                                    href={`/device/${type.id}/${id}`}
                                    icon={type.icon}
                                    label={`${type.singularLabel} ${id}`}
                                    onDelete={(e) => removeDevice(e, type.id, id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-gray-200 dark:border-white/5 space-y-2">
                <Link
                    href="/settings"
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                        isActive('/settings')
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    )}
                >
                    <Settings size={20} />
                    <span className="font-medium tracking-wide">Settings</span>
                </Link>

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all duration-200"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="font-medium tracking-wide">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </button>

                <div className={`px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 mt-4 transition-colors ${isConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={`text-sm font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isConnected ? 'Broker Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                    {connectionError && !isConnected && (
                        <div className="mt-1 text-[10px] text-red-500/80 break-words px-1">
                            {connectionError}
                        </div>
                    )}
                </div>
            </div>
        </aside >
    );
};
