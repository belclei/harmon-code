// apps/api/src/email/render-template.test.ts
import { describe, expect, it } from "vitest";
import { renderTemplate, substituteVars } from "./render-template.js";

describe("substituteVars", () => {
  it("replaces every occurrence of a known variable", () => {
    const result = substituteVars("Olá {{name}}, seu link é {{name}}.pdf", {
      name: "Fulano",
    });
    expect(result).toBe("Olá Fulano, seu link é Fulano.pdf");
  });

  it("replaces an unknown key with an empty string", () => {
    const result = substituteVars("valor: {{missing}}", {});
    expect(result).toBe("valor: ");
  });

  it("leaves text with no placeholders untouched", () => {
    expect(substituteVars("sem variáveis aqui", {})).toBe("sem variáveis aqui");
  });
});

describe("renderTemplate", () => {
  it("reads a real template file from templates/ and substitutes vars", () => {
    const result = renderTemplate("lurem-convite.txt", {
      link: "https://lurem.fasolo.tech/register?token=abc",
    });
    expect(result).toContain("https://lurem.fasolo.tech/register?token=abc");
    expect(result).not.toContain("{{link}}");
  });
});
