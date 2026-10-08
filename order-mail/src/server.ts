import { type AppContext, defineApp } from "@sayren/app";

/**
 * 주문 메일 알림 — `ORDER.PAID`가 오면 주문을 읽어(설치된 상점의 관리 API) Resend로 메일을 보낸다.
 * 설정 `to`·`from`은 셀러가 상점 플랫폼 앱 설정에서 채우고, 비밀 값 `RESEND_API_KEY`는 개발자가 `sayren app secret put`으로 넣는다.
 */
/** `ctx.api.orders.get`이 돌려주는 주문(@sayren/store-sdk `Order`) — 필드를 손으로 다시 적지 않는다 */
type Order = Awaited<ReturnType<AppContext["api"]["orders"]["get"]>>;

function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function mailOf(order: Order, storeName: string): { subject: string; text: string } {
  const total = order.payment.totalAmount;
  const lines = order.items.map((item) => {
    const option = item.optionName ? ` (${item.optionName})` : "";
    return `- ${item.productName}${option} × ${item.quantity}`;
  });
  return {
    subject: `[${storeName}] 주문 ${order.orderNo} 결제 완료 (${won(total)})`,
    text: [
      `${storeName}에 새 주문이 결제되었습니다.`,
      "",
      `주문번호: ${order.orderNo}`,
      `주문자: ${order.orderer.name}${order.orderer.email ? ` <${order.orderer.email}>` : ""}`,
      `결제 금액: ${won(total)}`,
      `주문 시각: ${order.orderedAt}`,
      ...(lines.length ? ["", "주문 상품", ...lines] : []),
    ].join("\n"),
  };
}

export default defineApp({
  events: {
    "ORDER.PAID": async (event, ctx) => {
      const { orderId } = event.data;
      const to = String(ctx.settings.to ?? "");
      const from = String(ctx.settings.from ?? "");
      const apiKey = ctx.secrets.RESEND_API_KEY;
      if (!to || !from) throw new Error("설정 to·from이 비어 있습니다");
      if (!apiKey) throw new Error("비밀 값 RESEND_API_KEY가 없습니다");
      const order = await ctx.api.orders.get(orderId);
      const mail = mailOf(order, ctx.installation.storeName);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text }),
      });
      if (!response.ok) {
        throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
      const { id } = (await response.json()) as { id?: string };
      ctx.log.info("메일 보냄", order.orderNo, id ?? "");
    },
  },
});
