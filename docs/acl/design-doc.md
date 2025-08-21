# ACL (Access Control List) 技術設計書

## 1. 概要

本文書は、権限管理システムの学習を目的としたACL（Access Control List）実装の詳細な技術設計を記述します。ACLは、Unixパーミッションよりも細かい権限制御を実現する重要な権限管理パターンです。

## 2. 背景とコンテキスト

### 2.1 プロジェクトの位置づけ

このACL実装は、権限管理システムの発展を理解するための教育的なプロジェクトの一部です：

1. **Unix権限**: 固定的な3主体（所有者・グループ・その他）への権限設定
2. **ACL（本実装）**: 任意数の主体への個別権限設定
3. **RBAC**: ロールを介した権限管理（今後実装予定）
4. **ABAC**: 属性ベースの動的権限制御（今後実装予定）

### 2.2 設計の題材

社内ドキュメント管理システムを題材として選択：
- **権限の種類**: read（閲覧）とwrite（作成・更新・削除）の2種類
- **実行権限の除外**: ドキュメントには実行概念がないため不要
- **想定シナリオ**: 部門別のアクセス制御、特定ユーザーの明示的な拒否など

### 2.3 認可ライブラリのパターン学習

実際の認可ライブラリ（Spring Security、Casbin、AWS IAM等）で採用されているパターンを学習：
- **Deny優先型**: セキュリティファーストの原則
- **Tagged Union**: 型安全な設計パターン
- **Branded Types**: 権限パターンの誤用防止

## 3. 初期実装案の変遷

### 3.1 初期案（文字列ベース）

当初検討された簡潔な設計：

```typescript
type ACLEntry = {
  subject: string      // "user:alice", "group:sales"
  resource: string     // "doc1", "folder:*"
  action: string       // "read", "write", "delete"
  decision: 'allow' | 'deny'
}
```

### 3.2 初期案の問題点

- 型安全性の欠如（任意の文字列を受け入れる）
- パース処理の必要性
- 拡張性の制限
- 権限パターンの誤用リスク

### 3.3 改善された設計への移行

型安全性と学習効果を重視し、より構造化された設計へ移行しました。

## 4. 最終設計の詳細

### 4.1 中心的な設計決定

#### 4.1.1 Tagged Union方式のエントリー型

Allow/Denyを明確に区別する型設計：

```typescript
type AllowEntry = {
  type: 'allow'
  subject: Subject
  permissions: AllowPermissionBits
}

type DenyEntry = {
  type: 'deny'
  subject: Subject
  permissions: DenyPermissionBits
}

type Entry = AllowEntry | DenyEntry
```

**採用理由**:
- コンパイル時の型チェックによる安全性
- パターンマッチングの容易さ
- 実際の認可システムでも採用されているパターン

#### 4.1.2 Deny優先型の評価方式

すべてのマッチするエントリーを評価し、1つでもDenyがあれば拒否：

```typescript
// 評価ロジックの概要
1. すべてのマッチするエントリーを収集
2. Denyエントリーが1つでもあれば → denied
3. 権限を持つAllowエントリーがあれば → granted
4. どちらもなければ → no-match
```

**採用理由**:
- セキュリティファーストの原則（明示的な拒否を優先）
- エントリーの順序に依存しない予測可能な動作
- Spring Security、AWS IAMなどと同じ動作

#### 4.1.3 Branded Typesによる型安全性

権限パターンの誤用を防ぐ高度な型設計：

```typescript
type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }

// 使用例
const ALLOW_PATTERNS = {
  READ_ONLY: { read: true, write: false } as AllowPermissionBits,
  READ_WRITE: { read: true, write: true } as AllowPermissionBits,
}

const DENY_PATTERNS = {
  DENY_ALL: { read: true, write: true } as DenyPermissionBits,
}
```

**採用理由**:
- 許可用パターンを拒否エントリーで使用するとコンパイルエラー
- 実行時オーバーヘッドなし（_brandは型情報のみ）
- IDEの補完機能との相性が良い

### 4.2 データ構造の設計

#### 4.2.1 Subject（主体）の表現

```typescript
export type Subject = {
  type: 'user' | 'group'
  name: string  // "alice", "developers"など
}
```

**設計判断**:
- 構造化された型による型安全性
- `id`ではなく`name`を使用（学習時の可読性を重視）
- 将来的な拡張（roleなど）が容易

#### 4.2.2 Resource（リソース）の表現

```typescript
export type Resource = {
  name: string      // ドキュメント名
  entries: Entry[]  // ACLエントリーのリスト
}
```

**設計判断**:
- 1インスタンス1リソース（学習目的のシンプル化）
- エントリーの順序は重要でない（Deny優先型のため）

#### 4.2.3 AccessRequest（アクセス要求）

```typescript
export type AccessRequest = {
  subject: {
    user: string      // 要求者のユーザー名
    groups: string[]  // 所属グループのリスト
  }
  action: PermissionAction  // 'read' | 'write'
}
```

