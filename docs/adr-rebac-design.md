# ADR: ReBAC (Relationship-Based Access Control) 学習用実装の設計

## 1. ステータス

- **日付**: 2025-08-14
- **状態**: 提案
- **決定者**: プロジェクトチーム

## 2. コンテキスト

### 2.1 プロジェクトの背景（権限管理システムの学習用実装）

このプロジェクトは、ユーザーが権限管理システムを学習するための実装サンプルを提供することを目的としています。ReBAC（Relationship-Based Access Control）は、エンティティ間の関係性をグラフ構造で表現し、その関係性から権限を導出する最新の権限管理パターンです。

### 2.2 ReBACの位置づけ（ABACからの発展）

- **ABAC**: 属性とポリシーによる動的な権限評価
  - 利点：柔軟な条件設定、文脈依存の制御
  - 欠点：ポリシーの複雑化、属性管理の負担

- **ReBAC**: 関係性グラフによる権限の推移的導出
  - 利点：自然な組織構造の表現、推移的権限の実現
  - 欠点：グラフ探索のコスト、循環参照の管理

### 2.3 想定する題材（社内ドキュメント管理システム）

学習効果を高めるため、ACL・RBAC・ABACと同様に社内ドキュメント管理システムを題材として選択しました：
- 実行権限は不要（ドキュメントは実行するものではない）
- read（閲覧）とwrite（作成・更新・削除）の2つの権限で十分
- 関係性例：owns（所有）、manages（管理）、memberOf（所属）、delegatedBy（委譲）

### 2.4 ReBACの核心概念の学習

#### 2.4.1 関係性ベースの権限モデル

**従来のモデルとの根本的な違い:**

```
RBAC:  ユーザー → ロール → 権限
ABAC:  属性 → ポリシー → 権限判定
ReBAC: エンティティ → 【関係性グラフ】 → 権限（推移的導出）
```

#### 2.4.2 関係性タプルの概念

ReBACの基本要素は関係性タプル（Relationship Tuple）：
```typescript
(subject, relation, object)
// 例: (alice, owns, document1)
//     (alice, manages, dev-team)
//     (bob, memberOf, dev-team)
```

#### 2.4.3 推移的権限の導出

関係性の連鎖から権限を導出：
```
alice manages dev-team AND bob memberOf dev-team
→ alice can manage bob's resources
```

### 2.5 ABACとReBACの中心概念の違い

| 要素 | ABAC | ReBAC |
|------|------|-------|
| **権限の源泉** | 属性（特性） | 関係性（つながり） |
| **評価方法** | ポリシーで属性を評価 | グラフを探索して関係を発見 |
| **中心概念** | 属性＋ポリシー | 関係性＋グラフ |
| **権限判定** | ルールベース | パス探索ベース |

### 2.6 Google Zanzibarから学ぶReBAC

Google Zanzibarは、YouTube、Drive、Cloudなどで使用されている大規模ReBACシステムです。その核心概念：

1. **関係性タプル**: `(user, relation, object)`の3つ組
2. **関係性の合成**: 複数の関係を組み合わせて新しい関係を導出
3. **一貫性保証**: スナップショットによる読み取り一貫性
4. **性能最適化**: 関係性のキャッシュと並列探索

学習用実装では、Zanzibarの本質的な概念に集中し、分散システムの複雑さは除外します。

### 2.7 権限管理モデルの進化における位置づけ

```
Unix → ACL → RBAC → ABAC → ReBAC
                      ↑       ↑
                   属性評価  関係性探索
                  (ルール)   (グラフ)
```

各モデルから次への発展：
- **ABAC → ReBAC**: 「どんな条件で（What conditions）」から「どんな関係で（What relationships）」への転換
- **属性から関係へ**: 個別属性の評価から、エンティティ間の関係性へ
- **グラフ構造の活用**: 組織や社会の自然な構造をそのままモデル化

## 3. 検討した設計オプション

### 3.1 関係性の表現方法

#### 3.1.1 タプル形式 vs オブジェクト形式

**オプション1: タプル配列**
```typescript
type RelationTuple = [string, string, string]
// ["alice", "owns", "document1"]
```
- 利点：シンプル、メモリ効率的
- 欠点：型安全性が低い、可読性が劣る

