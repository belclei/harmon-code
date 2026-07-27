import { Alert } from "../Alert/Alert";

export interface ProfileIncompleteAlertProps {
  onGoToSettings: () => void;
}

/**
 * ARQUITETURA.md §6.1 (26/07/2026) — gate de primeiro-login para contas
 * criadas com `birthDate` placeholder (hoje só via Google, que não coleta
 * data de nascimento). Substitui a tela obrigatória bloqueante cogitada em
 * 25/07 por um Alert persistente, mesmo padrão do `TimelineAlertBanner`.
 * Dumb component: o caller decide quando renderizar (`!hasCompleteProfile`)
 * e o que fazer no clique — este só compõe a copy fixa.
 */
export function ProfileIncompleteAlert({
  onGoToSettings,
}: ProfileIncompleteAlertProps) {
  return (
    <Alert
      variant="warning"
      title="Complete seu perfil"
      description="Sua conta ainda não tem uma data de nascimento cadastrada."
      actions={[{ label: "Ir para Configurações", onClick: onGoToSettings }]}
    />
  );
}
