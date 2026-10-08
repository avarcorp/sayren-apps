/**
 * 커밋 메시지 규칙 — husky `commit-msg`가 커밋마다 검사한다.
 *
 *   type(scope): 한국어 제목
 *
 * scope는 앱 handle(`order-mail` 등)이나 레포 전체(`repo`)다. 제목·본문이 한국어라 대소문자·마침표·줄 길이 규칙은 끈다.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "chore",
        "refactor",
        "test",
        "style",
        "ci",
        "build",
        "perf",
        "revert",
      ],
    ],
    "header-max-length": [2, "always", 100],
    "subject-case": [0],
    "subject-full-stop": [0],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [1, "always"],
  },
};
