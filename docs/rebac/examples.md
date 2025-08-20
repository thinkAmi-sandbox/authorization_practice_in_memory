# ReBAC 実装例

このドキュメントでは、ReBAC（Relationship-Based Access Control）の様々な実装例を示します。

## 1. 基本的な使用例

### 1.1 シンプルな組織構造

```typescript
// Step 1: グラフの構築
const graph = new RelationGraph()

// Step 2: 組織構造の定義
// Alice はエンジニアリングチームを管理
graph.addRelation({
  subject: 'alice',
  relation: 'manages',
  object: 'engineering-team'
})

// Bob はエンジニアリングチームのメンバー
graph.addRelation({
  subject: 'bob',
  relation: 'memberOf',
  object: 'engineering-team'
})

// Bob はドキュメントを所有
graph.addRelation({
  subject: 'bob',
  relation: 'owns',
  object: 'design-doc.md'
})

// Step 3: リソースの保護
const document = new ReBACProtectedResource(
  'design-doc.md',
  graph,
  [
    { relation: 'owns', permissions: { read: true, write: true }, description: '所有者' },
    { relation: 'manages', permissions: { read: true, write: true }, description: '管理者' },
    { relation: 'viewer', permissions: { read: true, write: false }, description: '閲覧者' }
  ]
)

// Step 4: アクセスチェック
// Bob（所有者）は直接アクセス可能
const bobAccess = document.checkRelation('bob', 'write')
// → granted (パス: [bob owns design-doc.md])

// Alice（マネージャー）は推移的にアクセス可能
const aliceAccess = document.checkRelation('alice', 'write')
// → granted (パス: [alice manages engineering-team, bob memberOf engineering-team, bob owns design-doc.md])
```

### 1.2 型安全な関係作成

```typescript
// 型安全な関係ビルダーの定義
const ResourceRelations = {
  owns: (subject: EntityId, resource: EntityId): ResourceRelationTuple => 
    ({ subject, relation: 'owns', object: resource }),
  
  edits: (subject: EntityId, resource: EntityId): ResourceRelationTuple =>
    ({ subject, relation: 'editor', object: resource }),
  
  views: (subject: EntityId, resource: EntityId): ResourceRelationTuple =>
    ({ subject, relation: 'viewer', object: resource }),
}

const EntityRelations = {
  manages: (manager: EntityId, team: EntityId): EntityRelationTuple =>
    ({ subject: manager, relation: 'manages', object: team }),
  
  memberOf: (user: EntityId, group: EntityId): EntityRelationTuple =>
    ({ subject: user, relation: 'memberOf', object: group }),
  
  delegatedBy: (user: EntityId, delegator: EntityId): EntityRelationTuple =>
    ({ subject: user, relation: 'delegatedBy', object: delegator }),
}

// 型安全な実装
const graph = new RelationGraph()

// 関係の種類が型レベルで保証される
graph.addRelation(EntityRelations.manages('alice', 'engineering-team'))
graph.addRelation(EntityRelations.memberOf('bob', 'engineering-team'))
graph.addRelation(ResourceRelations.owns('bob', 'design-doc.md'))

// コンパイルエラーになる誤った使用
// graph.addRelation(ResourceRelations.owns('alice', 'engineering-team'))  // ❌
// graph.addRelation(EntityRelations.manages('alice', 'design-doc.md'))    // ❌
```

## 2. 推移的権限の例

### 2.1 複雑な組織階層

```typescript
const setupOrganization = () => {
  // CEO → CTO → Engineering Team → Developers
  graph.addRelation({ subject: 'ceo', relation: 'manages', object: 'company' })
  graph.addRelation({ subject: 'cto', relation: 'memberOf', object: 'company' })
  graph.addRelation({ subject: 'cto', relation: 'manages', object: 'tech-dept' })
  graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'tech-dept' })
  graph.addRelation({ subject: 'alice', relation: 'manages', object: 'dev-team' })
  graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'dev-team' })
  
  // プロジェクトドキュメント
  graph.addRelation({ subject: 'dev-team', relation: 'owns', object: 'project-docs' })
}

// CEOは3ホップでプロジェクトドキュメントにアクセス可能
// パス: CEO → Company → CTO → Tech Dept → Alice → Dev Team → Project Docs
```

