# ADR-004: 権限評価 - OR演算による統合

## ステータス
- **日付**: 2025-08-12
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

RBACシステムにおける権限評価は、ユーザーのロールから最終的な権限を導出する核心的な処理である。特に複数ロールを持つユーザーの権限をどのように統合するかは重要な設計判断となる。

## 検討したオプション

### 実装方法の選択

#### オプション1: 独立したクラス実装
```typescript
class PermissionEvaluator {
  constructor(private roleManager: RoleManager) {}
  
  evaluate(user: UserName, action: PermissionAction): boolean {
    // 評価ロジック
  }
}
```
- 利点：関心の分離、テスタビリティ、再利用性
- 欠点：クラス数の増加、学習者にとって複雑

#### オプション2: 純粋関数による実装
```typescript
function evaluatePermission(
  roleManager: RoleManager,
  user: UserName,
  action: PermissionAction
): boolean {
  // 評価ロジック
}
```
- 利点：ステートレス、テストが容易
- 欠点：コンテキストの管理が複雑

#### オプション3: RbacProtectedResourceのメソッド
```typescript
class RbacProtectedResource {
  private evaluatePermission(user: UserName, action: PermissionAction): boolean {
    // 評価ロジック
  }
}
```
- 利点：シンプルな設計、ACL実装との一貫性
- 欠点：再利用性が低い

### 権限統合の方針

#### OR演算（論理和）
- すべてのロールの権限を統合し、一つでも許可があれば許可
- 最も寛容な権限が適用される

#### AND演算（論理積）
- すべてのロールで許可されている場合のみ許可
- 最も厳格な権限が適用される

## 決定

**RbacProtectedResourceのプライベートメソッド**として実装し、**OR演算による権限統合**を採用する。

### APIメソッド名

業界標準の用語として`authorize`を採用：
```typescript
class RbacProtectedResource {
  authorize(user: UserName, action: PermissionAction): boolean {
    const permissions = this.roleManager.getUserPermissions(user)
    return this.evaluatePermissions(permissions, action)
  }
  
  private evaluatePermissions(
    permissions: PermissionBits,
    action: PermissionAction
  ): boolean {
    switch (action) {
      case 'read': return permissions.read
      case 'write': return permissions.write
      default: return false
    }
  }
}
```

## 結果

### 利点
- **業界標準の用語**: `authorize`は広く認知された権限評価メソッド名
- **シンプルな実装**: 学習者にとって理解しやすい構造
- **直感的な動作**: OR演算による統合は自然で予測可能
- **ACLとの差別化**: `resolveAccess`(ACL)と`authorize`(RBAC)で異なるアルゴリズムを明確化

### トレードオフ
- 評価ロジックの再利用性が限定的
- 複雑な権限ルールには対応しづらい

### 実装の要点
```typescript
// 複数ロールの権限統合例
// user: ["editor", "reviewer"]
// editor: { read: true, write: true }
// reviewer: { read: true, write: false }
// 結果: { read: true, write: true } // OR演算により最も寛容な権限

getUserPermissions(user: UserName): PermissionBits {
  const roles = this.userRoles.get(user) ?? new Set()
  let combined = { read: false, write: false }
  
  for (const roleName of roles) {
    const role = ROLES[roleName]
    combined.read = combined.read || role.permissions.read
    combined.write = combined.write || role.permissions.write
  }
  
  return combined
}
```

### 今後の課題
- より複雑な権限評価ルール（条件付き権限など）への対応
- パフォーマンス最適化（権限キャッシュなど）
- 監査ログ機能の追加検討