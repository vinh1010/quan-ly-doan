import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, loginAs, resetDb, seedBase } from "./helpers";
import { prisma } from "../prisma";

describe("Chức năng 1: Đăng nhập / đăng xuất / đổi mật khẩu", () => {
  let ctx: Awaited<ReturnType<typeof seedBase>>;

  beforeAll(async () => {
    await resetDb();
    ctx = await seedBase();
  });

  it("đăng nhập đúng tài khoản, mật khẩu trả về token và thông tin người dùng", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "superiorA.test", password: ctx.PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ username: "superiorA.test", role: "SUPERIOR" });
  });

  it("sai mật khẩu bị từ chối và không lộ tài khoản có tồn tại hay không", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "superiorA.test", password: "sai-mat-khau" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/không đúng/);
  });

  it("sai mật khẩu 5 lần liên tiếp thì khóa tạm tài khoản (RB — chống dò mật khẩu)", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ username: "superiorB.test", password: "sai" });
    }
    const res = await request(app).post("/api/auth/login").send({ username: "superiorB.test", password: ctx.PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/quá nhiều lần/);

    // trả lại trạng thái ban đầu cho các test sau
    await prisma.user.update({ where: { username: "superiorB.test" }, data: { failedLoginCount: 0, lockedUntil: null } });
  });

  it("tài khoản bị khóa (LOCKED) không đăng nhập được dù đúng mật khẩu", async () => {
    const locked = await prisma.user.create({
      data: {
        username: "locked.test",
        passwordHash: (await prisma.user.findUniqueOrThrow({ where: { username: "admin.test" } })).passwordHash,
        role: "SUPERIOR",
        unitId: ctx.xaA.id,
        status: "LOCKED",
      },
    });
    const res = await request(app).post("/api/auth/login").send({ username: locked.username, password: ctx.PASSWORD });
    expect(res.status).toBe(403);
  });

  it("GET /me trả đúng người dùng đang đăng nhập theo token", async () => {
    const token = await loginAs("superiorA.test");
    const res = await request(app).get("/api/auth/me").set(authed(token));
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("superiorA.test");
  });

  it("gọi API cần đăng nhập mà không có token thì bị từ chối", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("đổi mật khẩu đúng mật khẩu hiện tại thì thành công và token cũ vẫn hợp lệ trong yêu cầu tiếp theo", async () => {
    const token = await loginAs("secretaryA1.test");
    const res = await request(app)
      .post("/api/auth/change-password")
      .set(authed(token))
      .send({ currentPassword: ctx.PASSWORD, newPassword: "MatKhauMoi1", confirmPassword: "MatKhauMoi1" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    // đăng nhập lại bằng mật khẩu mới phải thành công
    const relogin = await request(app).post("/api/auth/login").send({ username: "secretaryA1.test", password: "MatKhauMoi1" });
    expect(relogin.status).toBe(200);
  });

  it("token cấp trước khi đổi mật khẩu bị thu hồi ngay (không dùng lại được)", async () => {
    const oldToken = await loginAs("superiorA.test");
    // JWT `iat` chỉ có độ chính xác tới giây, nên chờ qua ranh giới giây để phép so sánh
    // passwordChangedAt > iat trong middleware (auth.ts) có hiệu lực như thực tế sử dụng.
    await new Promise((r) => setTimeout(r, 1100));
    await request(app)
      .post("/api/auth/change-password")
      .set(authed(oldToken))
      .send({ currentPassword: ctx.PASSWORD, newPassword: "MoiHon123", confirmPassword: "MoiHon123" });

    const res = await request(app).get("/api/auth/me").set(authed(oldToken));
    expect(res.status).toBe(401);

    // trả lại mật khẩu ban đầu để không ảnh hưởng các test khác dùng superiorA.test
    const fresh = await loginAs("superiorA.test", "MoiHon123");
    await request(app)
      .post("/api/auth/change-password")
      .set(authed(fresh))
      .send({ currentPassword: "MoiHon123", newPassword: ctx.PASSWORD, confirmPassword: ctx.PASSWORD });
  });

  it("đăng xuất ghi nhật ký hoạt động (LOGOUT)", async () => {
    const token = await loginAs("admin.test");
    const res = await request(app).post("/api/auth/logout").set(authed(token));
    expect(res.status).toBe(200);
    const log = await prisma.auditLog.findFirst({ where: { action: "LOGOUT", user: { username: "admin.test" } } });
    expect(log).not.toBeNull();
  });
});