### 2.2 委譲関係のモデリング

```typescript
// 権限の一時的な委譲
const delegateAccess = (from: EntityId, to: EntityId) => {
  graph.addRelation({
    subject: to,
    relation: 'delegatedBy',
    object: from
  })
}

// Alice が Charlie に一時的に権限を委譲
delegateAccess('alice', 'charlie')

// Charlie は委譲された権限でアクセス
const charlieAccess = document.checkRelation('charlie', 'read')
// → granted (パス: [charlie delegatedBy alice, alice owns sensitive-doc])
```

## 3. グループベースの権限管理

```typescript
class GroupBasedReBAC {
  setupGroupPermissions() {
    // グループの定義
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'admins' })
    graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'editors' })
    graph.addRelation({ subject: 'charlie', relation: 'memberOf', object: 'viewers' })
    
    // グループに権限を付与
    graph.addRelation({ subject: 'admins', relation: 'editor', object: 'all-docs' })
    graph.addRelation({ subject: 'editors', relation: 'editor', object: 'public-docs' })
    graph.addRelation({ subject: 'viewers', relation: 'viewer', object: 'public-docs' })
  }
  
  checkGroupAccess(user: EntityId, doc: EntityId): ReBACDecision {
    // ユーザー → グループ → 権限の推移的な探索
    return document.checkRelation(user, 'write')
  }
}
```

## 4. チーム横断プロジェクト

```typescript
// 組織構築ヘルパー関数
const createDepartment = (
  managerId: EntityId,
  deptId: EntityId,
  memberIds: EntityId[]
): RelationTuple[] => [
  EntityRelations.manages(managerId, deptId),
  ...memberIds.map(memberId => EntityRelations.memberOf(memberId, deptId))
]

const createProjectResources = (
  projectId: EntityId,
  documentIds: EntityId[]
): RelationTuple[] => 
  documentIds.map(docId => ResourceRelations.owns(projectId, docId))

// チーム横断プロジェクトの設定
const setupCrossFunctionalProject = () => {
  const graph = new RelationGraph()
  
  // 機能組織の構築
  const engineering = createDepartment('alice', 'eng-dept', ['bob', 'charlie'])
  const design = createDepartment('diana', 'design-dept', ['eve', 'frank'])
  
  // プロジェクト固有のリソース
  const projectResources = createProjectResources('mobile-project', [
    'mobile-spec.md',
    'mobile-design.figma', 
    'mobile-requirements.md'
  ])
  
  // プロジェクトチームの構成
  const projectTeam = [
    EntityRelations.memberOf('bob', 'mobile-project'),      // エンジニア参加
    EntityRelations.memberOf('eve', 'mobile-project'),      // デザイナー参加
    ResourceRelations.edits('mobile-project', 'mobile-spec.md'),
    ResourceRelations.views('design-dept', 'mobile-spec.md'),
  ]
  
  // すべての関係をグラフに追加
  const allRelations = [...engineering, ...design, ...projectResources, ...projectTeam]
  allRelations.forEach(relation => graph.addRelation(relation))
  
  return graph
}
```

## 5. 他の権限モデルとの比較

### 5.1 同一シナリオでの実装比較

**シナリオ**: エンジニアリング部門のAliceが、財務部門のBobが作成したドキュメントにアクセスしたい

#### ACL（個別権限設定）
```typescript
const financialDoc = new AclProtectedResource('budget-2024.xlsx')
financialDoc.addEntry({
  type: 'allow',
  subject: { type: 'user', name: 'alice' },
  permissions: { read: true, write: false }
})
// → 管理コスト: O(ユーザー数 × リソース数)
```

#### RBAC（ロール経由）
```typescript
const roleManager = new RoleManager(ROLES)
roleManager.assignRole('alice', 'cross-department-viewer')
const financialDoc = new RbacProtectedResource('budget-2024.xlsx', roleManager)
const result = financialDoc.authorize('alice', 'read')
// → 管理コスト: O(ユーザー数 + ロール数)
```

