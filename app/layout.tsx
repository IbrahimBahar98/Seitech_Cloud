import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MQTTProvider } from "@/lib/mqtt-context";
import { ConfigProvider } from "@/lib/config-context";
import { DeviceProvider } from "@/lib/device-context";
// ... existing code ...

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var storageKey = 'seitech-ui-theme';
                                    var localTheme = localStorage.getItem(storageKey);
                                    var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                                    
                                    if (localTheme === 'dark' || (!localTheme && supportDarkMode)) {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className="font-sans antialiased">
                <ThemeProvider>
                    <ConfigProvider>
                        <DeviceProvider>
                            <MQTTProvider>
                                <div className="flex min-h-screen bg-white text-slate-900 dark:bg-[#0a0f1e] dark:text-slate-100 transition-colors duration-300">
                                    <Sidebar />
                                    <main className="flex-1 ml-72 p-8 bg-gray-50 dark:bg-transparent transition-colors duration-300">
                                        {children}
                                    </main>
                                </div>
                            </MQTTProvider>
                        </DeviceProvider>
                    </ConfigProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