**オプション2: オブジェクト形式（採用）**
```typescript
interface RelationTuple {
  subject: EntityId
  relation: RelationType
  object: EntityId
}
```
- 利点：型安全、自己文書化、IDE支援
- 欠点：若干冗長
- **学習用として最適**：概念が明確

#### 3.1.2 関係性の型定義

**オプション1: 文字列ベース**
```typescript
type RelationType = string
```
- 利点：柔軟性が高い
- 欠点：typoの危険性

**オプション2: Union型（採用）**
```typescript
type RelationType = 'owns' | 'manages' | 'memberOf' | 'delegatedBy' | 'viewer' | 'editor'
```
- 利点：型安全、IDE補完、学習時に利用可能な関係が明確
- 欠点：拡張時に型定義の変更が必要

### 3.2 グラフ構造の実装

#### 3.2.1 隣接リスト vs 隣接行列

**オプション1: 隣接リスト（採用）**
```typescript
type AdjacencyList = Map<EntityId, Map<RelationType, Set<EntityId>>>
```
- 利点：メモリ効率的、スパースグラフに適切、動的な追加削除が容易
- 欠点：特定の関係の存在確認がO(1)でない場合がある

**オプション2: 隣接行列**
```typescript
type AdjacencyMatrix = boolean[][][]  // [subject][relation][object]
```
- 利点：関係の存在確認がO(1)
- 欠点：メモリ使用量が多い、動的なサイズ変更が困難

**学習用として隣接リストを選択した理由:**
- 実際のReBACシステムに近い実装
- 関係の追加・削除が直感的
- グラフ理論の基本的なデータ構造を学習

### 3.3 探索アルゴリズム

#### 3.3.1 BFS vs DFS

**オプション1: 幅優先探索（BFS）（採用）**
```typescript
function checkRelationBFS(subject: EntityId, relation: RelationType, object: EntityId): RelationPath | null
```
- 利点：最短パスを発見、循環検出が容易、レベル制限が簡単
- 欠点：メモリ使用量が多い（キューを使用）

**オプション2: 深さ優先探索（DFS）**
```typescript
function checkRelationDFS(subject: EntityId, relation: RelationType, object: EntityId): RelationPath | null
```
- 利点：メモリ効率的（スタックを使用）
- 欠点：最短パスを保証しない、深い再帰の可能性

**BFSを選択した理由:**
- 権限チェックでは最短の関係パスが重要
- デバッグ時に関係の「距離」が分かりやすい
- 無限ループの防止が容易

### 3.4 推移的関係の深さ制限

#### 3.4.1 制限なし vs 段階的制限

**オプション1: 無制限探索**
- 利点：すべての可能な関係を発見
- 欠点：性能問題、無限ループのリスク

**オプション2: 固定深さ制限**
```typescript
const MAX_DEPTH = 3  // 3ホップまで
```
- 利点：性能が予測可能、無限ループ防止
- 欠点：正当な深い関係を見逃す可能性

**オプション3: 段階的学習アプローチ（採用）**
```typescript
interface ReBACConfig {
  maxDepth: number  // デフォルト: 3、学習段階で調整可能
}
```
- Phase 1: 直接関係のみ（depth = 1）
- Phase 2: 2ホップ関係（depth = 2）
- Phase 3: 実用的な深さ（depth = 3-5）

### 3.5 権限の導出ルール

#### 3.5.1 関係性から権限への変換

**オプション1: ハードコードされたマッピング**
```typescript
const RELATION_TO_PERMISSION = {
  'owns': ['read', 'write'],
  'editor': ['read', 'write'],
  'viewer': ['read']
}
```
- 利点：シンプル、高速
- 欠点：柔軟性に欠ける

**オプション2: ルールベース（採用）**
```typescript
interface PermissionRule {
  relation: RelationType
  permissions: PermissionBits
  description: string
}

const PERMISSION_RULES: PermissionRule[] = [
  { relation: 'owns', permissions: { read: true, write: true }, description: '所有者は全権限' },
  { relation: 'manages', permissions: { read: true, write: true }, description: '管理者は全権限' },
  { relation: 'editor', permissions: { read: true, write: true }, description: '編集者は読み書き可能' },
  { relation: 'viewer', permissions: { read: true, write: false }, description: '閲覧者は読み取りのみ' }
]
```
- 利点：拡張性、自己文書化、学習時に理解しやすい
- 欠点：若干の複雑さ

