import * as React from "react"
import { cn } from "./utils"

type TabsValue = string

export function Tabs({ value, onValueChange, children }: { value: TabsValue; onValueChange: (v: TabsValue) => void; children: React.ReactNode }) {
    return <div data-value={value}>{children}</div>
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex gap-2", className)}>{children}</div>
}

export function TabsTrigger({ value, current, onClick, children }: { value: TabsValue; current: TabsValue; onClick: (v: TabsValue) => void; children: React.ReactNode }) {
    const active = current === value
    return (
        <button
            onClick={() => onClick(value)}
            className={cn(
                "px-3 py-2 rounded-md border",
                active ? "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-color)]" : "bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--surface)]"
            )}
        >
            {children}
        </button>
    )
}

export function TabsContent({ value, current, children }: { value: TabsValue; current: TabsValue; children: React.ReactNode }) {
    if (current !== value) return null
    return <div>{children}</div>
}
