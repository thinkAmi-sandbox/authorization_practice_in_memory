# RBAC (Role-Based Access Control) 設計ドキュメント

## 1. 概要

このドキュメントは、学習用RBAC実装の詳細な技術設計を記述したものである。RBACは、ロール（役割）という抽象層を導入することで、ユーザーと権限の間接的な管理を実現する権限管理パターンである。

## 2. コンテキスト

### 2.1 プロジェクトの背景

このプロジェクトは、ユーザーが権限管理システムを学習するための実装サンプルを提供することを目的としている。各権限管理方式の核心的なロジックと特徴の理解に焦点を当てる。

### 2.2 RBACの位置づけ（ACLからの発展）

RBACは、ACL（Access Control List）の課題を解決するために発展した権限管理モデルである：

| 側面 | ACL | RBAC |
|------|-----|------|
| **権限設定方法** | 個別のユーザー/グループに直接設定 | ロールを介した間接設定 |
| **管理の複雑さ** | O(ユーザー数 × リソース数) | O(ユーザー数 + ロール数) |
| **組織変更への対応** | 各リソースを個別に更新 | ロール定義の更新のみ |
| **利点** | 細かい制御が可能 | 管理の簡素化、職務分離の実現 |
| **欠点** | ユーザー増加で管理が複雑化 | 例外的な権限設定が困難 |

### 2.3 想定する題材（社内ドキュメント管理システム）

学習効果を高めるため、ACLと同様に社内ドキュメント管理システムを題材とする：

- **権限の種類**: read（閲覧）とwrite（作成・更新・削除）の2つ
- **実行権限は不要**: ドキュメントは実行するものではない
- **ロールの例**:
  - `viewer`: ドキュメントの閲覧のみ可能
  - `editor`: ドキュメントの閲覧と編集が可能
  - `admin`: 全権限を持つ管理者
  - `auditor`: 監査目的の閲覧権限

### 2.4 RBACの核心概念

RBACの学習において重要な4つの概念：

1. **ユーザー（User）**: システムのアクセス主体
2. **ロール（Role）**: 組織内の役割や職務を表現
3. **パーミッション（Permission）**: リソースに対する操作権限
4. **割り当て（Assignment）**:
   - ユーザー・ロール割り当て（User-Role Assignment）
   - ロール・パーミッション割り当て（Role-Permission Assignment）

## 3. アーキテクチャ設計

### 3.1 2層アーキテクチャ

RBACの本質を明確に理解できるよう、2層アーキテクチャを採用：

```
┌─────────────────────────────────────────────┐
│          第1層: ロール管理層                 │
│              (RoleManager)                   │
│                                              │
│  - ロール定義の管理                          │
│  - ユーザーへのロール割り当て                │
│  - ロール権限の統合                          │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         第2層: リソース保護層                 │
│         (RbacProtectedResource)              │
│                                              │
│  - 個別リソースの保護                        │
│  - RoleManagerを参照して権限評価             │
│  - リソース固有の要件定義                    │
└─────────────────────────────────────────────┘
```

### 3.2 責任の分離

各層の責任を明確に分離することで、RBACの構造を理解しやすくする：

- **RoleManager**: 「誰がどのロールを持つか」を管理
- **RbacProtectedResource**: 「このリソースへのアクセスを許可するか」を判断

## 4. 型定義

### 4.1 基本型

```typescript
// ユーザー識別子
export type UserName = string

// 権限ビット（ACLと共通）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits // 'read' | 'write'
```

### 4.2 ロール定義

const assertion + typeof パターンを使用した型安全な実装：

```typescript
export const ROLES = {
  viewer: {
    name: 'viewer' as const,
    permissions: { read: true, write: false },
    description: 'ドキュメントの閲覧のみ可能'
  },
  editor: {
    name: 'editor' as const,
    permissions: { read: true, write: true },
    description: 'ドキュメントの閲覧と編集が可能'
  },
  admin: {
    name: 'admin' as const,
    permissions: { read: true, write: true },
    description: '全権限を持つ管理者'
  },
  auditor: {
    name: 'auditor' as const,
    permissions: { read: true, write: false },
    description: '監査員'
  }
} as const

// 型の自動生成
export type RoleName = keyof typeof ROLES
export type Role = typeof ROLES[RoleName]
```

### 4.3 リソース要件

リソース固有のロール要件を表現：

```typescript
export type RoleRequirement = 
  | { type: 'any'; roles: RoleName[] }  // いずれかのロールがあればOK
  | { type: 'all'; roles: RoleName[] }  // 全てのロールが必要
```

