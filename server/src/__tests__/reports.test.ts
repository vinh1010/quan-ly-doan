import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, loginAs, resetDb, seedBase } from "./helpers";

describe("Chức năng 3: Báo cáo theo khu vực + xuất Excel", () => {
  let ctx: Awaited<ReturnType<typeof seedBase>>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await resetDb();
    ctx = await seedBase();
    tokenA = await loginAs("superiorA.test");
    tokenB = await loginAs("superiorB.test");

    // thêm một Phó Bí thư ở Xã A để báo cáo có cả hai chức vụ
    await request(app)
      .post("/api/secretaries")
      .set(authed(tokenA))
      .send({
        fullName: "Phó Bí thư A1",
        dob: "1997-01-01",
        gender: "FEMALE",
        phone: "0933333333",
        cccd: "001197000888",
        unitId: ctx.coSoA1.id,
        position: "PHO_BI_THU",
        termStart: "2024-01-01",
        username: "phobithu.a1.test",
        password: "Abc123x",
        confirmPassword: "Abc123x",
      });
  });

  it("BR7 — thống kê đúng số Bí thư, Phó Bí thư và Đoàn viên quản lý theo khu vực", async () => {
    const res = await request(app).get("/api/reports/by-area").set(authed(tokenA));
    expect(res.status).toBe(200);
    const area = res.body.items.find((i: { name: string }) => i.name === "Xã A");
    expect(area).toMatchObject({ secretaries: 1, deputies: 1, members: 140 }); // 100 (xã) + 40 (cơ sở A1)
  });

  it("Phân quyền theo địa bàn — báo cáo chỉ tính khu vực trong phạm vi, không thấy khu vực khác", async () => {
    const res = await request(app).get("/api/reports/by-area").set(authed(tokenA));
    expect(res.body.items.some((i: { name: string }) => i.name === "Xã B")).toBe(false);

    const resB = await request(app).get("/api/reports/by-area").set(authed(tokenB));
    expect(resB.body.items.some((i: { name: string }) => i.name === "Xã A")).toBe(false);
  });

  it("BR7 — xuất Excel trả về file .xlsx đúng định dạng, có đủ 2 sheet", async () => {
    const res = await request(app)
      .get("/api/reports/export")
      .set(authed(tokenA))
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="bao-cao-bi-thu-/);
    expect((res.body as Buffer).length).toBeGreaterThan(1000); // có nội dung thật, không phải file rỗng

    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(res.body as Buffer) as unknown as Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Thống kê theo khu vực", "Danh sách cán bộ"]);
  });
});
