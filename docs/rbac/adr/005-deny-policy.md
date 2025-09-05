# ADR-005: Deny機能 - 実装しない決定と理由

## ステータス
- **日付**: 2025-08-12
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ACL（Access Control List）では、明示的なDenyエントリーを持つことが一般的である。RBACシステムにおいて、同様のDeny機能を実装すべきかどうかは重要な設計判断となる。

## ACLとRBACの根本的な違い

### ACL: リストベースのAllow/Deny
```typescript
// ACLの例
[
  { principal: "alice", permission: "read", effect: "allow" },
  { principal: "bob", permission: "write", effect: "deny" },
  { principal: "editor-group", permission: "write", effect: "allow" }
]
```
- 各エントリーが独立した権限設定
- Allow/Denyの明示的な指定が自然

### RBAC: ポジティブ権限モデル
```typescript
// RBACの例
const ROLES = {
  viewer: { permissions: { read: true, write: false } },
  editor: { permissions: { read: true, write: true } }
}
```
- ロールは「できること」の集合を定義
- 権限がない = false（暗黙的なDeny）

## RBACにDenyが不要な理由

### 1. 組織構造の自然なマッピング
- ロールは職務や責任を表現
- 「営業職は販売データを見られる」という肯定的な定義が自然
- 「営業職は人事データを見られない」というDenyは不要（単に権限を付与しない）

### 2. 管理の簡素化
- Denyがないことで権限の把握が容易
- 「このロールは何ができるか」が明確
- Allow/Denyの優先順位を考える必要がない

### 3. 職務分離の原則（Separation of Duties）
- RBACの本質は適切な権限の分離
- 必要な権限のみを付与する最小権限の原則
- Denyではなく、適切なロール設計で実現

## 業界ライブラリの調査結果

### Denyをサポートしない
- **Spring Security**: ロールは肯定的な権限のみ
- **Pundit**: ポリシーは許可のみを定義
- **CanCanCan**: 能力（ability）は基本的に許可

### 限定的なDenyサポート
- **Casbin**: `deny`ポリシーをサポートするが、複雑性が増す
- **CASL**: `cannot`で禁止を定義可能だが、推奨されない

### Denyの代替実装
- **AWS IAM**: 明示的なDenyをサポート（ただしRBACよりもABACに近い）
- **Keycloak**: ネガティブロールという概念はあるが、複雑で使用は限定的

## 検討したオプション

### オプション1: Denyなし（ポジティブモデルのみ）
```typescript
type Role = {
  name: string
  permissions: PermissionBits  // true/falseのみ
}
```
- 利点：シンプル、理解しやすい、管理が容易
- 欠点：例外的な制限を表現しづらい

### オプション2: 明示的なDenyサポート
```typescript
type Role = {
  name: string
  allows: PermissionBits
  denies: PermissionBits  // 明示的な禁止
}
```
- 利点：きめ細かい制御が可能
- 欠点：複雑性が増す、Allow/Denyの優先順位問題

## 決定

**Denyを実装しない**。RBACは**ポジティブ権限モデル**として設計する。

### 決定理由

1. **RBACの本質への集中**
   - ロールベースの権限管理の基本概念を明確に学習
   - 不要な複雑性を排除

2. **業界標準への準拠**
   - 主要なRBACライブラリの多くがDenyを持たない
   - ポジティブモデルが一般的なベストプラクティス

3. **学習効果の最大化**
   - シンプルな設計により概念理解が容易
   - ACLとの違いを明確に認識できる

## 結果

### 利点
- **明確な権限モデル**: 「持っている権限」のみに集中
- **予測可能な動作**: Denyによる予期しない権限剥奪がない
- **保守性の向上**: 権限の追跡と理解が容易

### トレードオフ
- 例外的な権限制限には別のロール設計が必要
- 一時的な権限剥奪などの動的な制御が困難

### 今後の課題
- 例外的なケースへの対処方法のガイドライン作成
- より高度な権限制御が必要な場合のABACへの移行パス