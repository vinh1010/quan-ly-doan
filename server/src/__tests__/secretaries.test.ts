import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, loginAs, resetDb, seedBase } from "./helpers";

describe("Chức năng 2: Quản lý Bí thư Đoàn cơ sở", () => {
  let ctx: Awaited<ReturnType<typeof seedBase>>;
  let tokenA: string; // superiorA: phạm vi Xã A và các cơ sở trực thuộc
  let tokenB: string; // superiorB: phạm vi Xã B, không thấy dữ liệu của Xã A

  beforeAll(async () => {
    await resetDb();
    ctx = await seedBase();
    tokenA = await loginAs("superiorA.test");
    tokenB = await loginAs("superiorB.test");
  });

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    fullName: "Nguyễn Văn Test",
    dob: "1996-02-02",
    gender: "MALE",
    phone: "0922222222",
    cccd: "001196000999",
    unitId: 0, // gán ở từng test
    termStart: "2024-06-01",
    username: "bithu.moi.test",
    password: "Abc123x",
    confirmPassword: "Abc123x",
    ...overrides,
  });

  it("BR2 — thêm mới Bí thư trong phạm vi đơn vị của mình thì thành công và tạo kèm tài khoản đăng nhập", async () => {
    const res = await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send(validPayload({ unitId: ctx.coSoA1.id }));
    expect(res.status).toBe(201);
    expect(res.body.item.fullName).toBe("Nguyễn Văn Test");

    const login = await request(app).post("/api/auth/login").send({ username: "bithu.moi.test", password: "Abc123x" });
    expect(login.status).toBe(200);
  });

  it("RB2/RB3 — thiếu trường bắt buộc thì báo lỗi 400, không tạo bản ghi", async () => {
    const res = await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send({ fullName: "", unitId: ctx.coSoA1.id });
    expect(res.status).toBe(400);
  });

  it("Trùng CCCD bị từ chối (ràng buộc duy nhất)", async () => {
    const res = await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send(validPayload({ unitId: ctx.coSoA1.id, username: "bithu.moi2.test", cccd: ctx.secretaryA1.cccd }));
    expect(res.status).toBe(409);
    expect(res.body.errors.cccd).toBeTruthy();
  });

  it("Phân quyền theo địa bàn — không thêm được Bí thư cho đơn vị ngoài phạm vi của mình", async () => {
    const res = await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send(validPayload({ unitId: ctx.xaB.id, username: "bithu.ngoaipham.test" }));
    expect(res.status).toBe(403);
  });

  it("BR5 — tìm kiếm chỉ trả kết quả trong phạm vi địa bàn của người dùng", async () => {
    const res = await request(app).get("/api/secretaries").set(authed(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect([ctx.coSoA1.id]).toContain(item.unitId);
    }
  });

  it("BR5 — tìm theo họ tên khớp một phần, không phân biệt hoa thường", async () => {
    const res = await request(app).get("/api/secretaries").query({ name: "bí thư a1" }).set(authed(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.items.some((i: { fullName: string }) => i.fullName === "Bí thư A1")).toBe(true);
  });

  it("BR4 — xem chi tiết trong phạm vi thì thấy, ngoài phạm vi thì trả 404 (không lộ dữ liệu)", async () => {
    const ok = await request(app).get(`/api/secretaries/${ctx.secretaryA1.id}`).set(authed(tokenA));
    expect(ok.status).toBe(200);

    const forbidden = await request(app).get(`/api/secretaries/${ctx.secretaryA1.id}`).set(authed(tokenB));
    expect(forbidden.status).toBe(404);
  });

  it("BR3/RB9 — cập nhật để trống mật khẩu thì giữ nguyên mật khẩu cũ", async () => {
    const res = await request(app)
      .put(`/api/secretaries/${ctx.secretaryA1.id}`)
      .set(authed(tokenA))
      .send({
        fullName: "Bí thư A1 (đã sửa)",
        dob: "1995-01-01",
        gender: "MALE",
        phone: "0911111111",
        cccd: ctx.secretaryA1.cccd,
        unitId: ctx.coSoA1.id,
        termStart: "2024-01-01",
        termEnd: "2027-01-01",
      });
    expect(res.status).toBe(200);
    expect(res.body.item.fullName).toBe("Bí thư A1 (đã sửa)");

    const stillWorks = await request(app)
      .post("/api/auth/login")
      .send({ username: "secretaryA1.test", password: "Abc123x" });
    expect(stillWorks.status).toBe(200);
  });

  it("RB5/UC4 — không xóa được Bí thư đang tại chức (còn trong nhiệm kỳ)", async () => {
    const res = await request(app).delete(`/api/secretaries/${ctx.secretaryA1.id}`).set(authed(tokenA));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/đang tại chức/);
  });

  it("BR6 — xóa mềm khi Bí thư đã kết thúc nhiệm kỳ, đồng thời khóa tài khoản liên kết", async () => {
    const ended = await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send(
        validPayload({
          unitId: ctx.coSoA1.id,
          username: "bithu.het.test",
          cccd: "001196000111",
          termStart: "2018-01-01",
          termEnd: "2022-01-01",
          status: "ENDED",
        }),
      );
    expect(ended.status).toBe(201);

    const del = await request(app).delete(`/api/secretaries/${ended.body.item.id}`).set(authed(tokenA));
    expect(del.status).toBe(200);

    const getAfter = await request(app).get(`/api/secretaries/${ended.body.item.id}`).set(authed(tokenA));
    expect(getAfter.status).toBe(404); // đã xóa mềm nên không còn thấy trong danh sách hoạt động

    const loginAfter = await request(app).post("/api/auth/login").send({ username: "bithu.het.test", password: "Abc123x" });
    expect(loginAfter.status).toBe(403); // tài khoản bị khóa theo hồ sơ
  });
});
