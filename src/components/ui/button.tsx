import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80',
        destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        outline: 'border border-white/20 bg-transparent hover:bg-white/5 active:bg-white/10',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800',
        ghost: 'hover:bg-white/5 active:bg-white/10',
        link: 'text-primary underline-offset-4 hover:underline active:opacity-80',
      },
      size: {
        default: 'h-11 px-4 py-2 min-w-[44px]',
        sm: 'h-10 rounded-md px-3 min-w-[44px]',
        lg: 'h-12 rounded-md px-8 min-w-[48px]',
        icon: 'h-11 w-11 min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

