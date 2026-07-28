// apps/web/src/auth/useGoogleIdentityButton.ts
// Shared between LoginPage and RegisterPage — both render Google Identity
// Services' own button (loaded from Google's CDN, no supported npm
// package) and both need the same script-load/init/render/cleanup dance.
import { type RefObject, useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function useGoogleIdentityButton(
  onCredential: (credential: string) => void,
  options: { text?: "signin_with" | "signup_with" | "continue_with" } = {},
): { buttonRef: RefObject<HTMLDivElement | null>; available: boolean } {
  const buttonRef = useRef<HTMLDivElement>(null);
  // Refs so the effect's script.onload closure always reads the latest
  // props without needing them in the dependency array — this is a one-shot
  // script-load/init, not something to redo on every render.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const textRef = useRef(options.text);
  textRef.current = options.text;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: textRef.current ?? "continue_with",
        width: 335,
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return { buttonRef, available: Boolean(GOOGLE_CLIENT_ID) };
}