### 3.6 Deny機能の扱い

#### 3.6.1 ReBACにおけるDenyの位置づけ

**従来モデルのDeny:**
- ACL: 明示的なDenyエントリー
- RBAC: 通常Denyなし（ポジティブモデル）
- ABAC: DenyポリシーとPermitポリシー

**ReBACでのアプローチ:**

**オプション1: Denyなし（Zanzibar型）**
- 関係があれば許可、なければ拒否
- シンプルで理解しやすい

**オプション2: 否定的関係（採用）**
```typescript
type RelationType = 'owns' | 'manages' | 'blocked' | 'restricted'
// blockedやrestrictedは否定的な関係
```
- 利点：より現実的なモデリング
- 欠点：権限評価の複雑化

**学習用実装での扱い:**
- 基本実装ではDenyなし（シンプルさ優先）
- 発展課題として否定的関係を追加可能

### 3.7 循環参照の検出

#### 3.7.1 訪問済みノードの管理

```typescript
class CycleDetector {
  private visited: Set<EntityId> = new Set()
  
  checkCycle(current: EntityId): boolean {
    if (this.visited.has(current)) {
      return true  // 循環を検出
    }
    this.visited.add(current)
    return false
  }
}
```

BFS実装により、訪問済みノードの管理で自然に循環を回避できます。

### 3.8 探索アルゴリズムの業界標準

#### 3.8.1 主要ReBAC実装の探索方法

BFS（幅優先探索）は**ReBACの標準的な探索方法**であり、Google Zanzibar固有ではなく、グラフベースの権限管理において一般的なアプローチです：

| システム/ライブラリ | 探索方法 | 特徴 |
|-------------------|---------|------|
| **Google Zanzibar** | BFS + 並列探索 | 分散システムで並列化、キャッシュ活用 |
| **SpiceDB** | BFS（デフォルト） | Zanzibarインスパイア、最短パス重視 |
| **OpenFGA** | BFS + 最適化 | 条件付き探索、早期終了 |
| **Ory Keto** | BFS | シンプルな実装 |
| **OPA (Rego)** | 宣言的（内部はBFS的） | ルール言語で記述 |

#### 3.8.2 BFSが標準となる理由

```typescript
// 組織構造での例
// CEO
//  ├─ CTO ─── Alice
//  └─ CFO ─┬─ Bob
//          └─ Charlie ─── Document

// BFS: レベルごとに探索
// Level 1: CEO → [CTO, CFO]
// Level 2: [CTO, CFO] → [Alice, Bob, Charlie]
// Level 3: [Alice, Bob, Charlie] → Document（最短パス保証）

// DFS: 深さ優先では効率が悪く、最短パスを保証しない
```

**BFSが選ばれる理由：**
1. **最短パスの保証**: 権限の根拠として最短の関係パスが望ましい
2. **循環検出の容易さ**: visitedセットで簡単に管理
3. **デバッグの容易さ**: レベルごとの探索で関係の「距離」が明確
4. **予測可能な性能**: 深さ制限との相性が良い

#### 3.8.3 Zanzibar特有の最適化

Zanzibarは基本的なBFSに加えて、分散システム向けの最適化を実装：

```typescript
// Zanzibar型の並列探索（簡略化）
class ZanzibarStyleExplorer {
  async findRelation(subject: string, object: string) {
    const promises = [
      this.searchForward(subject, object),   // 前方探索
      this.searchBackward(object, subject),  // 後方探索
      this.checkCached(subject, object)      // キャッシュ
    ]
    return Promise.race(promises)  // 最速の結果を採用
  }
}
```

**まとめ：**
- BFSはReBAC全般の標準（グラフ探索の基本）
- Zanzibarの貢献は分散環境での最適化手法
- 学習用実装では純粋なBFSで十分

## 4. 決定事項

### 4.1 採用した設計

#### 4.1.1 関係性タプルによるモデル化

```typescript
// エンティティ識別子
export type EntityId = string  // 学習用：実システムではUUIDなど

// 関係性の種類
export type RelationType = 
  | 'owns'        // 所有関係
  | 'manages'     // 管理関係
  | 'memberOf'    // 所属関係
  | 'delegatedBy' // 委譲関係
  | 'viewer'      // 閲覧者権限
  | 'editor'      // 編集者権限

// 関係性タプル
export interface RelationTuple {
  subject: EntityId     // 主体（ユーザーやグループ）
  relation: RelationType // 関係の種類
  object: EntityId      // 客体（リソースやグループ）
}

// 関係性パス（権限の根拠）
export type RelationPath = RelationTuple[]
```

