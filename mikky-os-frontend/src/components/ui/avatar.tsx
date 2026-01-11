import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt?: string;
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
    ({ className, src, alt, ...props }, ref) => {
        const [hasError, setHasError] = React.useState(false);

        if (!src || hasError) {
            return null;
        }

        return (
            <img
                ref={ref}
                src={src}
                alt={alt}
                className={cn('aspect-square h-full w-full object-cover', className)}
                onError={() => setHasError(true)}
                {...props}
            />
        );
    }
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'flex h-full w-full items-center justify-center rounded-full bg-zinc-800 text-zinc-400',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