#### ABAC（属性評価）
```typescript
const crossDepartmentPolicy: PolicyRule = {
  id: 'cross-dept-read',
  effect: 'permit',
  condition: (ctx) => {
    return ctx.subject.clearanceLevel >= 3 &&
           ctx.environment.location === 'office' &&
           ctx.environment.currentTime.getHours() >= 9
  }
}
// → 管理コスト: O(ポリシー数)、動的評価
```

#### ReBAC（関係性ベース）
```typescript
graph.addRelation({ subject: 'alice', relation: 'collaboratesWith', object: 'bob' })
graph.addRelation({ subject: 'bob', relation: 'owns', object: 'budget-2024.xlsx' })
graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'tech-leads' })
graph.addRelation({ subject: 'tech-leads', relation: 'viewer', object: 'financial-docs' })

const result = document.checkRelation('alice', 'read')
// → 管理コスト: O(関係性数)、推移的導出
```

### 5.2 管理性の比較

| 権限モデル | 新規ユーザー追加 | 権限変更の影響範囲 | 組織変更への対応 |
|-----------|-----------------|-------------------|-----------------|
| **ACL** | 各リソースで個別設定 | 単一リソースのみ | 全リソースを個別更新 |
| **RBAC** | ロール割り当てのみ | 全ユーザーに即座に反映 | ロール定義の更新のみ |
| **ABAC** | 属性設定のみ | ポリシー変更で全体に反映 | 属性やポリシーの更新 |
| **ReBAC** | 関係性設定のみ | 関係性変更で推移的に反映 | グラフ構造の更新 |

## 6. 段階的学習のシナリオ

### Phase 1: 直接関係のみ（深度1）

```typescript
class DirectRelationExample {
  setupBasicRelations() {
    // 所有関係（直接）
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'alice-notes.md' })
    
    // 編集権限（直接）
    graph.addRelation({ subject: 'bob', relation: 'editor', object: 'shared-doc.md' })
    
    // 閲覧権限（直接）
    graph.addRelation({ subject: 'charlie', relation: 'viewer', object: 'public-doc.md' })
  }
  
  testDirectAccess() {
    const aliceResult = document.checkRelation('alice', 'write')
    // パス: [alice owns alice-notes.md] - 深度1
  }
}
```

### Phase 2: 間接関係（深度2-3）

```typescript
class IndirectRelationExample {
  setupTeamStructure() {
    // チームメンバーシップ
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'dev-team' })
    graph.addRelation({ subject: 'dev-team', relation: 'editor', object: 'team-docs' })
    
    // チーム管理
    graph.addRelation({ subject: 'tech-lead', relation: 'manages', object: 'dev-team' })
  }
  
  testIndirectAccess() {
    const aliceResult = document.checkRelation('alice', 'write')
    // パス: [alice memberOf dev-team, dev-team editor team-docs] - 深度2
  }
}
```

### Phase 3: 複雑な組織構造

実際の組織の複雑な関係性をモデル化し、深度3-5の探索を行います。

## 7. エラーケースと対策

### 循環参照の検出

```typescript
const detectCycle = () => {
  // A manages B, B manages C, C manages A（循環）
  graph.addRelation({ subject: 'teamA', relation: 'manages', object: 'teamB' })
  graph.addRelation({ subject: 'teamB', relation: 'manages', object: 'teamC' })
  graph.addRelation({ subject: 'teamC', relation: 'manages', object: 'teamA' })
  
  // BFSの訪問済みノード管理により循環を検出
  const explorer = new RelationshipExplorer(graph)
  const result = explorer.findRelationPath('teamA', 'manages', 'teamA')
  // → 循環を検出して探索を停止
}
```

## まとめ

これらの例は、ReBACの柔軟性と表現力を示しています。関係性グラフにより、複雑な組織構造や権限体系を自然にモデル化でき、推移的な権限導出により管理コストを削減できます。