#### 4.1.2 グラフ構造の実装

隣接リストによる効率的なグラフ表現：

```typescript
export class RelationGraph {
  // subject -> relation -> objects のマッピング
  private adjacencyList: Map<EntityId, Map<RelationType, Set<EntityId>>>
  
  // 逆方向の索引（object -> relation -> subjects）
  private reverseIndex: Map<EntityId, Map<RelationType, Set<EntityId>>>
  
  addRelation(tuple: RelationTuple): void
  removeRelation(tuple: RelationTuple): void
  hasDirectRelation(subject: EntityId, relation: RelationType, object: EntityId): boolean
}
```

#### 4.1.3 BFSによる関係性探索

```typescript
export class RelationshipExplorer {
  constructor(
    private graph: RelationGraph,
    private config: ReBACConfig = { maxDepth: 3 }
  )
  
  // 関係性の探索（最短パスを返す）
  findRelationPath(
    subject: EntityId,
    targetRelation: RelationType,
    object: EntityId
  ): RelationPath | null {
    // BFSによる実装
    // 訪問済みノードの管理で循環を回避
    // maxDepthで探索を制限
  }
}
```

#### 4.1.4 権限評価のインターフェース

```typescript
export class ReBACProtectedResource {
  constructor(
    private resourceId: EntityId,
    private graph: RelationGraph,
    private permissionRules: PermissionRule[]
  )
  
  // 業界標準に合わせたメソッド名
  checkRelation(
    subject: EntityId,
    action: PermissionAction
  ): ReBACDecision {
    // Step 1: 必要な関係性を特定（permissionRulesから導出）
    const requiredRelations = this.getRequiredRelations(action)
    
    // Step 2: 各関係性についてグラフを探索
    for (const relation of requiredRelations) {
      const path = this.findPathToResource(subject, relation)
      if (path) {
        return { type: 'granted', path, relation }
      }
    }
    
    // Step 3: 結果を構築
    return { 
      type: 'denied', 
      reason: 'no-relation',
      searchedRelations: requiredRelations
    }
  }
  
  // ヘルパーメソッド：アクションに必要な関係性を取得
  private getRequiredRelations(action: PermissionAction): RelationType[] {
    return this.permissionRules
      .filter(rule => rule.permissions[action] === true)
      .map(rule => rule.relation)
  }
}
```

#### 4.1.5 Tagged Unionによる結果表現

```typescript
export type ReBACDecision = 
  | { 
      type: 'granted'
      path: RelationPath  // 権限の根拠となる関係性パス
      relation: RelationType  // マッチした関係
    }
  | { 
      type: 'denied'
      reason: 'no-relation'  // 必要な関係性が見つからない
      searchedRelations: RelationType[]  // 探索した関係
    }
  | {
      type: 'denied'
      reason: 'max-depth-exceeded'  // 探索深度の制限
      maxDepth: number
    }
```

### 4.2 型定義の詳細

#### 4.2.1 基本型

```typescript
// エンティティ識別子
export type EntityId = string

// 権限ビット（他の実装と共通）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits

// 関係性の種類
export type RelationType = 
  | 'owns'        // 所有関係
  | 'manages'     // 管理関係
  | 'memberOf'    // 所属関係
  | 'delegatedBy' // 委譲関係
  | 'viewer'      // 閲覧者権限
  | 'editor'      // 編集者権限

// 関係性タプル
export interface RelationTuple {
  subject: EntityId
  relation: RelationType
  object: EntityId
}

// 権限ルール
export interface PermissionRule {
  relation: RelationType
  permissions: PermissionBits
  description: string
}

// 設定
export interface ReBACConfig {
  maxDepth: number  // 探索の最大深度（デフォルト: 3）
  enableCaching?: boolean  // 探索結果のキャッシュ（オプション）
}
```

#### 4.2.2 グラフ関連の型

```typescript
// 関係性パス（探索結果）
export type RelationPath = RelationTuple[]

// 探索状態（内部使用）
interface SearchState {
  current: EntityId
  path: RelationPath
  depth: number
  visited: Set<EntityId>
}

// キャッシュエントリー（オプション）
interface CacheEntry {
  path: RelationPath | null
  timestamp: number
}
```

