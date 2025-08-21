# ADR-003: 複数ロール - ユーザーの複数ロール割り当て

## ステータス
- **日付**: 2025-08-12
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

RBACシステムにおいて、ユーザーが同時に複数のロールを持てるかどうかは重要な設計判断である。実際の組織では、一人が複数の役割を兼任することは一般的である。

## 検討したオプション

### オプション1: 単一ロール制限
```typescript
type UserRoleAssignment = Map<UserName, RoleName>
// 例: "alice" → "editor"
```
- 利点：実装がシンプル、権限の予測が容易、競合がない
- 欠点：現実の組織構造を適切に表現できない、柔軟性に欠ける

### オプション2: 複数ロール許可
```typescript
type UserRoleAssignment = Map<UserName, Set<RoleName>>
// 例: "alice" → {"editor", "reviewer"}
```
- 利点：実際の組織構造を正確に表現、柔軟な権限設定が可能
- 欠点：権限の統合ロジックが必要、複雑性が増す

## 決定

**複数ロール許可**を採用する。ユーザーは同時に複数のロールを保持できる。

### 権限統合の方針

複数ロールの権限は**OR演算**で統合する：
```typescript
// ユーザーが editor と reviewer の両方のロールを持つ場合
// editor: { read: true, write: true }
// reviewer: { read: true, write: false }
// 統合結果: { read: true, write: true } // より寛容な権限を採用
```

## 結果

### 利点
- **現実的なモデリング**: 実際の組織での兼任や臨時の責任を表現可能
- **権限の段階的付与**: 基本ロールに追加ロールを付与することで権限を拡張
- **学習効果**: 権限統合ロジックの実装を通じて、実務的な課題を理解

### トレードオフ
- 権限の出所が複数になるため、デバッグが複雑になる可能性
- ロール間の権限競合を意識する必要がある（ただしOR演算により自然に解決）

### 実装例
```typescript
class RoleManager {
  private userRoles: Map<UserName, Set<RoleName>> = new Map()
  
  assignRole(user: UserName, role: RoleName): void {
    const roles = this.userRoles.get(user) ?? new Set()
    roles.add(role)
    this.userRoles.set(user, roles)
  }
  
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
}
```

### 今後の課題
- ロールの競合や相互排他性を定義する仕組みの検討
- 大量のロール割り当て時のパフォーマンス最適化