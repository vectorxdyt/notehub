import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'notehub — A little clarity after class', description:'Your classroom notes, all in one place. Revisit board photos, find a topic, and pick up where you left off.' };
const themeScript = `(function(){try{var saved=localStorage.getItem('notehub-theme');var theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var contrast=localStorage.getItem('notehub-contrast')==='high'?'high':'normal';document.documentElement.dataset.theme=theme;document.documentElement.dataset.contrast=contrast;document.documentElement.style.colorScheme=theme}catch(e){}})()`;
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>; }