### 4.3 API設計

#### 4.3.1 RelationGraph API

```typescript
export class RelationGraph {
  addRelation(tuple: RelationTuple): void
  removeRelation(tuple: RelationTuple): void
  hasDirectRelation(subject: EntityId, relation: RelationType, object: EntityId): boolean
  getRelations(subject: EntityId, relation?: RelationType): RelationTuple[]
  getReverseRelations(object: EntityId, relation?: RelationType): RelationTuple[]
  clear(): void
}
```

#### 4.3.2 ReBACProtectedResource API

```typescript
export class ReBACProtectedResource {
  constructor(
    resourceId: EntityId,
    graph: RelationGraph,
    permissionRules?: PermissionRule[]
  )
  
  // 主要メソッド（他の実装と一貫性のある命名）
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision
  
  // ヘルパーメソッド
  getRequiredRelations(action: PermissionAction): RelationType[]
  explainAccess(subject: EntityId): Map<PermissionAction, ReBACDecision>
}
```

### 4.4 他の実装との一貫性

#### 4.4.1 共通の型定義

- `PermissionBits`: 全実装で共通
- `PermissionAction`: 統一されたインターフェース
- Tagged Union: 一貫した結果表現

#### 4.4.2 メソッド名の使い分け

| 権限モデル | メソッド名 | 理由 |
|-----------|-----------|------|
| Unix | `hasPermission` | 権限の有無を確認 |
| ACL | `resolveAccess` | Allow/Denyエントリーの競合を解決 |
| RBAC | `authorize` | 業界標準の認可用語 |
| ABAC | `evaluate` | ルール・属性を評価 |
| **ReBAC** | **`checkRelation`** | **関係性を確認** |

### 4.5 実装の詳細解説

#### 4.5.1 checkRelationメソッドの完全な実装例

```typescript
export class ReBACProtectedResource {
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision {
    // === 具体例: alice が project-doc.md への write 権限をチェック ===
    
    // Step 1: writeアクションに必要な関係性を特定
    const requiredRelations = this.getRequiredRelations('write')
    // → ['owns', 'manages', 'editor'] (permissionRulesから導出)
    
    // Step 2: 推移的な関係性探索
    for (const relation of requiredRelations) {
      // 'manages'関係での探索例
      const path = this.explorer.findRelationPath(
        subject,           // 'alice'
        this.resourceId    // 'project-doc.md'
      )
      
      // 探索結果のパス:
      // [
      //   { subject: 'alice', relation: 'manages', object: 'dev-team' },
      //   { subject: 'bob', relation: 'memberOf', object: 'dev-team' },
      //   { subject: 'bob', relation: 'owns', object: 'project-doc.md' }
      // ]
      
      if (path && this.validatePath(path, relation)) {
        return {
          type: 'granted',
          path: path,
          relation: relation
        }
      }
    }
    
    return {
      type: 'denied',
      reason: 'no-relation',
      searchedRelations: requiredRelations
    }
  }
}
```

#### 4.5.2 BFS探索アルゴリズムの詳細実装

```typescript
class RelationshipExplorer {
  findRelationPath(
    subject: EntityId,
    targetObject: EntityId
  ): RelationPath | null {
    // BFSのためのキュー（各要素: 現在位置、経路、深さ）
    const queue: SearchState[] = [{
      current: subject,
      path: [],
      depth: 0
    }]
    
    const visited = new Set<EntityId>()
    visited.add(subject)
    
    while (queue.length > 0) {
      const { current, path, depth } = queue.shift()!
      
      // 深さ制限チェック
      if (depth >= this.config.maxDepth) continue
      
      // 目的地に到達したか確認
      const relations = this.graph.getRelations(current)
      for (const tuple of relations) {
        if (tuple.object === targetObject) {
          // 到達！完全なパスを返す
          return [...path, tuple]
        }
        
        // まだ訪問していないノードをキューに追加
        if (!visited.has(tuple.object)) {
          visited.add(tuple.object)
          queue.push({
            current: tuple.object,
            path: [...path, tuple],
            depth: depth + 1
          })
        }
      }
    }
    
    return null  // 関係性が見つからない
  }
}
```

#### 4.5.3 具体的なシナリオでの動作トレース

