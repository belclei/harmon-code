import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

const SECRET = "x".repeat(32);

describe("jwt", () => {
  it("round-trips a valid token", async () => {
    const token = await signAccessToken(
      { sub: "user_1", role: "user" },
      SECRET,
    );
    const payload = await verifyAccessToken(token, SECRET);
    expect(payload.sub).toBe("user_1");
    expect(payload.role).toBe("user");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken(
      { sub: "user_1", role: "user" },
      SECRET,
    );
    await expect(verifyAccessToken(token, "y".repeat(32))).rejects.toThrow();
  });

  it("rejects a token past its 15-minute expiry", async () => {
    const token = await signAccessToken(
      { sub: "user_1", role: "user" },
      SECRET,
      {
        nowSeconds: Math.floor(Date.now() / 1000) - 1000,
      },
    );
    await expect(verifyAccessToken(token, SECRET)).rejects.toThrow();
  });
});
