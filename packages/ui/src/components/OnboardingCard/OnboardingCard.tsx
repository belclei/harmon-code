import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Card } from "../Card/Card";
import { Body } from "../Typography/Body";
import { Heading } from "../Typography/Heading";

export type OnboardingCardKind = "wallet" | "accounts" | "cards";

export interface OnboardingCardProps {
  kind: OnboardingCardKind;
  title: string;
  description: string;
  isComplete: boolean;
  ctaLabel: string;
  onAction: () => void;
}

/**
 * Harmon's activation card (§6.11) — the Timeline renders one of these per
 * pending item instead of the usual event feed when a user has no history
 * yet. Dumb component: `isComplete` arrives via props; it never checks
 * whether the user actually has accounts/cards/wallet balance set.
 */
export function OnboardingCard({
  title,
  description,
  isComplete,
  ctaLabel,
  onAction,
}: OnboardingCardProps) {
  return (
    <Card className={isComplete ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3">
        <Heading level={4}>{title}</Heading>
        {isComplete ? (
          <Badge kind="status" status="active">
            Concluído
          </Badge>
        ) : null}
      </div>
      <Body muted className="mt-1">
        {description}
      </Body>
      {!isComplete ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          className="mt-3"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </Card>
  );
}
