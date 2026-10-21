# NHN Cloud 카카오 알림톡

주문 흐름의 어느 단계에든 끼워 넣는 알림 블록입니다. 흐름 편집기에서 알림 채널 「앱 › NHN Cloud 카카오 알림톡 › 알림톡 보내기」를 고르고, 템플릿 코드·받는 사람·치환 변수를 매개변수로 연결하면 그 단계가 지나갈 때 [NHN Cloud KakaoTalk Bizmessage](https://www.nhncloud.com/kr/service/notification/kakaotalk-bizmessage)로 알림톡이 나갑니다. 앱이 스스로 채우는 값은 없습니다. 무엇을 보낼지는 전부 흐름에서 정합니다.

## 준비

1. NHN Cloud 콘솔에서 KakaoTalk Bizmessage 서비스를 켜고 카카오톡 채널 발신 프로필을 등록합니다.
2. 보낼 알림톡 템플릿을 등록하고 카카오 검수 승인을 받습니다. 템플릿의 치환 변수 이름(`#{고객명}` 등)은 자유롭게 정합니다.
3. 상점 플랫폼 **앱 › NHN Cloud 카카오 알림톡 › 설정**에 앱키·시크릿 키·발신 키를 채웁니다.

## 설정

| 설정 | 값 |
| --- | --- |
| 앱키 · 시크릿 키 | NHN Cloud 콘솔 › KakaoTalk Bizmessage › URL & Appkey |
| 발신 키 | 카카오톡 채널 발신 프로필의 발신 키(40자) |
| SMS 대체 발송 | 알림톡 실패 시 문자 대체 발송. 「템플릿 설정 따름」(기본)은 NHN Cloud 콘솔의 템플릿 설정대로, 「끔」은 보내지 않음, SMS·LMS는 그 방식으로 보냅니다 |
| 대체 발송 발신번호 | NHN Cloud SMS 서비스에 등록한 발신번호. 비우면 템플릿 설정을 따릅니다 |

대체 발송 문구는 NHN Cloud가 알림톡 본문으로 만듭니다(본문 + 웹 링크 버튼 이름·모바일 링크).

## 흐름에 끼워 넣기

연결선 실행 또는 알림 노드에 알림을 더하고 채널에서 이 앱의 **알림톡 보내기**를 고른 뒤 매개변수를 연결합니다. 값은 [흐름의 다른 식](https://docs.sayren.io/guides/order-flows)과 같은 문법입니다.

| 매개변수 | 넣는 값 | 예 |
| --- | --- | --- |
| 템플릿 코드 | 승인된 템플릿 코드(필수) | `"ORDER_READY"` |
| 받는 사람 | `"orderer"`(주문자, 기본) 또는 `"receiver"`(배송지 수령인). 앱이 주문의 연락처를 읽습니다 | `"receiver"` |
| 받는 번호(직접 지정) | 번호를 식으로 직접 넣을 때. 받는 사람보다 우선합니다 | `item.inputs.guardianPhone` |
| 변수 n 이름 | 템플릿 치환 변수 이름 | `"픽업시각"` |
| 변수 n 값 | 그 변수에 넣을 값 | `string(item.fields.readyAt)` |

- 변수 쌍은 8개까지입니다. 이름을 비운 쌍은 보내지 않고, 값을 비운 쌍은 빈 문자열로 보냅니다.
- 값은 문자열이어야 하므로 숫자·일시는 `string(...)`으로 바꿉니다.
- 국가 번호(`+82`)가 붙은 번호는 `0`으로 시작하는 국내 번호로 바꿔 보냅니다.

## 결과

- NHN Cloud가 요청을 거절하면(앱키·시크릿 키 오류, 템플릿 없음, 변수 누락 등) 실행이 실패로 남고 다시 시도합니다. 같은 호출의 재시도는 NHN Cloud 중복 방지 키로 두 번 보내지 않습니다.
- 수신자 결과 실패(전화번호 오류, 카카오톡 미사용, 수신 차단 등)는 요청이 접수된 뒤의 결과라 다시 보내지 않고 실행 기록에 경고로 남깁니다. 「발송했으나 수신 미확인」(3일 안에 수신될 수 있음)은 보낸 것으로 기록합니다.
- 받는 사람 값이 `"orderer"`·`"receiver"`가 아니거나 대체 발송 설정 값이 올바르지 않으면 보내지 않고 실패로 남깁니다. 잘못 연결한 알림이 조용히 주문자에게 가지 않게 하기 위해서입니다.

## 앱 정보

sayren 서드파티 앱(`nhn-kakao-alimtalk`)입니다. 아래는 이 앱을 직접 배포하는 개발자용 안내입니다.

| 항목 | 값 |
| --- | --- |
| handle | `nhn-kakao-alimtalk` |
| 권한 | `order:r`(받는 사람이 주문자·수령인일 때 연락처) |
| 외부 호스트 | `kakaotalk-bizmessage.api.nhncloudservice.com` |
| 흐름 알림 | `send`(알림톡 보내기) — `templateCode`(필수), `recipient`, `recipientNo`, `name1`·`value1` … `name8`·`value8` |
| 설정 | `appKey`(필수), `secretKey`(필수, 비밀), `senderKey`(필수), `resend`(select), `resendSendNo` |
| 비밀 값 | 없음(모두 셀러 설정) |
| 목록 정보 | `icon.svg`, 이 README |

## 개발자용 — 배포

```bash
npm install
npx sayren login                                  # 또는 SAYREN_APP_KEY=sak_… (developer.sayren.io › 앱 › 배포 키)
npx sayren app deploy -m "첫 버전"
npx sayren app release 1
```

[developer.sayren.io](https://developer.sayren.io)에서 **내 상점에 설치**를 누르고 상점을 고른 뒤, 상점 플랫폼 **앱 › NHN Cloud 카카오 알림톡 › 설정**에
앱키·시크릿 키·발신 키를 채웁니다. 자세한 순서는 [앱 만들기 매뉴얼](https://docs.sayren.io/guides/apps-getting-started)을 참고하십시오.

## 개발자용 — 로컬 실행

```bash
cp .env.example .env    # appKey·secretKey·senderKey
npx sayren app dev --store <storeId>
npx sayren app trigger --flow send --data '{"orderId":"<orderId>","orderItemIds":["<orderItemId>"],"params":{"templateCode":"ORDER_READY","recipientNo":"01012345678","name1":"픽업시각","value1":"18:00"}}'
```
