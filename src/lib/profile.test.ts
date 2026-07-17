import { describe, expect, it } from "vitest";
import { getAccessRequestActionState, type AccessRequest } from "./profile";

const buildRequest = (status: AccessRequest["status"]): AccessRequest => ({
  id: "request-1",
  name: "Ana",
  email: "ana@example.com",
  message: "Quero participar",
  status,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("getAccessRequestActionState", () => {
  it("habilita aceitar e recusar apenas solicitações pendentes", () => {
    const state = getAccessRequestActionState(buildRequest("pending"));

    expect(state.canApprove).toBe(true);
    expect(state.canReject).toBe(true);
    expect(state.canRevoke).toBe(false);
    expect(state.canDelete).toBe(true);
  });

  it("habilita revogar acesso para solicitações aprovadas", () => {
    const state = getAccessRequestActionState(buildRequest("approved"));

    expect(state.canApprove).toBe(false);
    expect(state.canReject).toBe(false);
    expect(state.canRevoke).toBe(true);
    expect(state.canDelete).toBe(true);
  });
});
