# RBAC実装例とコードサンプル

## 1. 基本的な使用例

### 1.1 初期セットアップ

```typescript
import { RoleManager, RbacProtectedResource, ROLES } from './rbac'

// グローバルなロール管理の初期化
// ROLESオブジェクトから自動的にロール定義を読み込み
const roleManager = new RoleManager(ROLES)

// ユーザーへのロール割り当て（型安全）
roleManager.assignRole('alice', 'editor')    // IDE補完あり
roleManager.assignRole('bob', 'viewer')      // 正しいロール名
roleManager.assignRole('charlie', 'admin')   // typo不可能
roleManager.assignRole('david', 'auditor')   // コンパイル時チェック
```

### 1.2 リソースの保護

```typescript
// 複数のリソースを保護（ロールは再利用）
const proposal = new RbacProtectedResource(
  'project-proposal.doc',
  roleManager
)

const budget = new RbacProtectedResource(
  'budget-2024.xlsx',
  roleManager,
  { type: 'any', roles: ['auditor', 'admin'] }  // 特定ロール要件
)

const publicDoc = new RbacProtectedResource(
  'company-policy.doc',
  roleManager
)
```

### 1.3 アクセスチェック

```typescript
// aliceは全てのドキュメントをeditorロールで編集可能
const decision1 = proposal.authorize('alice', 'write')
// → { type: 'granted', matchedRoles: ['editor'] }

const decision2 = publicDoc.authorize('alice', 'write')
// → { type: 'granted', matchedRoles: ['editor'] }

const decision3 = budget.authorize('alice', 'write')
// → { type: 'denied', reason: 'requirement-not-met', userRoles: ['editor'] }

// 結果の処理
if (decision1.type === 'granted') {
  console.log(`Access granted via roles: ${decision1.matchedRoles.join(', ')}`)
} else {
  console.log(`Access denied: ${decision1.reason}`)
}
```

## 2. 複数ロールの統合

### 2.1 複数ロールの割り当て

```typescript
// ユーザーに複数ロールを割り当て
roleManager.assignRole('emma', 'viewer')    // 読み取りのみ
roleManager.assignRole('emma', 'admin')     // 管理者権限

// 権限の統合（OR演算）
const permissions = roleManager.getUserPermissions('emma')
// → { read: true, write: true }  // adminのwrite権限が有効
```

### 2.2 ロール統合の動作例

```typescript
// 内部動作の可視化
function demonstrateRoleMerging() {
  const roles = roleManager.getUserRoles('emma')
  // → Set(['viewer', 'admin'])
  
  // 各ロールの権限
  // viewer: { read: true, write: false }
  // admin:  { read: true, write: true }
  
  // OR演算による統合
  // result: { read: true || true, write: false || true }
  // →      { read: true, write: true }
  
  const decision = proposal.authorize('emma', 'write')
  // → { type: 'granted', matchedRoles: ['admin'] }
}
```

## 3. 組織変更のシナリオ

### 3.1 部署異動による権限変更

```typescript
// シナリオ：編集者から管理者への昇格

// 1. 現在の状態確認
const currentRoles = roleManager.getUserRoles('alice')
console.log(`Current roles: ${Array.from(currentRoles).join(', ')}`)
// → "Current roles: editor"

// 2. 部署異動の実施
roleManager.revokeRole('alice', 'editor')
roleManager.assignRole('alice', 'admin')

// 3. 新しい権限の確認
const newRoles = roleManager.getUserRoles('alice')
console.log(`New roles: ${Array.from(newRoles).join(', ')}`)
// → "New roles: admin"

// 4. 全リソースで即座に新しい権限が有効
const accessAfterPromotion = budget.authorize('alice', 'write')
// → { type: 'granted', matchedRoles: ['admin'] }
```

### 3.2 一時的な権限制限

