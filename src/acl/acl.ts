// ACL (Access Control List) 学習用実装
// ADRに基づいた型定義とクラス定義（メソッドの実装は学習者が行う）

// ==========================================
// 型定義
// ==========================================

// 権限ビット（Unix実装と同一）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits // 'read' | 'write'

// Branded Typesで許可用と拒否用を区別
export type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
export type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }

// ACLエントリーの主体
export type Subject = {
  type: 'user' | 'group'
  name: string
}

// ACLエントリー
export type Entry =
  | {
      type: 'allow'
      subject: Subject
      permissions: AllowPermissionBits // 許可用パターンのみ許可
    }
  | {
      type: 'deny'
      subject: Subject
      permissions: DenyPermissionBits // 拒否用パターンのみ許可
    }

// ACLで保護されるリソース
export type Resource = {
  name: string // ドキュメント名
  entries: Entry[] // Deny優先型では順序は重要でない
}

// アクセス要求
export type AccessRequest = {
  subject: {
    user: string // 要求者のユーザー名
    groups: string[] // 要求者が所属する全グループ
  }
  action: PermissionAction // 'read' | 'write'
}

// アクセス決定（Tagged Union - Deny優先型）
export type AccessDecision =
  | { type: 'granted'; allowEntries: Entry[] } // マッチしたAllowエントリー
  | { type: 'denied'; denyEntry: Entry; allowEntries: Entry[] } // Denyが優先
  | { type: 'no-match' } // マッチするエントリーなし

// ==========================================
// クラス定義
// ==========================================

// ACL実装クラス（最小限のAPI）
export class AccessControlList {
  private resource: Resource

  constructor(resource: Resource) {
    this.resource = resource
  }

  // アクセス可否をチェック（Deny優先型評価）
  checkAccess(request: AccessRequest): AccessDecision {
    const matchEntries = this.resource.entries.filter((entry) => {
      switch (entry.subject.type) {
        case 'user':
          return entry.subject.name === request.subject.user
        case 'group':
          return request.subject.groups.includes(entry.subject.name)
      }
    })

    if (matchEntries.length === 0) {
      return { type: 'no-match' }
    }

    const denyEntry = matchEntries.find((entry) => entry.type === 'deny')
    if (denyEntry) {
      return {
        type: 'denied',
        denyEntry,
        allowEntries: matchEntries.filter((entry) => entry !== denyEntry && entry.type === 'allow')
      }
    }

    return { type: 'granted', allowEntries: matchEntries }
  }

  // エントリーを追加
  addEntry(entry: Entry): void {
    // 実装は学習者が行う
    throw new Error('Not implemented')
  }

  // エントリーを削除
  removeEntry(subject: Subject): void {
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
// 許可用パターン（Allowエントリーで使用）
export const ALLOW_PATTERNS = {
  READ_ONLY: { read: true, write: false, _brand: 'allow' } as AllowPermissionBits,
  WRITE_ONLY: { read: false, write: true, _brand: 'allow' } as AllowPermissionBits,
  READ_WRITE: { read: true, write: true, _brand: 'allow' } as AllowPermissionBits,
  NONE: { read: false, write: false, _brand: 'allow' } as AllowPermissionBits
} as const

// 拒否用パターン（Denyエントリーで使用）
export const DENY_PATTERNS = {
  ALL: { read: true, write: true, _brand: 'deny' } as DenyPermissionBits,
  READ: { read: true, write: false, _brand: 'deny' } as DenyPermissionBits,
  WRITE: { read: false, write: true, _brand: 'deny' } as DenyPermissionBits
} as const
