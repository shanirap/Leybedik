import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuth,
  getCurrentUser,
  getToken,
  isAuthenticated,
  saveAuth,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveAuth שומר token ומשתמש", () => {
    saveAuth({
      token: "abc.jwt.token",
      email: "u@test.local",
      displayName: "User",
    });
    expect(getToken()).toBe("abc.jwt.token");
    expect(getCurrentUser()).toEqual({
      token: "abc.jwt.token",
      email: "u@test.local",
      displayName: "User",
    });
    expect(isAuthenticated()).toBe(true);
  });

  it("getToken מחזיר null על JSON לא תקין", () => {
    localStorage.setItem("leybedik-auth", "{not-json");
    expect(getToken()).toBeNull();
  });

  it("clearAuth מנקה והאימות נכבה", () => {
    saveAuth({
      token: "t",
      email: "e",
      displayName: "d",
    });
    clearAuth();
    expect(localStorage.getItem("leybedik-auth")).toBeNull();
    expect(getToken()).toBeNull();
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });
});