#### 4.2.4 AccessDecision（アクセス決定）

```typescript
export type AccessDecision = 
  | { type: 'granted'; allowEntries: Entry[] }
  | { type: 'denied'; denyEntry: Entry; allowEntries: Entry[] }
  | { type: 'no-match' }
```

**設計判断**:
- 3つのシンプルな状態（granted/denied/no-match）
- デバッグ情報を含む（どのエントリーがマッチしたか）
- Tagged Unionによる網羅的な処理の強制

### 4.3 API設計

最小限の3メソッドに絞った設計：

```typescript
export class AccessControlList {
  constructor(resource: Resource): void
  
  // アクセス可否を解決
  resolveAccess(request: AccessRequest): AccessDecision
  
  // エントリーを追加
  addEntry(entry: Entry): void
  
  // エントリーを削除
  removeEntry(subject: Subject): void
}
```

**メソッド名の選定理由**:
- `resolveAccess`: 複数のエントリーから最終決定を「解決」する意味を表現
- 入出力の型名（AccessRequest → AccessDecision）との整合性

## 5. 評価ロジックの詳細

### 5.1 Deny優先型の評価フロー

```typescript
function resolveAccess(request: AccessRequest): AccessDecision {
  // 1. マッチするすべてのエントリーを収集
  const matchedEntries = findMatchingEntries(request)
  
  // 2. Denyエントリーの確認
  const denyEntry = matchedEntries.find(e => e.type === 'deny')
  if (denyEntry) {
    return { 
      type: 'denied', 
      denyEntry,
      allowEntries: matchedEntries.filter(e => e.type === 'allow')
    }
  }
  
  // 3. Allowエントリーの確認
  const allowEntries = matchedEntries.filter(e => e.type === 'allow')
  if (allowEntries.length > 0) {
    return { type: 'granted', allowEntries }
  }
  
  // 4. マッチなし
  return { type: 'no-match' }
}
```

### 5.2 同一主体への重複設定の扱い

実際のシステムでは、同一主体に複数のエントリーが設定される場合があります：

```typescript
// 例：Developersグループへの設定
entries: [
  { type: 'allow', subject: { type: 'group', name: 'developers' }, 
    permissions: { read: false, write: true } },
  { type: 'deny', subject: { type: 'group', name: 'developers' }, 
    permissions: { read: true, write: false } }
]

// 結果：readは拒否、writeも拒否（Deny優先のため）
```

**重複が発生する理由**:
- 管理者の意図的な設定（部分的な許可と拒否）
- 時系列的な変更の蓄積
- 複数管理者による独立した設定

## 6. 実装上の考慮事項

### 6.1 型安全性の確保

TypeScriptの型システムを最大限活用：
- Discriminated Union（判別可能な共用体）
- Branded Types（ブランド型）
- Exhaustiveness checking（網羅性チェック）

### 6.2 パフォーマンス考慮

学習用途のため、パフォーマンスよりも理解しやすさを優先：
- すべてのエントリーを線形探索（O(n)）
- 最適化（インデックス、キャッシュ）は行わない

### 6.3 エラーハンドリング

型システムでエラーを防ぐ設計：
- 不正な値は型レベルで排除
- ランタイムエラーは最小限

## 7. Unix権限との比較

| 観点 | Unix権限 | ACL |
|------|----------|-----|
| 主体の数 | 固定3種類 | 任意数 |
| 権限の粒度 | 粗い | 細かい |
| 拒否の明示 | なし | あり（Deny） |
| API | `hasPermission` | `resolveAccess` |
| 結果の型 | boolean | AccessDecision |

## 8. 学習のポイント

### 8.1 理解すべき概念

1. **エントリーリスト**: 権限設定の基本単位
2. **Allow/Deny**: 明示的な許可と拒否
3. **Deny優先**: セキュリティの基本原則
4. **主体の識別**: ユーザーとグループ

### 8.2 実装を通じて学べること

1. **型安全な設計**: TypeScriptの高度な型機能
2. **認可パターン**: 実際のライブラリで使われる手法
3. **トレードオフ**: シンプルさと機能性のバランス

## 9. 今後の拡張可能性

### 9.1 機能拡張

- ワイルドカードサポート
- 権限の継承
- デフォルト権限
- 条件付きエントリー

### 9.2 他の権限管理方式への発展

- **RBAC**: ロールの概念を追加
- **ABAC**: 属性評価エンジンの追加
- **ReBAC**: 関係性グラフの導入

## 10. まとめ

このACL実装は、権限管理の基本概念を学ぶための教育的な設計です。実際の認可ライブラリで採用されているパターン（Deny優先、Tagged Union、Branded Types）を取り入れつつ、学習に不要な複雑性を排除しました。

重要な設計原則：
- **型安全性**: コンパイル時にエラーを防ぐ
- **シンプルさ**: 3つのメソッドで全機能を実現
- **明確性**: 意図が明確なコード
- **実践的**: 実際のライブラリと同じ動作原理