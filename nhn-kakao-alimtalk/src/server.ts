import { type AppContext, defineApp } from "@sayren/app";

/**
 * NHN Cloud 카카오 알림톡 — 주문 흐름의 어느 단계에든 끼워 넣는 알림 블록 하나(`send`)다.
 * 받을 것은 전부 셀러가 흐름 편집기에서 매개변수로 연결한다. 템플릿 코드, 받는 번호(`buyer.phone`·`shipping.phone` 등 식), 치환 변수(이름·값 쌍).
 * 앱이 스스로 채우거나 주문을 다시 읽는 값은 없다(권한 없음). 주문자·수령인 연락처는 흐름 식 값이다(sayren #143).
 * 앱키·시크릿 키·발신 키·대체 발송은 셀러가 상점 플랫폼 앱 설정에서 채운다(모두 셀러의 NHN Cloud 프로젝트 값).
 */
export const ALIMTALK_API = "https://kakaotalk-bizmessage.api.nhncloudservice.com";
/** 매니페스트 `flow.notifications.send.params`의 변수 쌍 개수(`name1`·`value1` … ) */
export const VARIABLE_PAIRS = 8;
/** 수신자 발송 결과 코드 — 성공, 발송했으나 수신 미확인(성공 불확실, 3일 안에 수신될 수 있다) */
const RESULT_SUCCESS = 1000;
const RESULT_UNCONFIRMED = 3005;
/** API 응답 코드 — 같은 `X-NC-API-IDEMPOTENCY-KEY`를 10분 안에 다시 씀(이미 보낸 호출의 재시도) */
const RESULT_DUPLICATE_KEY = -1005;
/** NHN 응답을 기다리는 상한 — 실행 환경 한도(30초)보다 짧게 둬 결과를 모르는 채 끊기지 않게 한다 */
const FETCH_TIMEOUT_MS = 20_000;
/** 매니페스트 `settings.resend.options` */
const RESEND_OPTIONS = new Set(["template", "off", "SMS", "LMS"]);

interface SendResponse {
  header: { resultCode: number; resultMessage: string; isSuccessful: boolean };
  message?: {
    requestId?: string;
    sendResults?: Array<{ recipientSeq: number; resultCode: number; resultMessage: string }>;
  };
}

/** 연락처 → NHN `recipientNo`(숫자만). `+82 10-1234-5678`·`+82 (0)10-1234-5678` → `01012345678` */
export function recipientNoOf(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("82") || digits.length <= 10) return digits;
  const national = digits.slice(2);
  return national.startsWith("0") ? national : `0${national}`;
}

function setting(ctx: Pick<AppContext, "settings">, key: string): string {
  const value = ctx.settings[key];
  return value == null ? "" : String(value).trim();
}

/** 셀러가 연결한 이름·값 쌍 → NHN `templateParameter`. 이름을 비운 쌍은 건너뛰고, 값을 비운 쌍은 빈 문자열이다 */
export function templateParameterOf(params: Record<string, unknown>): Record<string, string> {
  const parameter: Record<string, string> = {};
  for (let i = 1; i <= VARIABLE_PAIRS; i += 1) {
    const name = params[`name${i}`];
    if (typeof name !== "string" || !name.trim()) continue;
    const value = params[`value${i}`];
    parameter[name.trim()] = value == null ? "" : String(value);
  }
  return parameter;
}

/** 대체 발송 설정 → NHN `resendParameter`. 「템플릿 설정 따름」이면 보내지 않는다(콘솔 설정대로). 모르는 값은 실패시킨다 */
export function resendParameterOf(
  ctx: Pick<AppContext, "settings">,
): { isResend: boolean; resendType?: "SMS" | "LMS"; resendSendNo?: string } | undefined {
  const resend = setting(ctx, "resend") || "template";
  if (!RESEND_OPTIONS.has(resend)) throw new Error(`설정 resend 값이 올바르지 않습니다: ${resend}`);
  if (resend === "template") return undefined;
  if (resend === "off") return { isResend: false };
  const sendNo = setting(ctx, "resendSendNo");
  return {
    isResend: true,
    resendType: resend === "LMS" ? "LMS" : "SMS",
    ...(sendNo ? { resendSendNo: sendNo } : {}),
  };
}

export default defineApp({
  flows: {
    send: async (notice, ctx) => {
      const appKey = setting(ctx, "appKey");
      const secretKey = setting(ctx, "secretKey");
      const senderKey = setting(ctx, "senderKey");
      if (!appKey || !secretKey || !senderKey) {
        throw new Error("설정 appKey·secretKey·senderKey가 비어 있습니다");
      }
      const templateCode = notice.params.templateCode;
      if (typeof templateCode !== "string" || !templateCode.trim()) {
        throw new Error("매개변수 templateCode가 비어 있습니다");
      }
      const resendParameter = resendParameterOf(ctx);
      // 받는 번호는 셀러가 식으로 연결한다(`buyer.phone` 주문자, `shipping.phone` 수령인). 비면 보내지 않고 실패로 남긴다
      const direct = notice.params.recipientNo;
      const recipientNo = direct == null ? "" : recipientNoOf(String(direct));
      if (!recipientNo) throw new Error("매개변수 recipientNo(받는 번호)가 비어 있습니다");

      const response = await fetch(
        `${ALIMTALK_API}/alimtalk/v2.3/appkeys/${encodeURIComponent(appKey)}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "x-secret-key": secretKey,
            // 같은 호출의 재시도는 같은 invocationId로 온다. NHN이 10분간 같은 키를 막아 두 번 보내지 않는다(아래 -1005)
            "x-nc-api-idempotency-key": ctx.invocationId,
          },
          body: JSON.stringify({
            senderKey,
            templateCode: templateCode.trim(),
            // 대체 발송은 수신자 항목 안에 둔다(NHN v2.3 요청 형식)
            recipientList: [
              {
                recipientNo,
                templateParameter: templateParameterOf(notice.params),
                ...(resendParameter ? { resendParameter } : {}),
              },
            ],
          }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        throw new Error(`NHN Cloud ${response.status}: ${(await response.text()).slice(0, 200)}`);
      }
      const body = (await response.json()) as SendResponse;
      if (!body.header.isSuccessful) {
        // 같은 호출의 재시도 — 앞선 시도가 이미 접수됐다. 실패로 두면 재시도가 이어지다 앱이 정지된다
        if (body.header.resultCode === RESULT_DUPLICATE_KEY) {
          ctx.log.info("알림톡 이미 보냄(재시도)", notice.state, templateCode);
          return;
        }
        throw new Error(`NHN Cloud ${body.header.resultCode}: ${body.header.resultMessage}`);
      }
      const result = body.message?.sendResults?.[0];
      const requestId = body.message?.requestId ?? "";
      if (result?.resultCode === RESULT_UNCONFIRMED) {
        ctx.log.info("알림톡 보냄(수신 미확인)", notice.state, templateCode, requestId);
        return;
      }
      // 수신자 결과 실패(전화번호 오류·수신 차단 등)는 요청이 접수된 뒤의 결과라 다시 보내지 않고 기록만 남긴다
      if (result && result.resultCode !== RESULT_SUCCESS) {
        ctx.log.warn(
          "알림톡 수신 실패",
          notice.state,
          templateCode,
          result.resultCode,
          result.resultMessage,
        );
        return;
      }
      ctx.log.info("알림톡 보냄", notice.state, templateCode, requestId);
    },
  },
});
