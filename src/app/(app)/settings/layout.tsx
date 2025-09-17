import Link from "next/link"

const navItems = [
  { name: 'Categorizer', href: '/settings/categorizer' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-12">
      <nav className="flex flex-col gap-2 text-sm w-48">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground p-2 rounded-md transition-colors">
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