```typescript
// シナリオ：監査期間中の権限制限

class AuditModeExample {
  private originalPermissions: Map<RoleName, PermissionBits> = new Map()
  
  // 監査モード開始
  startAudit(roleManager: RoleManager) {
    // editorの書き込み権限を一時停止
    this.originalPermissions.set('editor', ROLES.editor.permissions)
    
    // 権限のオーバーライド（実装例）
    const restrictedPermissions = {
      read: true,
      write: false  // 一時的に書き込み禁止
    }
    
    // 全editorユーザーに影響
    console.log('Audit mode: Write access restricted for editors')
  }
  
  // 監査モード終了
  endAudit(roleManager: RoleManager) {
    // 元の権限を復元
    const original = this.originalPermissions.get('editor')
    if (original) {
      console.log('Audit complete: Permissions restored')
    }
  }
}
```

### 3.3 退職処理

```typescript
// シナリオ：従業員の退職

function offboardEmployee(userName: UserName) {
  // 1. 現在のロールを記録（監査ログ用）
  const roles = roleManager.getUserRoles(userName)
  console.log(`Removing roles for ${userName}: ${Array.from(roles).join(', ')}`)
  
  // 2. 全ロールを削除
  for (const role of roles) {
    roleManager.revokeRole(userName, role)
  }
  
  // 3. アクセス確認
  const decision = proposal.authorize(userName, 'read')
  // → { type: 'denied', reason: 'no-roles' }
  
  console.log(`${userName} has been offboarded successfully`)
}
```

## 4. ACLとの比較

### 4.1 管理コストの違い

```typescript
// ACL方式：各リソースで個別管理
class AclApproach {
  documents: AclProtectedResource[] = []
  
  grantAccessToAll(userName: string) {
    // 100個のドキュメントそれぞれに対して設定
    for (const doc of this.documents) {
      doc.grant(userName, { read: true, write: true })
    }
    // → 100回の設定操作が必要
  }
  
  changePermissions(userName: string) {
    // 権限変更も個別に実施
    for (const doc of this.documents) {
      doc.revoke(userName, 'write')
    }
    // → また100回の変更操作
  }
}

// RBAC方式：ロール経由で一元管理
class RbacApproach {
  roleManager: RoleManager
  
  grantAccessToAll(userName: string) {
    // 1回のロール割り当てで完了
    this.roleManager.assignRole(userName, 'editor')
    // → 全100個のドキュメントにアクセス可能
  }
  
  changePermissions(roleName: RoleName) {
    // ロール定義の変更で一括適用
    // （注：実際の実装では、ロール定義は不変として扱う）
    console.log(`Updating permissions for role: ${roleName}`)
    // → 全リソース、全ユーザーに即座に反映
  }
}
```

### 4.2 スケーラビリティの比較

```typescript
// 管理コストの計算例
function calculateManagementCost() {
  const numUsers = 100
  const numResources = 100
  const numRoles = 5
  
  // ACLの管理コスト
  const aclCost = numUsers * numResources  // O(n×m)
  console.log(`ACL management cost: ${aclCost} operations`)
  // → "ACL management cost: 10000 operations"
  
  // RBACの管理コスト
  const rbacCost = numUsers + numRoles     // O(n+r)
  console.log(`RBAC management cost: ${rbacCost} operations`)
  // → "RBAC management cost: 105 operations"
  
  // 効率改善率
  const improvement = Math.round((1 - rbacCost/aclCost) * 100)
  console.log(`Efficiency improvement: ${improvement}%`)
  // → "Efficiency improvement: 99%"
}
```

## 5. 高度な使用例

### 5.1 リソース固有の要件

```typescript
// 機密文書：特定のロールの組み合わせが必要
const confidentialDoc = new RbacProtectedResource(
  'confidential-report.pdf',
  roleManager,
  { type: 'all', roles: ['admin', 'auditor'] }  // 両方のロールが必要
)

// テスト
const user1Decision = confidentialDoc.authorize('charlie', 'read')
// charlie has 'admin' only
// → { type: 'denied', reason: 'requirement-not-met', userRoles: ['admin'] }

roleManager.assignRole('charlie', 'auditor')
const user2Decision = confidentialDoc.authorize('charlie', 'read')
// charlie now has both 'admin' and 'auditor'
// → { type: 'granted', matchedRoles: ['admin', 'auditor'] }
```

