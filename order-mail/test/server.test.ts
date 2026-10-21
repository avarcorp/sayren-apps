import { createEnvelope, invoke } from "@sayren/app/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/server";

// 관리 API 응답은 실제 주문 응답 모양 그대로 돌려주고 store-sdk가 파싱한다.
// 목 모양이 실제 응답과 갈라져 운영 첫 ORDER.PAID에서 `totalAmount`(실제는 `payment.totalAmount`)를 읽다 실패한 일(2026-10-07)을 막는다.
const at = "2026-10-07T03:00:00.000Z";
const order = {
  orderId: "ord_1",
  orderNo: "26100712345678",
  orderedAt: at,
  orderer: { name: "김구매", phone: "01012345678", email: "buyer@example.com" },
  shippingAddress: {
    receiverName: "김구매",
    phone: "01012345678",
    zipCode: "06236",
    address1: "서울시 강남구 테헤란로 1",
  },
  payment: {
    method: "CARD",
    productAmount: 32000,
    deliveryFee: 3000,
    discountAmount: 0,
    totalAmount: 35000,
    paidAt: at,
  },
  testPayment: true,
  items: [
    {
      orderItemId: "oi_1",
      orderId: "ord_1",
      status: "PAID",
      claimStatus: null,
      productId: "prod_1",
      productName: "셔츠",
      optionId: null,
      optionName: null,
      sellerCode: null,
      fulfillmentSnapshot: {
        type: "SHIPPING",
        shipping: { bundleKey: null, returnAddressId: null },
      },
      quantity: 2,
      canceledQuantity: 0,
      activeQuantity: 2,
      unitPrice: 16000,
      discountAmount: 0,
      totalPrice: 32000,
      hold: null,
      autoDecisionDate: null,
      sellerMemo: null,
      orderedAt: at,
      lastChangedAt: at,
      lastChangedType: "ORDER.PAID",
      testPayment: true,
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("order-mail", () => {
  it("ORDER.PAID → 주문 조회(설치 토큰) → Resend 발송, 로그에 주문번호", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        if (url === "https://api.test/v1/orders/ord_1") {
          return Response.json({
            meta: { status: 200, code: "OK", message: "OK", isSuccess: true },
            data: order,
            error: null,
          });
        }
        if (url === "https://api.resend.com/emails") return Response.json({ id: "em_1" });
        return new Response("", { status: 404 });
      }),
    );
    const result = await invoke(
      app,
      createEnvelope({
        kind: "event",
        token: "install-token",
        installation: { storeName: "오늘의옷장", apiBaseUrl: "https://api.test/v1" },
        settings: { to: "ops@example.com", from: "알림 <noreply@example.com>" },
        secrets: { RESEND_API_KEY: "re_test" },
        event: { type: "ORDER.PAID", data: { orderId: "ord_1" } },
      }),
    );
    expect(result.outcome).toBe("OK");
    expect(result.logs).toEqual([{ level: "info", message: "메일 보냄 26100712345678 em_1" }]);
    const apiCall = calls.find((c) => c.url === "https://api.test/v1/orders/ord_1");
    const apiHeaders = new Headers(apiCall?.init?.headers);
    expect(apiHeaders.get("authorization")).toBe("Bearer install-token");
    expect(apiHeaders.get("x-store-id")).toBe("store_local");
    const mailCall = calls.find((c) => c.url === "https://api.resend.com/emails");
    expect(new Headers(mailCall?.init?.headers).get("authorization")).toBe("Bearer re_test");
    expect(JSON.parse(String(mailCall?.init?.body))).toMatchObject({
      from: "알림 <noreply@example.com>",
      to: ["ops@example.com"],
      subject: "[오늘의옷장] 주문 26100712345678 결제 완료 (35,000원)",
    });
  });

  it("설정·비밀 값이 비면 ERROR(재시도 대상)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await invoke(
      app,
      createEnvelope({
        kind: "event",
        token: "t",
        settings: { to: "ops@example.com", from: "" },
        secrets: {},
        event: { type: "ORDER.PAID", data: { orderId: "ord_1" } },
      }),
    );
    expect(result.outcome).toBe("ERROR");
    expect(result.errorMessage).toContain("to·from");
  });
});
