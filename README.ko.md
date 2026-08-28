# WebAbacus

[English](README.md) | **한국어** | [日本語](README.ja.md)

브라우저에서 마우스와 터치 모두 자연스럽게 동작하는, 자릿수를 자유롭게 바꿀 수 있는 주판(소로반)입니다.

🔗 **라이브 데모:** https://saramjh.github.io/webabacus/

## 특징

- 자릿수(1~21) 즉시 변경 — 자릿수를 바꿔도 이미 놓인 값은 그대로 유지됨
- 현대식 1+4 구슬 구조 (윗알 1개=5, 아랫알 4개=1×4)
- Pointer Events 기반으로 마우스·터치·키보드를 하나의 로직으로 지원 — 드래그는 항상 손을 댄 그 구슬과 가로대 사이의 구슬만 움직이며, 커서가 스쳐 지나가는 다른 구슬은 절대 반응하지 않음
- 실제 주판처럼 가로대를 좌우로 쫙 그으면 전체가 애니메이션과 함께 한 번에 초기화됨
- 실제 소로반처럼 3자리마다 자릿점 표시
- 어떤 화면 크기·가로세로 방향에서도 잘리지 않도록 자동으로 맞춰짐
- 텍스트 라벨 대신 아이콘 기반 컨트롤을 사용해 UI에 언어 장벽이 없음

## 기술 스택

- TypeScript
- [Vite](https://vitejs.dev/)
- 핵심 로직 테스트용 [Vitest](https://vitest.dev/)
- UI 프레임워크 없이 순수 DOM으로 구현

## 프로젝트 구조

```
src/
  core/         # 주판 상태·연산·검증 — DOM/프레임워크에 비의존적이며 단위 테스트로 검증됨
    abacus.ts
    abacus.test.ts
    types.ts
  ui/
    renderer.ts # DOM 렌더링 및 포인터/터치/키보드 상호작용
  main.ts       # 코어 로직과 UI를 연결
  style.css
```

코어(`src/core/`)는 DOM에 전혀 의존하지 않으므로 다른 UI 위에서도 그대로 재사용할 수 있습니다.

## 시작하기

```bash
npm install
npm run dev       # 개발 서버 실행
npm run build     # 타입 체크 후 dist/에 프로덕션 빌드 생성
npm run test      # 코어 로직 테스트 실행
npm run preview   # 프로덕션 빌드 로컬 미리보기
```

## 배포

`main` 브랜치에 push하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)의 GitHub Actions 워크플로우가 프로젝트를 빌드하고 `dist/`를 GitHub Pages에 배포합니다.

최초 1회 설정: 저장소의 **Settings → Pages**에서 소스를 **GitHub Actions**로 지정해야 합니다.