### 4.4 認可結果（Tagged Union）

型安全で詳細な結果表現：

```typescript
export type AuthzDecision = 
  | { 
      type: 'granted'
      matchedRoles: RoleName[]
    }
  | { 
      type: 'denied'
      reason: 'no-roles'  // ユーザーがロールを持っていない
    }
  | { 
      type: 'denied'
      reason: 'insufficient-permissions'  // ロールはあるが権限不足
      userRoles: RoleName[]
    }
  | {
      type: 'denied'
      reason: 'requirement-not-met'  // リソース固有の要件を満たさない
      userRoles: RoleName[]
    }
```

## 5. API設計

### 5.1 RoleManager API

```typescript
class RoleManager {
  // コンストラクタで事前定義ロールを登録
  constructor(predefinedRoles: typeof ROLES)
  
  // 基本操作
  assignRole(userName: UserName, roleName: RoleName): void
  revokeRole(userName: UserName, roleName: RoleName): void
  
  // 照会
  getUserRoles(userName: UserName): Set<RoleName>
  getUserPermissions(userName: UserName): PermissionBits
}
```

### 5.2 RbacProtectedResource API

```typescript
class RbacProtectedResource {
  constructor(
    resourceId: string,
    roleManager: RoleManager,
    requirements?: RoleRequirement
  )
  
  // 権限評価（業界標準の用語）
  authorize(userName: UserName, action: PermissionAction): AuthzDecision
}
```

### 5.3 メソッド名の設計思想

各権限管理方式で意図的に異なるメソッド名を使用することで、概念の違いを明確化：

| 権限モデル | メソッド名 | 意味 |
|-----------|-----------|------|
| Unix | `hasPermission` | 権限の有無を確認 |
| ACL | `resolveAccess` | Allow/Denyエントリーの競合を解決 |
| **RBAC** | **`authorize`** | **ロール権限による認可** |
| ABAC | `evaluate` | ルール・属性を評価 |
| ReBAC | `checkRelation` | 関係性を確認 |

## 6. 権限評価アルゴリズム

### 6.1 複数ロールの統合（OR演算）

ユーザーが複数のロールを持つ場合、**OR演算**により最も寛容な権限を採用：

```typescript
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

### 6.2 権限評価フロー

```
1. ユーザーのロールを取得
   ↓
2. 各ロールの権限をOR演算で統合
   ↓
3. 要求されたアクションと照合
   ↓
4. リソース固有の要件をチェック（オプション）
   ↓
5. 認可結果を返す
```

## 7. 設計決定の根拠

### 7.1 なぜロール階層を実装しないか

**学習効果の最適化**のため、階層なしのフラット構造を採用：

- RBACの本質（ロールによる間接管理）に集中できる
- 実装がシンプルで理解しやすい
- デバッグとテストが容易
- 多くの小〜中規模システムでは階層なしで十分

### 7.2 なぜDeny機能を実装しないか

RBACは**ポジティブ権限モデル**として設計：

- ロールは「できること」の集合を定義
- 権限がない = false（暗黙的なDeny）
- Allow/Denyの優先順位問題を回避
- 管理の簡素化と予測可能な動作

### 7.3 なぜ複数ロールを許可するか

**実際の組織構造を反映**：

- 一人が複数の役割を兼任することは一般的
- 権限統合ロジックの学習機会
- 柔軟な権限設定が可能

## 8. テスト戦略

### 8.1 単体テスト

- ロール割り当ての正確性
- 権限統合ロジックの検証
- エッジケース（ロールなし、無効なロール等）

### 8.2 統合テスト

- RoleManagerとRbacProtectedResourceの連携
- 複数ロールのシナリオ
- リソース要件の検証

### 8.3 比較テスト

- ACL実装との動作比較
- 同じシナリオでの管理コスト比較

## 9. 学習パス

### 9.1 推奨される学習順序

1. **基本的なロール割り当て**: 単一ロールの管理
2. **複数ロールの扱い**: OR演算による権限統合
3. **リソース要件**: 特定のロール要求の実装
4. **ACLとの比較**: 管理方式の違いを体験

### 9.2 発展的な学習

- ロール階層の追加実装
- 動的職務分離（SoD）制約
- ABACへの移行パス

## 10. まとめ

この設計は、RBACの本質的な概念を学習するために最適化されている。シンプルさと実用性のバランスを保ちながら、実際のシステムで使用される基本的なパターンを体験できる。型安全な実装により、開発時のエラーを防ぎながら、RBACの核心概念を効果的に学習できる。