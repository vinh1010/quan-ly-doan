import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, loginAs, resetDb, seedBase } from "./helpers";

describe("Chức năng 5: Quản lý cán bộ Đoàn cấp trên kèm phân quyền", () => {
  let ctx: Awaited<ReturnType<typeof seedBase>>;
  let tokenAdmin: string;
  let tokenA: string; // SUPERIOR của Xã A
  let tokenB: string; // SUPERIOR của Xã B

  beforeAll(async () => {
    await resetDb();
    ctx = await seedBase();
    tokenAdmin = await loginAs("admin.test");
    tokenA = await loginAs("superiorA.test");
    tokenB = await loginAs("superiorB.test");
  });

  it("ADMIN tạo được cán bộ cấp trên (SUPERIOR) cho bất kỳ đơn vị nào", async () => {
    const res = await request(app)
      .post("/api/officers")
      .set(authed(tokenAdmin))
      .send({ username: "moi.xaB.test", fullName: "Cán bộ mới", role: "SUPERIOR", unitId: ctx.xaB.id, password: "Abc123x", confirmPassword: "Abc123x" });
    expect(res.status).toBe(201);
  });

  it("SUPERIOR tạo được cán bộ cấp trên trong phạm vi địa bàn của mình", async () => {
    const res = await request(app)
      .post("/api/officers")
      .set(authed(tokenA))
      .send({ username: "phu.xaA.test", fullName: "Phụ trách xã A", role: "SUPERIOR", unitId: ctx.xaA.id, password: "Abc123x", confirmPassword: "Abc123x" });
    expect(res.status).toBe(201);
  });

  it("Phân quyền theo địa bàn — SUPERIOR không tạo được cán bộ cho đơn vị ngoài phạm vi", async () => {
    const res = await request(app)
      .post("/api/officers")
      .set(authed(tokenA))
      .send({ username: "phu.xaB.test", fullName: "X", role: "SUPERIOR", unitId: ctx.xaB.id, password: "Abc123x", confirmPassword: "Abc123x" });
    expect(res.status).toBe(403);
  });

  it("Phân quyền theo vai trò — SUPERIOR không được tự tạo tài khoản ADMIN", async () => {
    const res = await request(app)
      .post("/api/officers")
      .set(authed(tokenA))
      .send({ username: "admin.gia.test", fullName: "X", role: "ADMIN", password: "Abc123x", confirmPassword: "Abc123x" });
    expect(res.status).toBe(403);
  });

  it("Danh sách cán bộ cấp trên: SUPERIOR chỉ thấy cán bộ trong phạm vi của mình, ADMIN thấy tất cả", async () => {
    const listA = await request(app).get("/api/officers").set(authed(tokenA));
    expect(listA.body.items.some((i: { username: string }) => i.username === "superiorB.test")).toBe(false);

    const listAdmin = await request(app).get("/api/officers").set(authed(tokenAdmin));
    expect(listAdmin.body.items.some((i: { username: string }) => i.username === "superiorB.test")).toBe(true);
  });

  it("Không thể tự khóa tài khoản của chính mình", async () => {
    const res = await request(app)
      .patch(`/api/officers/${ctx.admin.id}/status`)
      .set(authed(tokenAdmin))
      .send({ status: "LOCKED" });
    expect(res.status).toBe(409);
  });

  it("ADMIN khóa được tài khoản SUPERIOR", async () => {
    const res = await request(app)
      .patch(`/api/officers/${ctx.superiorB.id}/status`)
      .set(authed(tokenAdmin))
      .send({ status: "LOCKED" });
    expect(res.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ username: "superiorB.test", password: ctx.PASSWORD });
    expect(login.status).toBe(403);

    // mở khóa lại để không ảnh hưởng test khác chạy sau
    await request(app).patch(`/api/officers/${ctx.superiorB.id}/status`).set(authed(tokenAdmin)).send({ status: "ACTIVE" });
  });

  it("Đặt lại mật khẩu cho cán bộ khác thì đăng nhập được bằng mật khẩu mới", async () => {
    const res = await request(app)
      .post(`/api/officers/${ctx.superiorA.id}/reset-password`)
      .set(authed(tokenAdmin))
      .send({ password: "MatKhauReset1", confirmPassword: "MatKhauReset1" });
    expect(res.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ username: "superiorA.test", password: "MatKhauReset1" });
    expect(login.status).toBe(200);
  });

  it("Không thể tự đặt lại mật khẩu của chính mình qua chức năng này (phải dùng Đổi mật khẩu)", async () => {
    const res = await request(app)
      .post(`/api/officers/${ctx.admin.id}/reset-password`)
      .set(authed(tokenAdmin))
      .send({ password: "Abc123x", confirmPassword: "Abc123x" });
    expect(res.status).toBe(409);
  });
});
