# ACL (Access Control List) ドキュメント

## 概要

ACL（Access Control List）は、リソースへのアクセス権限を細かく制御するための権限管理システムです。Unixパーミッションの固定的な3主体（所有者・グループ・その他）から、任意数の主体（ユーザー・グループ）への個別権限設定へと発展した方式です。

このドキュメントセットでは、学習目的に最適化されたACL実装の設計と実装例を提供します。

## Unix権限からACLへの発展

### Unix権限の制限
- **固定的な主体**: 所有者、グループ、その他の3種類のみ
- **粗い粒度**: 3種類の主体それぞれに対する権限設定
- **拒否の非明示**: 明示的な拒否設定ができない

### ACLによる改善
- **任意数の主体**: 必要なだけユーザーやグループを追加可能
- **細かい粒度**: 個別のユーザー・グループごとに権限設定
- **明示的な拒否**: Allow/Denyを明確に区別

## 学習のポイント

このACL実装を通じて、以下の重要な概念を学習できます：

1. **エントリーリスト方式**: 権限設定を個別のエントリーとして管理
2. **Deny優先型評価**: セキュリティファーストの原則
3. **型安全な設計**: TypeScriptの高度な型機能（Tagged Union、Branded Types）
4. **実践的なパターン**: Spring Security、AWS IAMなどで採用されている手法

## ドキュメント構成

### 📘 [技術設計書](./design-doc.md)
ACL実装の詳細な技術設計を記述。初期実装案からの変遷、最終設計の詳細、実装上の考慮事項などを網羅的に説明。

### 🔧 [実装例とコードサンプル](./examples.md)
完全な型定義、クラス実装、使用例を提供。Branded Typesによる型安全性の例や、Deny優先型の動作例を含む。

### 📋 [アーキテクチャ決定記録（ADR）](./adr/)
重要な設計決定を個別のADRとして文書化：

- [ADR一覧と要約](./adr/README.md)
- [001: エントリー型 - Tagged Union方式](./adr/001-entry-type.md)
- [002: 評価方式 - Deny優先型](./adr/002-evaluation-mode.md)
- [003: 権限パターン - Branded Types](./adr/003-permission-patterns.md)
- [004: 主体設計 - 構造化型とname](./adr/004-subject-design.md)
- [005: リソース範囲 - 1インスタンス1リソース](./adr/005-resource-scope.md)
- [006: API設計 - 最小限の3メソッド](./adr/006-api-design.md)

## 主要な設計決定

### 1. Tagged Union方式のエントリー型
Allow/Denyエントリーを型レベルで明確に区別し、コンパイル時の安全性を確保。

### 2. Deny優先型の評価
セキュリティの原則に従い、明示的な拒否を常に優先。Spring SecurityやAWS IAMと同じ動作。

### 3. Branded Typesによる型安全性
許可用パターンと拒否用パターンを型レベルで区別し、誤用を防止。

### 4. 最小限のAPI
3つのメソッド（`resolveAccess`、`addEntry`、`removeEntry`）でACLの全機能を実現。

## 実装の特徴

- **型安全**: TypeScriptの型システムを最大限活用
- **シンプル**: 学習に不要な複雑性を排除
- **実践的**: 実際の認可ライブラリと同じ動作原理
- **教育的**: 各設計決定の理由を明確に文書化

## クイックスタート

```typescript
import { AccessControlList, ALLOW_PATTERNS, DENY_PATTERNS } from './acl'

// ACLの作成
const acl = new AccessControlList({
  name: 'document.doc',
  entries: [
    {
      type: 'allow',
      subject: { type: 'group', name: 'editors' },
      permissions: ALLOW_PATTERNS.READ_WRITE
    },
    {
      type: 'deny',
      subject: { type: 'user', name: 'guest' },
      permissions: DENY_PATTERNS.ALL
    }
  ]
})

// アクセスチェック
const decision = acl.resolveAccess({
  subject: { user: 'alice', groups: ['editors'] },
  action: 'write'
})

// 結果の処理
if (decision.type === 'granted') {
  console.log('アクセス許可')
} else if (decision.type === 'denied') {
  console.log('アクセス拒否')
} else {
  console.log('権限設定なし')
}
```

## 他の権限管理方式との関係

```
Unix権限
  ↓ 固定的な3主体から任意数の主体へ
ACL（このドキュメント）
  ↓ 個別権限設定からロールベースへ
RBAC
  ↓ 静的なロールから動的な属性評価へ
ABAC
  ↓ 属性から関係性ベースへ
ReBAC
```

## 参考資料

- Spring Security Documentation
- AWS IAM Policy Evaluation Logic
- Casbin ACL Model
- POSIX ACL Specification

## 関連プロジェクト

- [Unix権限実装](../unix-permission/)
- [RBAC実装](../rbac/)（作成予定）
- [ABAC実装](../abac/)（作成予定）
- [ReBAC実装](../rebac/)（作成予定）