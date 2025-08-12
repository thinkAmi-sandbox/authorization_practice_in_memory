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
export type RoleName = keyof typeof ROLES  // 'viewer' | 'editor' | 'admin' | 'auditor'
export type Role = typeof ROLES[RoleName]

// リソースのロール要件
export type RoleRequirement = 
  | { type: 'any'; roles: RoleName[] }      // いずれかのロールがあればOK
  | { type: 'all'; roles: RoleName[] }      // 全てのロールが必要

// ユーザーとロールの割り当て管理
export type UserRoleAssignment = Map<UserName, Set<RoleName>>

// 権限評価結果
export type EvaluationResult = {
  allowed: boolean
  matchedRoles: RoleName[]
  effectivePermissions: PermissionBits
}

// 認可リクエスト
export type AuthzRequest = {
  userName: UserName
  action: PermissionAction
}

export const ErrorMessages = {
  NO_ROLES: 'ユーザーにロールがありません',
  NEED_ALL_ROLES: 'すべてのロールが必要です',
} as const

// 認可決定（Tagged Union）
export type AuthzDecision = 
  | { 
      type: 'granted'
      matchedRoles: RoleName[]
      effectivePermissions: PermissionBits
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
      details: typeof ErrorMessages[keyof typeof ErrorMessages]
    }

// ==========================================
// クラス定義
// ==========================================

// ロール管理クラス（グローバルロール管理）
export class RoleManager {
  private roles: typeof ROLES
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

  // ユーザーからロールを取り消し
  revokeRole(userName: UserName, roleName: RoleName): void {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }

  // ユーザーのロール一覧を取得
  getUserRoles(userName: UserName): Set<RoleName> {
    return this.userRoleAssignments.get(userName) || new Set();
  }

  // ロール定義を取得
  getRole(roleName: RoleName): Role {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }

  // ユーザーが特定のロールを持つか確認
  hasRole(userName: UserName, roleName: RoleName): boolean {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }
}

// RBACで保護されたリソースクラス
export class RbacProtectedResource {
  private resourceId: string
  private readonly roleManager?: RoleManager
  private requirements?: RoleRequirement

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
    if (!this.roleManager) {
      return { type: 'denied', reason: 'no-roles' }
    }

    const existingRoles = this.roleManager.getUserRoles(userName);


    // 実装は学習者が行う
    throw new Error('Not implemented')
  }

  // 権限評価ロジック（プライベートメソッド）
  private evaluatePermissions(
    userRoles: Set<RoleName>,
    action: PermissionAction
  ): EvaluationResult {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }

  // 評価結果を認可決定に変換（プライベートメソッド）
  private buildDecision(
    evaluation: EvaluationResult,
    requirements?: RoleRequirement
  ): AuthzDecision {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }
}

// ==========================================
// ヘルパー関数
// ==========================================

// 権限ビットの作成
export function createPermissionBits(read: boolean, write: boolean): PermissionBits {
  return { read, write }
}

// よく使う権限パターン
export const PERMISSION_PATTERNS = {
  READ_ONLY: { read: true, write: false } as PermissionBits,
  WRITE_ONLY: { read: false, write: true } as PermissionBits,
  READ_WRITE: { read: true, write: true } as PermissionBits,
  NONE: { read: false, write: false } as PermissionBits
} as const