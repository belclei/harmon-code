import { Alert } from "../Alert/Alert";
import { formatMoney } from "../shared/formatMoney";

export type AlertedEntity =
  | {
      id: string;
      kind: "account";
      institutionName: string;
      overAmountCents: number;
      onConfigure: () => void;
    }
  | {
      id: string;
      kind: "card";
      institutionName: string;
      usagePercent: number;
      onConfigure: () => void;
    };

export interface TimelineAlertBannerProps {
  /** Empty array → caller should not render this component at all (§6.12: banner "some sozinho quando todas as entidades voltam para dentro do limite"). Rendering with an empty list is a caller bug, not handled defensively here — same "trust the boundary" stance as the rest of this package. */
  entities: AlertedEntity[];
}

function describeEntity(entity: AlertedEntity): string {
  if (entity.kind === "account") {
    return `Conta ${entity.institutionName} ${formatMoney(entity.overAmountCents)} além do limite`;
  }
  return `Cartão ${entity.institutionName} ${Math.round(entity.usagePercent)}% do limite`;
}

/**
 * Lurem's fixed Timeline alert banner (§6.4/§6.12). Dumb component: the
 * caller decides which accounts/cards are in the alert state; this only
 * composes the exact copy pattern and renders `Alert` — never computes
 * over-limit state itself.
 */
export function TimelineAlertBanner({ entities }: TimelineAlertBannerProps) {
  const description = entities.map(describeEntity).join(" · ");

  return (
    <Alert
      variant="warning"
      title={
        entities.length > 1
          ? "Contas e cartões em alerta"
          : "Conta ou cartão em alerta"
      }
      description={description}
      actions={entities.map((entity) => ({
        label: `Ajustar ${entity.institutionName}`,
        onClick: entity.onConfigure,
        variant: "secondary" as const,
      }))}
    />
  );
}
