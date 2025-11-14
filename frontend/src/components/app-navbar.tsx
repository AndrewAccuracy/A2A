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
    { url: '/sales-dashboard', icon: Activity }
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
                    ? 'bg-white/60 dark:bg-neutral-800/60 backdrop-blur-md scale-110 border-2 border-white/50 dark:border-white/40 shadow-lg shadow-white/20' 
                    : 'bg-white/30 dark:bg-neutral-800/30 backdrop-blur-md hover:bg-white/40 dark:hover:bg-neutral-700/40 border border-white/20 dark:border-white/10'
                }`}
              >
                <DockIcon>
                  <Icon 
                    className="h-full w-full stroke-2 text-white"
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
