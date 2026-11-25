import type { HTMLAttributes } from 'react';

/** Khối thẻ trắng bo góc */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className ? `card ${className}` : 'card'} {...rest} />;
}
