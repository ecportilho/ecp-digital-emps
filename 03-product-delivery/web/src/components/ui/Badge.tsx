import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'lime' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  lime: 'bg-lime-dim text-lime border-lime/20',
  neutral: 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ variant, children, size = 'md' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
    >
      {children}
    </span>
  );
}

// Convenience components for common badges
export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'warning', label: 'Pendente' },
    paid: { variant: 'success', label: 'Pago' },
    overdue: { variant: 'danger', label: 'Vencido' },
    cancelled: { variant: 'neutral', label: 'Cancelado' },
  };

  const config = map[status] || { variant: 'neutral' as BadgeVariant, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    admin: { variant: 'lime', label: 'Admin' },
    financial: { variant: 'info', label: 'Financeiro' },
    viewer: { variant: 'neutral', label: 'Visualizador' },
  };

  const config = map[role] || { variant: 'neutral' as BadgeVariant, label: role };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
