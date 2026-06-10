import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getWorkspaceInviteUnavailableMessage,
  resolveAppBaseUrl,
} from "@/src/lib/workspace-invite-policy";

describe("resolveAppBaseUrl", () => {
  it("prefers the canonical app URL over request headers", () => {
    assert.equal(
      resolveAppBaseUrl({
        appUrl: "https://app.example.com/",
        origin: "https://attacker.example",
        forwardedOrigin: "https://proxy.example",
        nodeEnv: "production",
      }),
      "https://app.example.com",
    );
  });

  it("rejects request headers in production when no canonical URL exists", () => {
    assert.equal(
      resolveAppBaseUrl({
        appUrl: "",
        origin: "https://attacker.example",
        forwardedOrigin: "https://proxy.example",
        nodeEnv: "production",
      }),
      null,
    );
  });

  it("allows a request origin fallback outside production", () => {
    assert.equal(
      resolveAppBaseUrl({
        appUrl: "",
        origin: "http://localhost:3000",
        nodeEnv: "development",
      }),
      "http://localhost:3000",
    );
  });
});

describe("getWorkspaceInviteUnavailableMessage", () => {
  const now = new Date("2026-06-10T12:00:00.000Z");

  it("blocks revoked invites", () => {
    assert.equal(
      getWorkspaceInviteUnavailableMessage(
        {
          invitedEmail: "person@example.com",
          type: "email",
          expiresAt: new Date("2026-06-11T12:00:00.000Z"),
          revokedAt: new Date("2026-06-10T11:00:00.000Z"),
          maxUses: 1,
          usedCount: 0,
        },
        now,
      ),
      "Questo invito non è più disponibile.",
    );
  });

  it("blocks expired invites", () => {
    assert.equal(
      getWorkspaceInviteUnavailableMessage(
        {
          invitedEmail: "person@example.com",
          type: "email",
          expiresAt: new Date("2026-06-10T11:59:59.000Z"),
          revokedAt: null,
          maxUses: 1,
          usedCount: 0,
        },
        now,
      ),
      "Questo invito è scaduto.",
    );
  });

  it("blocks open invites that reached max uses", () => {
    assert.equal(
      getWorkspaceInviteUnavailableMessage(
        {
          invitedEmail: "open",
          type: "open_link",
          expiresAt: new Date("2026-06-11T12:00:00.000Z"),
          revokedAt: null,
          maxUses: 10,
          usedCount: 10,
        },
        now,
      ),
      "Questo link ha raggiunto il numero massimo di utilizzi.",
    );
  });

  it("allows available invites", () => {
    assert.equal(
      getWorkspaceInviteUnavailableMessage(
        {
          invitedEmail: "person@example.com",
          type: "email",
          expiresAt: new Date("2026-06-11T12:00:00.000Z"),
          revokedAt: null,
          maxUses: 1,
          usedCount: 0,
        },
        now,
      ),
      null,
    );
  });
});
