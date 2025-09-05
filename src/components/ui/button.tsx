import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-[var(--primary)] text-black hover:bg-[var(--primary-hover)] font-semibold",
                secondary: "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[#2a2a2a]",
                outline: "border border-[var(--border-color)] bg-transparent hover:bg-[var(--surface)] text-[var(--text-primary)]",
                ghost: "bg-transparent hover:bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-11 rounded-md px-8",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
