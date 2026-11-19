import { cn } from '@/lib/utils/format';

export function Container({
  children,
  className,
  size = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'wide' | 'narrow';
}) {
  const width =
    size === 'wide' ? 'max-w-[1200px]' : size === 'narrow' ? 'max-w-[700px]' : 'max-w-[1080px]';
  return (
    <div className={cn('mx-auto w-full px-5 sm:px-10', width, className)}>{children}</div>
  );
}

export function Section({
  children,
  className,
  id,
  label,
  title,
  description,
  action,
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  label?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', className)}>
      <Container>
        {(label || title) && (
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              {label && <p className="kicker mb-3.5">{label}</p>}
              {title && (
                <h2 className="text-[1.4rem] font-semibold leading-[1.25] tracking-[-0.028em] sm:text-[1.7rem]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-[1.72] text-muted">
                  {description}
                </p>
              )}
            </div>
            {action}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
