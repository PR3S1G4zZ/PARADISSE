import type { PropsWithChildren, ReactNode } from 'react';

type EmptyStateProps = PropsWithChildren<{
  title: string;
  description?: ReactNode;
}>;

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <section aria-labelledby="empty-state-title">
      <h1 id="empty-state-title">{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}