### 5.2 動的なロール検証

```typescript
// ロールベースのUI表示制御
class UiController {
  constructor(private roleManager: RoleManager) {}
  
  getAvailableActions(userName: UserName): string[] {
    const permissions = this.roleManager.getUserPermissions(userName)
    const actions: string[] = []
    
    if (permissions.read) {
      actions.push('View Document')
      actions.push('Download')
      actions.push('Print')
    }
    
    if (permissions.write) {
      actions.push('Edit')
      actions.push('Delete')
      actions.push('Share')
    }
    
    const roles = this.roleManager.getUserRoles(userName)
    if (roles.has('admin')) {
      actions.push('Manage Permissions')
      actions.push('View Audit Log')
    }
    
    return actions
  }
}
```

### 5.3 監査とコンプライアンス

```typescript
// アクセスログの記録
class AuditLogger {
  private logs: AuditEntry[] = []
  
  logAccess(
    userName: UserName,
    resource: string,
    action: PermissionAction,
    decision: AuthzDecision
  ) {
    const entry: AuditEntry = {
      timestamp: new Date(),
      userName,
      resource,
      action,
      granted: decision.type === 'granted',
      roles: decision.type === 'granted' 
        ? decision.matchedRoles 
        : (decision as any).userRoles || [],
      reason: decision.type === 'denied' ? decision.reason : undefined
    }
    
    this.logs.push(entry)
  }
  
  // コンプライアンスレポート生成
  generateComplianceReport() {
    const summary = {
      totalAccesses: this.logs.length,
      granted: this.logs.filter(l => l.granted).length,
      denied: this.logs.filter(l => !l.granted).length,
      byRole: new Map<RoleName, number>(),
      byUser: new Map<UserName, number>()
    }
    
    // 集計処理...
    return summary
  }
}

interface AuditEntry {
  timestamp: Date
  userName: UserName
  resource: string
  action: PermissionAction
  granted: boolean
  roles: RoleName[]
  reason?: string
}
```

## 6. テストコード例

### 6.1 基本的なテストケース

```typescript
describe('RBAC Basic Tests', () => {
  let roleManager: RoleManager
  let resource: RbacProtectedResource
  
  beforeEach(() => {
    roleManager = new RoleManager(ROLES)
    resource = new RbacProtectedResource('test.doc', roleManager)
  })
  
  test('viewer can read but not write', () => {
    roleManager.assignRole('alice', 'viewer')
    
    const readDecision = resource.authorize('alice', 'read')
    expect(readDecision.type).toBe('granted')
    
    const writeDecision = resource.authorize('alice', 'write')
    expect(writeDecision.type).toBe('denied')
  })
  
  test('multiple roles merge permissions correctly', () => {
    roleManager.assignRole('bob', 'viewer')
    roleManager.assignRole('bob', 'editor')
    
    const permissions = roleManager.getUserPermissions('bob')
    expect(permissions.read).toBe(true)
    expect(permissions.write).toBe(true)  // editor's write permission
  })
})
```

## 7. まとめ

これらの実装例は、RBACの核心概念を実践的に理解するためのものである。特に重要なポイント：

1. **ロールの再利用性**: 一度定義したロールが複数のリソースで使用される
2. **管理の簡素化**: ロール経由での一元的な権限管理
3. **スケーラビリティ**: ユーザー数やリソース数が増えても管理コストが線形に増加
4. **柔軟性**: 複数ロールの組み合わせによる柔軟な権限設定

ACLとの比較を通じて、RBACがどのように権限管理の複雑さを軽減するかを理解できる。