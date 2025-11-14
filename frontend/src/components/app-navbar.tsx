"use client";
import { Home, Map, Eye, Activity } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dock, DockIcon, DockItem } from "@/components/ui/dock"

export function AppNavBar() {
  const pathname = usePathname()
  
  const navItems = [
    { url: '/', icon: Home },
    { url: '/demo', icon: Map },
    { url: '/internal-details', icon: Eye },
    { url: '/evaluation', icon: Activity }
  ]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Dock 
        className="items-end pb-3"
        magnification={60}
        distance={120}
        panelHeight={56}
        spring={{ mass: 0.05, stiffness: 200, damping: 15 }}
      >
        {navItems.map((item, idx) => {
          const Icon = item.icon
          const isActive = pathname === item.url
          
          return (
            <Link key={idx} href={item.url} className="block">
              <DockItem
                className={`aspect-square rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] scale-110 ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-transparent border border-white/20 dark:border-white/10' 
                    : 'bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md hover:bg-white/40 dark:hover:bg-neutral-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.37),inset_0_1px_0_0_rgba(255,255,255,0.5)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-white/20 dark:border-white/10'
                }`}
              >
                <DockIcon>
                  <Icon 
                    className={`h-full w-full stroke-2 ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`} 
                  />
                </DockIcon>
              </DockItem>
            </Link>
          )
        })}
      </Dock>
    </div>
  )
}
