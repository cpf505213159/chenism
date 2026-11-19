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
    size === 'wide' ? 'max-w-[1180px]' : size === 'narrow' ? 'max-w-[720px]' : 'max-w-[1040px]';
  return (
    <div className={cn('mx-auto w-full px-5 sm:px-8', width, className)}>{children}</div>
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
    <section id={id} className={cn('py-14 sm:py-20', className)}>
      <Container>
        {(label || title) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              {label && <p className="kicker mb-3">{label}</p>}
              {title && (
                <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em] sm:text-[1.5rem]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-2 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted">
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
