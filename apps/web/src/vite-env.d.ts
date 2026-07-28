/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Minimal surface of Google Identity Services actually used by
// useGoogleIdentityButton (LoginPage + RegisterPage) — see
// https://developers.google.com/identity/gsi/web/reference/js-reference.
interface GoogleCredentialResponse {
  credential: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
        }): void;
        renderButton(
          parent: HTMLElement,
          options: {
            theme?: string;
            size?: string;
            text?: string;
            width?: number;
          },
        ): void;
      };
    };
  };
}
