# ACL 実装例とコードサンプル

このドキュメントでは、ACL実装の完全なコード例と使用方法を示します。

## 1. 完全な型定義

```typescript
// 権限ビット（Unix実装と同一）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// Branded Typesで許可用と拒否用を区別
export type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
export type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }

// 権限アクション
export type PermissionAction = keyof PermissionBits  // 'read' | 'write'

// ACLエントリーの主体
export type Subject = {
  type: 'user' | 'group'
  name: string
}

// ACLエントリー（Tagged Union + Branded Types）
export type Entry = 
  | {
      type: 'allow'
      subject: Subject
      permissions: AllowPermissionBits
    }
  | {
      type: 'deny'
      subject: Subject
      permissions: DenyPermissionBits
    }

// ACLで保護されるリソース
export type Resource = {
  name: string      // ドキュメント名
  entries: Entry[]  // Deny優先型では順序は重要でない
}

// アクセス要求
export type AccessRequest = {
  subject: {
    user: string      // 要求者のユーザー名
    groups: string[]  // 要求者が所属する全グループ
  }
  action: PermissionAction  // 'read' | 'write'
}

// アクセス決定（Tagged Union - Deny優先型）
export type AccessDecision = 
  | { type: 'granted'; allowEntries: Entry[] }
  | { type: 'denied'; denyEntry: Entry; allowEntries: Entry[] }
  | { type: 'no-match' }
```

## 2. 権限パターン定数

```typescript
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
```

## 3. クラス実装

```typescript
export class AccessControlList {
  private resource: Resource

  constructor(resource: Resource) {
    this.resource = resource
  }

  // アクセス可否を解決（Deny優先型評価）
  resolveAccess(request: AccessRequest): AccessDecision {
    const matchedEntries: Entry[] = []
    
    // すべてのエントリーをチェック
    for (const entry of this.resource.entries) {
      const isMatch = this.isSubjectMatch(entry.subject, request.subject)
      const hasPermission = entry.permissions[request.action]
      
      if (isMatch && hasPermission) {
        matchedEntries.push(entry)
      }
    }
    
    // Denyエントリーがあれば即座に拒否
    const denyEntry = matchedEntries.find(e => e.type === 'deny')
    if (denyEntry) {
      return {
        type: 'denied',
        denyEntry,
        allowEntries: matchedEntries.filter(e => e.type === 'allow')
      }
    }
    
    // Allowエントリーがあれば許可
    const allowEntries = matchedEntries.filter(e => e.type === 'allow')
    if (allowEntries.length > 0) {
      return { type: 'granted', allowEntries }
    }
    
    // マッチするエントリーがない
    return { type: 'no-match' }
  }

  // エントリーを追加
  addEntry(entry: Entry): void {
    this.resource.entries.push(entry)
  }
  
  // エントリーを削除
  removeEntry(subject: Subject): void {
    this.resource.entries = this.resource.entries.filter(
      entry => !this.isSubjectEqual(entry.subject, subject)
    )
  }
  
  // ヘルパーメソッド（プライベート）
  private isSubjectMatch(entrySubject: Subject, requestSubject: { user: string; groups: string[] }): boolean {
    if (entrySubject.type === 'user') {
      return entrySubject.name === requestSubject.user
    } else {
      return requestSubject.groups.includes(entrySubject.name)
    }
  }
  
  private isSubjectEqual(s1: Subject, s2: Subject): boolean {
    return s1.type === s2.type && s1.name === s2.name
  }
}
```

## 4. 使用例

### 4.1 基本的な使用例

```typescript
// ACLの作成
const acl = new AccessControlList({
  name: 'financial-report.doc',
  entries: [
    // 経理部門に読み書き許可
    {
      type: 'allow',
      subject: { type: 'group', name: 'finance' },
      permissions: ALLOW_PATTERNS.READ_WRITE
    },
    // 管理職に読み取り許可
    {
      type: 'allow',
      subject: { type: 'group', name: 'managers' },
      permissions: ALLOW_PATTERNS.READ_ONLY
    },
    // インターンは明示的に拒否
    {
      type: 'deny',
      subject: { type: 'user', name: 'intern' },
      permissions: DENY_PATTERNS.ALL
    }
  ]
})

// アクセスチェック例1: 経理部門のAlice
const decision1 = acl.resolveAccess({
  subject: { user: 'alice', groups: ['finance'] },
  action: 'write'
})
// 結果: { type: 'granted', allowEntries: [...] }

// アクセスチェック例2: インターン（経理部門所属でも拒否）
const decision2 = acl.resolveAccess({
  subject: { user: 'intern', groups: ['finance'] },
  action: 'read'
})
// 結果: { type: 'denied', denyEntry: {...}, allowEntries: [...] }
```

### 4.2 Branded Typesによる型安全性の例

