# WebAbacus

[English](README.md) | [한국어](README.ko.md) | **日本語**

マウスにもタッチにも自然に対応した、桁数を自由に変更できるそろばん(算盤)アプリです。

🔗 **ライブデモ:** https://saramjh.github.io/webabacus/

## 特徴

- 桁数(1〜21)をその場で変更可能 — 桁数を変えても、すでに入力した値はそのまま保持されます
- 現代式の1+4の珠構成(五珠1個=5、一珠4個=1×4)
- Pointer Events APIによりマウス・タッチ・キーボードを同一ロジックで統一 — ドラッグは常に最初に触れた珠と梁(はり)の間の珠だけを動かし、カーソルが通り過ぎただけの珠は決して反応しません
- 実物のそろばんのように梁を左右に払うジェスチャーで、全体を一度にアニメーション付きでリセット
- 実物のそろばんと同様、3桁ごとに位取り点を表示
- どんな画面サイズ・画面の向きでも、はみ出さずに自動で収まります
- テキストラベルの代わりにアイコンでUIを構成しているため、言語の壁がありません

## 技術スタック

- TypeScript
- [Vite](https://vitejs.dev/)
- コアロジックのテストに[Vitest](https://vitest.dev/)
- UIフレームワークなし — プレーンなDOM実装

## プロジェクト構成

```
src/
  core/         # そろばんの状態・演算・検証 — DOM/フレームワークに非依存、ユニットテスト済み
    abacus.ts
    abacus.test.ts
    types.ts
  ui/
    renderer.ts # DOM描画とポインタ/タッチ/キーボード操作
  main.ts       # コアロジックとUIを接続
  style.css
```

コア部分(`src/core/`)はDOMに一切依存しないため、別のUI実装の上でもそのまま再利用できます。

## セットアップ

```bash
npm install
npm run dev       # 開発サーバーを起動
npm run build     # 型チェックの上、dist/ に本番ビルドを生成
npm run test      # コアロジックのテストを実行
npm run preview   # 本番ビルドをローカルでプレビュー
```

## デプロイ

`main`ブランチへのpushをトリガーに[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)のGitHub Actionsワークフローがビルドを実行し、`dist/`をGitHub Pagesに公開します。

初回のみ: リポジトリの**Settings → Pages**でソースを**GitHub Actions**に設定してください。
