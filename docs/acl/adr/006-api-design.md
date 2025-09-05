# ADR-006: API設計 - 最小限の3メソッド

## ステータス
- **日付**: 2025-08-21
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ACLシステムのAPIをどのように設計するかは、学習のしやすさと実装の複雑性に直接影響する。学習目的のプロジェクトとして、ACLの本質的な機能に集中できる最小限のAPIが必要である。

また、メソッド名は処理内容を正確に表現し、型システムと整合性を持つべきである。

## 検討したオプション

### メソッド名の選択

#### オプション1: checkAccess
```typescript
checkAccess(request: AccessRequest): AccessDecision
```

- **利点**: 汎用的で理解しやすい
- **欠点**: 具体的な処理内容が不明確

#### オプション2: isAllowed
```typescript
isAllowed(request: AccessRequest): AccessDecision
```

- **利点**: ACL系で標準的な名前
- **欠点**: booleanを返す印象を与える（実際は詳細オブジェクト）

#### オプション3: resolveAccess
```typescript
resolveAccess(request: AccessRequest): AccessDecision
```

- **利点**: 
  - 複数のAllow/Denyエントリーから最終決定を「解決」する意味が明確
  - 入出力の型名（AccessRequest → AccessDecision）と整合
  - 返り値が詳細な決定情報であることを示唆

- **欠点**: やや長い名前

### API範囲の選択

#### オプション1: 豊富なAPI
```typescript
// 基本操作
resolveAccess(request): AccessDecision
addEntry(entry): void
removeEntry(subject): void
clearEntries(): void

// クエリメソッド
getEntries(): Entry[]
hasEntry(subject): boolean

// ヘルパーメソッド
createAllowEntry(...): Entry
createDenyEntry(...): Entry
```

- **利点**: 機能が充実
- **欠点**: 学習時に本質的でない機能に気を取られる

#### オプション2: 最小限のAPI
```typescript
resolveAccess(request: AccessRequest): AccessDecision
addEntry(entry: Entry): void
removeEntry(subject: Subject): void
```

- **利点**: 
  - ACLの本質（エントリー管理とアクセス判定）に集中
  - コードが簡潔で理解しやすい
  - テストが書きやすい

- **欠点**: 補助的な機能は自分で実装する必要がある

## 決定

**メソッド名は`resolveAccess`**を採用し、**最小限の3メソッドAPI**を採用する。

### 採用するAPI

```typescript
export class AccessControlList {
  constructor(resource: Resource): void
  
  // アクセス可否を解決（Deny優先型評価）
  resolveAccess(request: AccessRequest): AccessDecision
  
  // エントリーを追加
  addEntry(entry: Entry): void
  
  // エントリーを削除
  removeEntry(subject: Subject): void
}
```

### 意図的に除外した機能

- **クエリメソッド群**: デバッグはテストコードで行う
- **エントリー作成ヘルパー**: 型を直接扱うことで理解を深める
- **clearEntries**: 学習段階では使用頻度が低い
- **バリデーション機能**: 型システムで保証

## 結果

### 利点
- 3つのメソッドのみで、ACLの全機能を実現
- 初学者が本質的な機能に集中できる
- メソッド名が処理内容を正確に表現
- コードレビューとテストが簡単

### トレードオフ
- 補助的な機能は利用者側で実装が必要
- エントリーの一括操作ができない

### 今後の課題
- 必要に応じてユーティリティ関数を別途提供
- パフォーマンスが必要な場合のバッチ操作の検討