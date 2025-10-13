"use client";
import { Home, Map, Eye } from 'lucide-react'
import { FloatingSidebar } from "@/components/ui/liquid-glass"

export function AppNavBar() {
  const navItems = [
    { name: '首页', url: '/', icon: Home },
    { name: '演示', url: '/demo', icon: Map },
    { name: '详情', url: '/internal-details', icon: Eye }
  ]

  return <FloatingSidebar items={navItems} className="left-6 top-1/2 -translate-y-1/2" />
}
