// RBAC (Role-Based Access Control) 学習用実装
// ADRに基づいた型定義とクラス定義（メソッドの実装は学習者が行う）

// ==========================================
// 型定義
// ==========================================

// ユーザー識別子
export type UserName = string

// 権限ビット（ACLと共通）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits // 'read' | 'write'

// ロール定義（const assertionによる型安全な実装）
export const ROLES = {
  viewer: {
    name: 'viewer' as const,
    permissions: {read: true, write: false},
    description: 'ドキュメントの閲覧のみ可能'
  },
  editor: {
    name: 'editor' as const,
    permissions: {read: true, write: true},
    description: 'ドキュメントの閲覧と編集が可能'
  },
  admin: {
    name: 'admin' as const,
    permissions: {read: true, write: true},
    description: '全権限を持つ管理者'
  },
  auditor: {
    name: 'auditor' as const,
    permissions: {read: true, write: false},
    description: '監査員'
  }
} as const

// 型の自動生成
export type RoleName = keyof typeof ROLES  // 'viewer' | 'editor' | 'admin' | 'auditor'
export type Role = typeof ROLES[RoleName]

// リソースのロール要件
export type RoleRequirement =
  | { type: 'any'; roles: RoleName[] }      // いずれかのロールがあればOK
  | { type: 'all'; roles: RoleName[] }      // 全てのロールが必要

// ユーザーとロールの割り当て管理
export type UserRoleAssignment = Map<UserName, Set<RoleName>>

// 認可決定（Tagged Union）
export type AuthzDecision =
  | {
  type: 'granted'
  matchedRoles: RoleName[]
}
  | {
  type: 'denied'
  reason: 'no-roles'  // リソースがロールを持っていない
}
  | {
  type: 'denied'
  reason: 'insufficient-permissions'  // ロールはあるが権限不足
  userRoles: RoleName[]
}
  | {
  type: 'denied'
  reason: 'requirement-not-met'  // リソースの要件を満たさない
  userRoles: RoleName[]
}

// ==========================================
// クラス定義
// ==========================================

// ロール管理クラス（グローバルロール管理）
export class RoleManager {
  private readonly roles: typeof ROLES
  private userRoleAssignments: UserRoleAssignment

  constructor(predefinedRoles: typeof ROLES) {
    this.roles = predefinedRoles
    this.userRoleAssignments = new Map()
  }

  // ユーザーにロールを割り当て
  assignRole(userName: UserName, roleName: RoleName): void {
    const existingRoles = this.getUserRoles(userName);
    this.userRoleAssignments.set(userName, new Set([...existingRoles, roleName]))
  }

  // ユーザーのロール一覧を取得
  getUserRoles(userName: UserName): Set<RoleName> {
    return this.userRoleAssignments.get(userName) || new Set();
  }

  // ロール定義を取得
  getRole(roleName: RoleName): Role {
    return this.roles[roleName]
  }
}

// RBACで保護されたリソースクラス
export class RbacProtectedResource {
  private resourceId: string
  private readonly roleManager?: RoleManager
  private readonly requirements?: RoleRequirement

  constructor(
    resourceId: string,
    roleManager?: RoleManager,
    requirements?: RoleRequirement,
  ) {
    this.resourceId = resourceId
    this.roleManager = roleManager
    this.requirements = requirements
  }

  // アクセス権限をチェック（業界標準の「authorize」）
  authorize(userName: UserName, action: PermissionAction): AuthzDecision {
    // プロパティからローカル変数へ取り出してガードすることで、型をナローイングする
    const roleManager = this.roleManager
    const requirements = this.requirements
    if (!roleManager || !requirements) {
      return {type: 'denied', reason: 'no-roles'}
    }

    const userRoles = roleManager.getUserRoles(userName);
    const matchedRoles = requirements.roles.filter((roleName) => {
      return userRoles.has(roleName) && roleManager.getRole(roleName).permissions[action];
    })

    switch (requirements.type) {
      case 'any':
        if (matchedRoles.length > 0) {
          return {type: 'granted', matchedRoles}
        }
        return {type: 'denied', reason: 'insufficient-permissions', userRoles: Array.from(userRoles)}

      case 'all':
        const allMatch = requirements.roles.every(roleName => matchedRoles.includes(roleName))

        if (allMatch) {
          return {type: 'granted', matchedRoles}
        }
        return {type: 'denied', reason: 'requirement-not-met', userRoles: Array.from(userRoles)}

      default:
        // 他のパターンはないので、もしここに来たら例外とする
        throw new Error('Not implemented')
    }
  }
}