# 주문 메일 알림

상점에서 주문이 결제되면 주문 정보를 읽어 지정한 주소로 메일을 보냅니다. 메일은 [Resend](https://resend.com)로 발송합니다.

## 보내는 내용

- 주문번호와 결제 금액
- 주문자 이름과 이메일
- 주문 상품과 수량

## 설정

설치할 때 두 값을 채웁니다. 비어 있으면 알림을 보내지 않습니다.

1. **받는 주소** 알림을 받을 메일 주소
2. **보내는 주소** Resend에서 검증한 도메인의 주소. 예: `주문 알림 <no-reply@example.com>`

## 메일 예시

```
[오늘의옷장] 주문 26100760915403 결제 완료 (3,000원)

주문자: 김구매 <buyer@example.com>
결제 금액: 3,000원

주문 상품
- [테스트] 콜라 1.25L × 1
```

## 앱 정보

sayren 서드파티 앱 예제(`order-mail`)입니다. 아래는 이 앱을 직접 배포하는 개발자용 안내입니다.

| 항목 | 값 |
| --- | --- |
| handle | `order-mail` |
| 권한 | `order:r` |
| 외부 호스트 | `api.resend.com` |
| 이벤트 | `ORDER.PAID` |
| 설정 | `to`(받는 주소, 필수), `from`(보내는 주소, 필수) |
| 비밀 값 | `RESEND_API_KEY` |
| 목록 정보 | `icon.svg`, 이 README |

## 개발자용 — 배포

```bash
npm install
npx sayren login                                  # 또는 SAYREN_APP_KEY=sak_… (developer.sayren.app › 앱 › 배포 키)
npx sayren app deploy -m "첫 버전"                # 비밀 값 이름은 올린 버전의 매니페스트로 확인하므로 배포가 먼저입니다
printf '%s' "$RESEND_API_KEY" | npx sayren app secret put RESEND_API_KEY
npx sayren app release 1
```

[developer.sayren.app](https://developer.sayren.app)에서 **내 상점에 설치**를 누르고 상점을 고른 뒤, 상점 플랫폼 **앱 › 주문 메일 알림 › 설정**에
받는 주소·보내는 주소를 채웁니다. 자세한 순서는 [앱 만들기 매뉴얼](https://docs.sayren.app/guides/apps-getting-started)을 참고하십시오.

## 개발자용 — 로컬 실행

```bash
cp .env.example .env    # to·from·RESEND_API_KEY
npx sayren app dev --store <storeId>
npx sayren app trigger ORDER.PAID --order <orderId>
```
