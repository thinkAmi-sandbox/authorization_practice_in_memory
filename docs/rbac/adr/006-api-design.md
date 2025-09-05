# ADR-006: API設計 - 最小限のメソッドセット

## ステータス
- **日付**: 2025-08-12
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

学習用RBACシステムのAPIは、RBACの本質を理解しやすく、かつ実用的な操作を可能にする必要がある。過度に複雑なAPIは学習の妨げとなり、逆に簡素すぎるAPIは実務との乖離を生む。

## 検討したオプション

### オプション1: 最小限のAPI（3-4メソッド）
```typescript
class RoleManager {
  assignRole(user: UserName, role: RoleName): void
  getUserRoles(user: UserName): Set<RoleName>
  getUserPermissions(user: UserName): PermissionBits
}
```
- 利点：学習が容易、実装がシンプル
- 欠点：実務的な操作（ロール削除など）が不足

### オプション2: 中程度のAPI（5-7メソッド）
```typescript
class RoleManager {
  assignRole(user: UserName, role: RoleName): void
  revokeRole(user: UserName, role: RoleName): void
  getUserRoles(user: UserName): Set<RoleName>
  getUserPermissions(user: UserName): PermissionBits
  hasRole(user: UserName, role: RoleName): boolean
}
```
- 利点：基本的な操作を網羅、バランスが良い
- 欠点：まだ一部の管理機能が不足

### オプション3: 完全なAPI（8メソッド以上）
```typescript
class RoleManager {
  // ユーザー・ロール管理
  assignRole(user: UserName, role: RoleName): void
  revokeRole(user: UserName, role: RoleName): void
  revokeAllRoles(user: UserName): void
  
  // 照会
  getUserRoles(user: UserName): Set<RoleName>
  getUserPermissions(user: UserName): PermissionBits
  hasRole(user: UserName, role: RoleName): boolean
  getAllUsers(): Set<UserName>
  getUsersByRole(role: RoleName): Set<UserName>
}
```
- 利点：実務に近い機能セット
- 欠点：学習用には複雑、本質的でない機能も含む

## 決定

**中程度のAPIセット**を採用し、以下の設計とする。

### RoleManager API
```typescript
class RoleManager {
  constructor(predefinedRoles: typeof ROLES)
  
  // 基本操作
  assignRole(user: UserName, role: RoleName): void
  revokeRole(user: UserName, role: RoleName): void
  
  // 照会
  getUserRoles(user: UserName): Set<RoleName>
  getUserPermissions(user: UserName): PermissionBits
}
```

### RbacProtectedResource API
```typescript
class RbacProtectedResource {
  constructor(
    resourceId: string,
    roleManager: RoleManager
  )
  
  // 権限評価（業界標準の用語）
  authorize(user: UserName, action: PermissionAction): boolean
}
```

### メソッド名の選定理由

- **`authorize`**: 業界標準の用語。Spring Security、Apache Shiro等で広く使用
- **`assignRole`/`revokeRole`**: 直感的で明確な動詞
- **`getUserPermissions`**: 複数ロールの統合結果を返す意図を明確化

## 結果

### 利点
- **学習に最適**: RBACの核心概念（ロール割り当て、権限評価）に集中
- **実務的**: 基本的な管理操作を網羅
- **業界標準準拠**: `authorize`という標準的な用語を使用
- **ACLとの差別化**: ACLの`resolveAccess`と異なる名前でアルゴリズムの違いを明確化

### トレードオフ
- 大規模な管理機能（一括操作、ロール検索など）は含まない
- 監査やロギング機能は範囲外

### 実装例
```typescript
// 使用例
const roleManager = new RoleManager(ROLES)
roleManager.assignRole('alice', 'editor')
roleManager.assignRole('alice', 'reviewer')

const doc = new RbacProtectedResource('doc-001', roleManager)

// 権限チェック
if (doc.authorize('alice', 'write')) {
  // 書き込み処理
}

// 権限の確認
const permissions = roleManager.getUserPermissions('alice')
console.log(permissions) // { read: true, write: true }
```

### 今後の課題
- バッチ操作API の追加検討
- 権限の委譲機能の検討
- APIのバージョニング戦略