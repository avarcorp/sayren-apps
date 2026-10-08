# sayren-apps

sayren 팀이 만들고 운영하는 [sayren](https://sayren.app) 서드파티 앱입니다. 앱 하나가 폴더 하나이고, 폴더마다 매니페스트(`manifest.json`)·코드·목록 정보를 둡니다.

| 앱 | 설명 |
| --- | --- |
| [order-mail](order-mail) | 결제된 주문을 Resend로 메일 알림합니다 |

## 앱 폴더

```text
order-mail/
  manifest.json      앱 매니페스트(권한·이벤트·설정·비밀 값 이름)
  package.json       @sayren/app 의존성
  src/server.ts      이벤트 함수
  README.md          상점 앱 상세에 보이는 설명
  icon.svg           앱 아이콘
  .env.example       로컬 실행의 설정·비밀 값 예시
```

앱마다 독립 프로젝트입니다. 앱 폴더에서 `pnpm install`하고 `npx sayren app …` 명령을 실행합니다. 만드는 방법은 [앱 만들기 매뉴얼](https://docs.sayren.app/guides/apps-getting-started)을 참고하십시오.
