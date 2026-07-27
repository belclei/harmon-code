import { describe, expect, it } from "vitest";
import { computeAvatarUrls } from "./avatar.js";

describe("computeAvatarUrls", () => {
  it("auto: prefers the Google photo when one is on file", () => {
    const urls = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "auto",
      googleAvatarUrl: "https://lh3.googleusercontent.com/a/ana",
    });
    expect(urls[0]).toBe("https://lh3.googleusercontent.com/a/ana");
    expect(urls[urls.length - 1]).toContain("api.dicebear.com");
  });

  it("auto: falls back to Gravatar then Dicebear with no Google photo", () => {
    const urls = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "auto",
      googleAvatarUrl: null,
    });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("gravatar.com");
    expect(urls[1]).toContain("api.dicebear.com");
  });

  it("dicebear: returns only the Dicebear URL even when a Google photo exists", () => {
    const urls = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "dicebear",
      googleAvatarUrl: "https://lh3.googleusercontent.com/a/ana",
    });
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("api.dicebear.com");
  });

  it("gravatar: returns Gravatar then Dicebear as the fallback", () => {
    const urls = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "gravatar",
      googleAvatarUrl: null,
    });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("gravatar.com");
    expect(urls[1]).toContain("api.dicebear.com");
  });

  it("google: falls straight to Dicebear when there's no Google photo on file", () => {
    const urls = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "google",
      googleAvatarUrl: null,
    });
    expect(urls).toEqual([expect.stringContaining("api.dicebear.com")]);
  });

  it("the Gravatar hash is deterministic and trims/lowercases the e-mail", () => {
    const a = computeAvatarUrls({
      name: "Ana",
      email: "  Ana@Harmon.DEV ",
      avatarMode: "gravatar",
      googleAvatarUrl: null,
    });
    const b = computeAvatarUrls({
      name: "Ana",
      email: "ana@harmon.dev",
      avatarMode: "gravatar",
      googleAvatarUrl: null,
    });
    expect(a[0]).toBe(b[0]);
  });
});
