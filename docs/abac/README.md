# ABAC (Attribute-Based Access Control) ドキュメント

## 概要

ABAC（属性ベースアクセス制御）は、リソース、ユーザー、環境の**属性**に基づいて動的にアクセス権限を評価する権限管理モデルです。このドキュメントコレクションは、ABACの概念理解と実装を学習するための包括的なガイドを提供します。

## ABACの位置づけ

権限管理モデルの進化における位置：

```
Unix/Linux → ACL → RBAC → ABAC → ReBAC
（固定的）  （柔軟） （ロール） （属性） （関係性）
```

- **前身（RBAC）からの発展**: 静的なロール割り当てから動的な属性評価へ
- **次世代（ReBAC）への橋渡し**: 属性評価から関係性グラフへの自然な拡張

## ドキュメント構成

### 📘 [Design Doc](./design-doc.md)
ABACの技術設計と概念の詳細説明
- ABACの核心概念（属性、ポリシー、評価エンジン）
- RBACからの発展と違い
- ポリシー評価エンジンのアーキテクチャ（PEP/PDP/PIP/PAP）
- 実際のABACライブラリの調査結果

### 📋 [ADR（Architecture Decision Records）](./adr/)
設計上の重要な決定事項の記録

1. [ポリシー言語](./adr/001-policy-language.md) - 関数ベース vs DSL
2. [属性システム](./adr/002-attribute-system.md) - 型安全性と構造設計
3. [評価結果](./adr/003-evaluation-result.md) - Tagged Union設計
4. [Deny機能](./adr/004-deny-support.md) - 明示的拒否の必要性
5. [競合解決](./adr/005-conflict-resolution.md) - Deny-Override戦略
6. [API設計](./adr/006-api-design.md) - 最小限のインターフェース

### 💻 [実装例](./examples.md)
TypeScriptによる具体的な実装サンプル
- 基本的なポリシー定義
- 評価エンジンの使用方法
- 複合条件の実装パターン
- 実践的なテストケース

### 🧪 [テスト戦略](./test-strategy.md)
学習効果を重視したテスト設計
- 5段階の段階的学習構成
- ABACとRBACの概念的違いの理解
- Deny-Override戦略の完全理解

## 学習の流れ

### 1. 概念理解
1. [Design Doc](./design-doc.md)でABACの全体像を把握
2. RBACとの違いを理解（ロール中心→属性中心）

### 2. 設計理解
1. [ADR一覧](./adr/README.md)で主要な設計決定を確認
2. 特に[Deny機能](./adr/004-deny-support.md)と[競合解決](./adr/005-conflict-resolution.md)を重点的に理解

### 3. 実装理解
1. [実装例](./examples.md)で具体的なコードを確認
2. [テスト戦略](./test-strategy.md)に沿って段階的に実装

## ABACの核心概念

### 属性カテゴリー
- **Subject属性**: ユーザーID、部門、役職、クリアランスレベル
- **Resource属性**: ドキュメントID、機密レベル、所有者
- **Action属性**: 操作タイプ（read/write）
- **Environment属性**: 時刻、IPアドレス、アクセス元

### ポリシー評価
```typescript
// ABACの基本的な評価フロー
const result = engine.evaluate(
  policy,      // ポリシー定義
  context      // 評価コンテキスト（属性の集合）
);

// 結果はTagged Union
switch(result.decision) {
  case 'permit': // アクセス許可
  case 'deny':   // アクセス拒否  
  case 'not-applicable': // ポリシー非適用
}
```

### Deny-Override戦略
複数のポリシーがマッチした場合の優先順位：
1. **Deny優先**: 一つでもDenyがあれば拒否
2. **セキュリティ重視**: 安全側に倒す設計
3. **業界標準準拠**: XACML標準に整合

## 主な特徴

### 学習用最適化
- **シンプルな実装**: 概念理解に集中
- **段階的な複雑性**: 基本から応用へ
- **実践的なパターン**: 実際のユースケースを反映

### RBACとの主な違い

| 観点 | RBAC | ABAC |
|-----|------|------|
| 中心概念 | ロール | 属性 |
| 権限割当 | 静的（事前定義） | 動的（実行時評価） |
| 柔軟性 | 中程度 | 高い |
| Deny機能 | オプション | 必須 |
| 管理単位 | ロール-権限 | ポリシー |

## 関連リソース

### 前提知識
- [RBACドキュメント](../rbac/) - ロールベースアクセス制御の理解

### 発展的な学習
- [ReBACドキュメント](../rebac/) - 関係性ベースアクセス制御への発展

### 参考実装
- [AWS IAM](https://aws.amazon.com/iam/) - 属性ベースアクセス制御の実例
- [Open Policy Agent (OPA)](https://www.openpolicyagent.org/) - 汎用ポリシーエンジン
- [XACML](http://docs.oasis-open.org/xacml/3.0/) - 業界標準仕様

## まとめ

ABACは、動的で柔軟な権限制御を実現する強力なモデルです。このドキュメントコレクションを通じて：

1. **概念理解**: 属性とポリシーによる動的評価の仕組み
2. **設計理解**: Deny-Override戦略などの重要な設計決定
3. **実装理解**: TypeScriptによる実践的な実装方法

を段階的に学習できます。特に、RBACからの発展としてABACを理解し、さらにReBACへの橋渡しとして位置づけることで、権限管理モデルの進化を体系的に理解できます。