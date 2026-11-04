import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-premium disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-ink-900 text-white shadow-card hover:bg-ink-800 hover:shadow-card-hover active:scale-[0.99]',
        gold: 'bg-gold-500 text-ink-950 shadow-gold hover:bg-gold-400 active:scale-[0.99]',
        outline:
          'border border-ink-200 bg-white text-ink-800 hover:border-ink-300 hover:bg-sand-50',
        ghost: 'text-ink-700 hover:bg-sand-100 hover:text-ink-900',
        subtle: 'bg-sand-100 text-ink-800 hover:bg-sand-200',
        danger: 'bg-danger text-white hover:bg-[#9a1e15]',
        link: 'text-gold-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-[0.8125rem]',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-[0.9375rem]',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
