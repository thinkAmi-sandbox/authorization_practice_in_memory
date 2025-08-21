# ADR-001: エントリー型の設計 - Tagged Union方式の採用

## ステータス
- **日付**: 2025-08-21
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ACLシステムにおいて、アクセス許可（Allow）と拒否（Deny）の両方のエントリーをサポートする必要がある。この2種類のエントリーを型安全に表現し、実行時のエラーを防ぐための設計が必要である。

学習目的のプロジェクトとして、実際の認可ライブラリで採用されているパターンを学び、その利点を理解することも重要である。

## 検討したオプション

### オプション1: denyフィールド方式
```typescript
type Entry = {
  subject: Subject
  permissions: PermissionBits
  deny: boolean  // true for deny, false for allow
}
```

- **利点**: 
  - シンプルな構造
  - 1つの型定義で済む
  - メモリ効率が良い

- **欠点**: 
  - 意図が不明確（denyフラグの意味を理解する必要がある）
  - 型レベルでAllowとDenyを区別できない
  - 条件分岐時にdenyフラグのチェックを忘れる可能性

### オプション2: Tagged Union方式
```typescript
type AllowEntry = {
  type: 'allow'
  subject: Subject
  permissions: PermissionBits
}

type DenyEntry = {
  type: 'deny'
  subject: Subject
  permissions: PermissionBits
}

type Entry = AllowEntry | DenyEntry
```

- **利点**: 
  - 型安全（TypeScriptの型システムで区別可能）
  - 意図が明確（typeフィールドで明示）
  - パターンマッチングが使いやすい
  - 実際の認可ライブラリ（AWS IAM、Azure RBAC等）でも採用

- **欠点**: 
  - 型定義がやや冗長
  - わずかにメモリオーバーヘッドがある（typeフィールド分）

## 決定

**Tagged Union方式（オプション2）**を採用する。

型安全性と意図の明確さを重視し、実際の認可システムでも広く採用されているパターンを学習する観点から、Tagged Union方式を選択した。

## 結果

### 利点
- コンパイル時の型チェックにより、AllowとDenyの混同を防げる
- switch文やif文でのパターンマッチングが直感的
- 将来的に新しいエントリータイプを追加する場合も拡張しやすい
- 実際の認可ライブラリのパターンを学習できる

### トレードオフ
- 型定義が2つ必要になる
- typeフィールドの分だけメモリ使用量が増える（実用上は無視できる程度）

### 今後の課題
- エントリータイプが増えた場合の管理方法
- 型ガードヘルパー関数の実装が推奨される