import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, loginAs, resetDb, seedBase } from "./helpers";

describe("Chức năng 4: Quản lý tài khoản (cấp / khóa tài khoản Bí thư)", () => {
  let ctx: Awaited<ReturnType<typeof seedBase>>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await resetDb();
    ctx = await seedBase();
    tokenA = await loginAs("superiorA.test");
    tokenB = await loginAs("superiorB.test");
  });

  it("BR8 — danh sách tài khoản Bí thư chỉ hiển thị trong phạm vi địa bàn", async () => {
    const res = await request(app).get("/api/accounts").set(authed(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.items.some((i: { username: string }) => i.username === "secretaryA1.test")).toBe(true);

    const other = await request(app).get("/api/accounts").set(authed(tokenB));
    expect(other.body.items.some((i: { username: string }) => i.username === "secretaryA1.test")).toBe(false);
  });

  it("BR8 — tạm khóa tài khoản Bí thư khiến tài khoản đó không đăng nhập được", async () => {
    const res = await request(app)
      .patch(`/api/accounts/${ctx.secUser.id}/status`)
      .set(authed(tokenA))
      .send({ status: "LOCKED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("LOCKED");

    const login = await request(app).post("/api/auth/login").send({ username: "secretaryA1.test", password: ctx.PASSWORD });
    expect(login.status).toBe(403);
  });

  it("kích hoạt lại tài khoản thì đăng nhập lại được", async () => {
    const res = await request(app)
      .patch(`/api/accounts/${ctx.secUser.id}/status`)
      .set(authed(tokenA))
      .send({ status: "ACTIVE" });
    expect(res.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ username: "secretaryA1.test", password: ctx.PASSWORD });
    expect(login.status).toBe(200);
  });

  it("Phân quyền theo địa bàn — không khóa được tài khoản ngoài phạm vi (trả 404, không lộ tồn tại)", async () => {
    const res = await request(app)
      .patch(`/api/accounts/${ctx.secUser.id}/status`)
      .set(authed(tokenB))
      .send({ status: "LOCKED" });
    expect(res.status).toBe(404);
  });

  it("Vai trò SECRETARY không có quyền vào trang quản lý tài khoản", async () => {
    const token = await loginAs("secretaryA1.test");
    const res = await request(app).get("/api/accounts").set(authed(token));
    expect(res.status).toBe(403);
  });
});
