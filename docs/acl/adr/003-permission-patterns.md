# ADR-003: 権限パターンの型安全性 - Branded Typesの採用

## ステータス
- **日付**: 2025-08-21
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

Tagged Union方式でEntry型を定義した結果、新たな課題が生じた。許可用のパターン（例：READ_ONLY）を拒否エントリーで使用したり、拒否用のパターン（例：DENY_ALL）を許可エントリーで使用すると、意図と逆の結果になる可能性がある。

型システムでこの誤用を防ぎ、開発者が安全に権限パターンを使用できる仕組みが必要である。

## 検討したオプション

### オプション1: ヘルパー関数方式
```typescript
function createAllowEntry(subject: Subject, pattern: AllowPattern): Entry
function createDenyEntry(subject: Subject, pattern: DenyPattern): Entry
```

- **利点**:
  - 実装がシンプル
  - 従来のパターンで理解しやすい

- **欠点**:
  - ヘルパー関数を使わない場合、依然として誤用が可能
  - 開発者がヘルパー関数の使用を忘れる可能性
  - 型レベルでの完全な制約ができない

### オプション2: Branded Types方式
```typescript
type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }
```

- **利点**:
  - 型レベルで完全に制約（コンパイル時にエラー検出）
  - ヘルパー関数なしでも型安全
  - 実行時のオーバーヘッドなし（_brandは実行時に存在しない）
  - IDEが適切な候補を提示

- **欠点**:
  - TypeScriptの高度な機能で、初学者には理解が難しい可能性
  - 型定義がやや複雑になる

### オプション3: 単純な型分離
```typescript
type AllowPermissions = { read?: true; write?: true }
type DenyPermissions = { read?: false; write?: false }
```

- **利点**:
  - シンプルで理解しやすい

- **欠点**:
  - 権限の表現力が制限される
  - 既存のPermissionBits型との互換性がない

## 決定

**Branded Types方式（オプション2）**を採用する。

型安全性を最優先し、コンパイル時に誤用を防ぐことで、実行時エラーを未然に防ぐ。また、実際の型安全なライブラリで使用されているパターンを学習する良い機会となる。

### 実装方針

```typescript
// Branded Typesの定義
export type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
export type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }

// パターン定数の定義
export const ALLOW_PATTERNS = {
  READ_ONLY: { read: true, write: false } as AllowPermissionBits,
  WRITE_ONLY: { read: false, write: true } as AllowPermissionBits,
  READ_WRITE: { read: true, write: true } as AllowPermissionBits,
}

export const DENY_PATTERNS = {
  DENY_READ: { read: true, write: false } as DenyPermissionBits,
  DENY_WRITE: { read: false, write: true } as DenyPermissionBits,
  DENY_ALL: { read: true, write: true } as DenyPermissionBits,
}
```

## 結果

### 利点
- 完全な型安全性により、権限パターンの誤用を防止
- 実行時パフォーマンスへの影響なし
- IDEのインテリセンスが改善され、開発者体験が向上
- TypeScriptの高度な型機能を学習する機会

### トレードオフ
- 型定義の複雑性が増す
- 初学者にはBranded Typesの概念が理解しにくい可能性

### 今後の課題
- パターン定数の拡張方法のドキュメント化
- カスタムパターン作成時の型付けヘルパーの提供検討