```typescript
// === シナリオ: Aliceがproject-doc.mdにアクセス ===
// グラフ構造:
// alice --manages--> dev-team
// bob --memberOf--> dev-team  
// bob --owns--> project-doc.md

// checkRelation('alice', 'write') の実行トレース:

// 1. getRequiredRelations('write')
//    → ['owns', 'manages', 'editor']

// 2. BFS探索開始
//    初期: queue = [{current: 'alice', path: [], depth: 0}]

// 3. Loop 1: alice を処理
//    - alice --owns--> project-doc.md? → ❌
//    - alice --manages--> dev-team → キューに追加
//    queue = [{current: 'dev-team', path: [alice manages dev-team], depth: 1}]

// 4. Loop 2: dev-team を処理
//    - dev-team から逆引きで bob を発見
//    queue = [{current: 'bob', path: [..., bob memberOf dev-team], depth: 2}]

// 5. Loop 3: bob を処理
//    - bob --owns--> project-doc.md → ✅ 発見！
//    
// 6. 結果: granted
//    path: [
//      alice manages dev-team,
//      bob memberOf dev-team,
//      bob owns project-doc.md
//    ]
```

この実装により、「Aliceがチームを管理し、Bobがそのメンバーで、Bobがドキュメントを所有」という推移的な関係から権限が導出されます。これがReBACの核心的な特徴です。

## 5. 理由と根拠

### 5.1 学習効果の最大化

#### 5.1.1 ReBACの核心概念への集中

- 関係性グラフの構築と探索
- 推移的権限の理解
- 組織構造の自然なモデリング

#### 5.1.2 グラフ理論の実践的学習

- BFS/DFSアルゴリズムの応用
- 循環検出の実装
- パス探索の最適化

#### 5.1.3 他モデルとの比較学習

- RBAC: 静的なロール → ReBAC: 動的な関係性
- ABAC: ルール評価 → ReBAC: グラフ探索
- 管理コストと表現力のトレードオフ

### 5.2 設計の簡潔性

#### 5.2.1 不要な複雑性の排除

以下の要素は意図的に除外：
- 分散システムの考慮（Zanzibarのレプリケーション等）
- 複雑なキャッシュ戦略
- 並列探索の実装
- 時間ベースの関係性

#### 5.2.2 段階的な学習パス

1. 直接関係のみ（1ホップ）
2. 間接関係（2-3ホップ）
3. 複雑な組織構造のモデリング
4. （将来）否定的関係の追加

### 5.3 実用性への配慮

#### 5.3.1 実システムへの適用可能性

- Zanzibarの基本概念を採用
- SpiceDB、OPAなどの実装パターンを参考
- 将来的な拡張を考慮した設計

#### 5.3.2 デバッグとトレーサビリティ

- 関係性パスの記録により権限の根拠が明確
- 探索過程の可視化が可能
- 循環や深度制限の理由を明示

## 6. 結果と影響

### 6.1 利点

#### 6.1.1 柔軟な権限表現

- 組織の自然な構造をそのまま表現
- 新しい関係性の追加が容易
- 推移的な権限の自動導出

#### 6.1.2 スケーラブルな設計

- 関係性の追加がO(1)
- 局所的な変更で権限が更新
- ネットワーク効果による権限の伝播

#### 6.1.3 監査性の向上

- 権限の根拠（関係性パス）が明確
- アクセス履歴の追跡が容易
- コンプライアンス要件への対応

### 6.2 トレードオフ

#### 6.2.1 性能 vs 表現力

採用：表現力を優先（学習用）
- グラフ探索のコストを許容
- 最適化は段階的に学習
- 実用では要キャッシュ

#### 6.2.2 単純性 vs 完全性

採用：単純性を優先
- Zanzibarの全機能は実装しない
- 核心概念に集中
- 将来の拡張余地を残す

### 6.3 将来の拡張性

#### 6.3.1 否定的関係の追加

```typescript
type RelationType = ... | 'blocked' | 'restricted'
// 否定的関係の優先評価
```

#### 6.3.2 条件付き関係

```typescript
interface ConditionalRelation extends RelationTuple {
  condition?: (context: Context) => boolean
  validUntil?: Date
}
```

#### 6.3.3 ハイブリッドモデル

ABAC + ReBAC の組み合わせ：
- 関係性ベースの基本権限
- 属性による追加条件