```typescript
// 正しい使用例
const validAllowEntry: Entry = {
  type: 'allow',
  subject: { type: 'user', name: 'alice' },
  permissions: ALLOW_PATTERNS.READ_WRITE  // ✅ 正しい
}

const validDenyEntry: Entry = {
  type: 'deny',
  subject: { type: 'user', name: 'bob' },
  permissions: DENY_PATTERNS.ALL  // ✅ 正しい
}

// コンパイルエラーになる例
// const invalidEntry: Entry = {
//   type: 'allow',
//   subject: { type: 'user', name: 'charlie' },
//   permissions: DENY_PATTERNS.ALL  // ❌ エラー: DenyPermissionBitsをAllowエントリーで使用
// }
```

### 4.3 AccessDecisionの処理例

```typescript
function handleAccessDecision(decision: AccessDecision): void {
  switch (decision.type) {
    case 'granted':
      console.log('✅ アクセス許可')
      console.log(`  許可エントリー数: ${decision.allowEntries.length}`)
      break
      
    case 'denied':
      console.log('❌ アクセス拒否')
      console.log(`  拒否理由: ${decision.denyEntry.subject.type} '${decision.denyEntry.subject.name}'`)
      if (decision.allowEntries.length > 0) {
        console.log(`  (注: ${decision.allowEntries.length}個の許可エントリーがありましたが、拒否が優先されました)`)
      }
      break
      
    case 'no-match':
      console.log('⚠️ 権限設定がありません')
      break
      
    // TypeScriptの網羅性チェック
    default:
      const _exhaustive: never = decision
      throw new Error(`未処理のケース: ${_exhaustive}`)
  }
}
```

## 5. 高度な使用例

### 5.1 動的なエントリー管理

```typescript
// 初期状態：空のACL
const acl = new AccessControlList({
  name: 'project-plan.doc',
  entries: []
})

// 動的にエントリーを追加
acl.addEntry({
  type: 'allow',
  subject: { type: 'group', name: 'project-team' },
  permissions: ALLOW_PATTERNS.READ_WRITE
})

// 特定ユーザーを一時的にブロック
acl.addEntry({
  type: 'deny',
  subject: { type: 'user', name: 'suspicious-user' },
  permissions: DENY_PATTERNS.ALL
})

// 後でブロックを解除
acl.removeEntry({ type: 'user', name: 'suspicious-user' })
```

### 5.2 同一主体への重複設定の例

```typescript
const acl = new AccessControlList({
  name: 'sensitive-data.doc',
  entries: [
    // Developersグループに書き込み許可
    {
      type: 'allow',
      subject: { type: 'group', name: 'developers' },
      permissions: { read: false, write: true, _brand: 'allow' } as AllowPermissionBits
    },
    // 同じDevelopersグループに読み取り拒否
    {
      type: 'deny',
      subject: { type: 'group', name: 'developers' },
      permissions: { read: true, write: false, _brand: 'deny' } as DenyPermissionBits
    }
  ]
})

// Developer所属のユーザーがwriteアクセスを要求
const decision = acl.resolveAccess({
  subject: { user: 'dev1', groups: ['developers'] },
  action: 'write'
})
// 結果: granted（writeの拒否エントリーがないため）

// readアクセスを要求
const decision2 = acl.resolveAccess({
  subject: { user: 'dev1', groups: ['developers'] },
  action: 'read'
})
// 結果: denied（readの拒否エントリーがあるため）
```

## 6. テストケースの例

```typescript
describe('AccessControlList', () => {
  describe('Deny優先型の動作', () => {
    it('Denyエントリーが1つでもあれば拒否される', () => {
      const acl = new AccessControlList({
        name: 'test.doc',
        entries: [
          {
            type: 'allow',
            subject: { type: 'user', name: 'alice' },
            permissions: ALLOW_PATTERNS.READ_WRITE
          },
          {
            type: 'deny',
            subject: { type: 'user', name: 'alice' },
            permissions: DENY_PATTERNS.READ
          }
        ]
      })
      
      const decision = acl.resolveAccess({
        subject: { user: 'alice', groups: [] },
        action: 'read'
      })
      
      expect(decision.type).toBe('denied')
    })
  })
  
  describe('Branded Typesの型安全性', () => {
    it('コンパイル時に権限パターンの誤用を防ぐ', () => {
      // このテストはTypeScriptのコンパイラでチェックされる
      // 実行時テストではなく、型システムのテスト
      
      type AllowEntryTest = {
        type: 'allow'
        subject: Subject
        permissions: AllowPermissionBits  // DENY_PATTERNSは使用不可
      }
      
      type DenyEntryTest = {
        type: 'deny'
        subject: Subject
        permissions: DenyPermissionBits  // ALLOW_PATTERNSは使用不可
      }
    })
  })
})
```

## まとめ

これらの例は、ACL実装の主要な機能と使用方法を示しています：

1. **型安全性**: Branded TypesとTagged Unionによる堅牢な型設計
2. **Deny優先**: セキュリティファーストの評価ロジック
3. **シンプルなAPI**: 3つのメソッドで全機能を実現
4. **実践的な例**: 社内ドキュメント管理での具体的な使用シナリオ

この実装を通じて、実際の認可ライブラリで使われているパターンを学習できます。