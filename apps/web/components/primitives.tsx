import type { ReactNode } from "react";

export function Badge({ children, tone = "mint" }: { children: ReactNode; tone?: "mint" | "salmon" | "white" }) {
  return <span className={`tk-badge tk-badge-${tone}`}>{children}</span>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: `/${string}`; children: ReactNode; variant?: "primary" | "secondary" }) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    throw new Error("ButtonLink only accepts internal absolute paths.");
  }
  return <a className={`button ${variant}`} href={href}>{children}</a>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={`tk-card ${className}`}>{children}</article>;
}

export function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}