## 7. 実装例

### 7.1 基本的な使用例

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

### 7.2 推移的権限の例

```typescript
// 複雑な組織構造
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

### 7.3 委譲関係のモデリング

```typescript
// 権限の一時的な委譲
const delegateAccess = (from: EntityId, to: EntityId, resource: EntityId) => {
  graph.addRelation({
    subject: to,
    relation: 'delegatedBy',
    object: from
  })
  
  // 委譲元が持つ権限を委譲先も取得
  const originalRelations = graph.getRelations(from)
  // 委譲ロジックの実装...
}

// Alice が Charlie に一時的に権限を委譲
delegateAccess('alice', 'charlie', 'sensitive-doc')

// Charlie は委譲された権限でアクセス
const charlieAccess = document.checkRelation('charlie', 'read')
// → granted (パス: [charlie delegatedBy alice, alice owns sensitive-doc])
```

### 7.4 グループベースの権限管理

```typescript
// グループとロールの組み合わせ
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

### 7.5 循環参照の検出例

```typescript
// 循環的な管理構造（エラーケース）
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

## 8. テスト戦略

### 8.1 単体テスト

必須のテストケース：

1. **基本的な関係性テスト**
   - 直接関係の追加・削除
   - 関係の存在確認
   - 逆方向の索引

2. **探索アルゴリズムテスト**
   - 1ホップの直接関係
   - 2-3ホップの推移的関係
   - 最短パスの発見
   - 循環の検出と回避

3. **権限評価テスト**
   - 各関係タイプでの権限チェック
   - 複数の関係パスがある場合
   - 関係が存在しない場合

4. **境界値テスト**
   - 最大深度での探索
   - 空のグラフ
   - 大規模グラフ（性能テスト）

### 8.2 統合テスト

シナリオベースのテスト：

1. **組織構造のモデリング**
   - 階層的な管理構造
   - マトリックス組織
   - プロジェクトベースのチーム

2. **権限の委譲と取り消し**
   - 一時的な権限委譲
   - 委譲の連鎖
   - 委譲の取り消し

3. **動的な組織変更**
   - チームの再編成
   - メンバーの異動
   - 権限の昇格・降格

4. **複雑なアクセスパターン**
   - 複数経路での権限
   - グループとの組み合わせ
   - 否定的関係（将来実装）

### 8.3 性能テスト

1. **スケーラビリティ**
   - 1000ノード、10000エッジのグラフ
   - 探索時間の測定
   - メモリ使用量の監視

2. **最適化の検証**
   - キャッシュの効果測定
   - インデックスの有効性
   - 並列探索（将来実装）

## 9. 参考情報

### 9.1 ReBAC関連の文献

- [Zanzibar: Google's Consistent, Global Authorization System](https://research.google/pubs/pub48190/)
- [ReBAC: A Relation-Based Access Control Model](https://www.cs.purdue.edu/homes/ninghui/papers/rebac_dbsec05.pdf)
- [Relationship-Based Access Control: Its Expression and Enforcement](https://dl.acm.org/doi/10.1145/3133956.3134028)

### 9.2 実装例とライブラリ

- **Zanzibar** (Google): YouTubeやGoogleDriveで使用
- **SpiceDB** (AuthZed): Zanzibarインスパイア、オープンソース
- **Ory Keto**: Zanzibarベース、Go実装
- **OpenFGA** (Auth0/Okta): Zanzibarインスパイア、CNCF
- **OPA (Open Policy Agent)**: Regoによる関係性表現も可能

### 9.3 関連するADR

- Unix権限実装のADR
- ACL実装のADR
- RBAC実装のADR
- ABAC実装のADR

## 10. まとめ

このReBAC実装は、権限管理の最新パラダイムである関係性ベースのアクセス制御を学習するために設計されています。ABACの動的な評価から、さらに一歩進んで、エンティティ間の関係性グラフから権限を推移的に導出する手法を体験できます。

Google Zanzibarの核心概念を採用しながら、学習用として必要十分な機能に絞り込むことで、ReBACの本質的な仕組みを理解できる設計となっています。グラフ理論の実践的な応用を通じて、現代的な権限管理システムの実装パターンを習得できます。

最小限のAPIと明確な型定義により、関係性グラフの構築から権限の推移的導出まで、ReBACの全体像を段階的に学習できる構成となっています。