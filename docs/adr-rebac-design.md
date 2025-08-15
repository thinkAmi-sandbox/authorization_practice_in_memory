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

### 2.6 ReBACの核心概念の学習

ReBACの学習において重要な概念：

1. **エンティティ（Entity）**: ユーザー、グループ、リソースなどの対象
2. **関係性（Relationship）**: エンティティ間のつながり
3. **関係性タプル（Tuple）**: `(subject, relation, object)`の3つ組でエンティティ間の関係を表現
4. **推移的権限（Transitive Permission）**: 関係の連鎖から権限を導出
5. **グラフ探索（Graph Traversal）**: 関係性ネットワークを辿って権限の根拠を発見

### 2.7 主要ReBACシステムの学習

#### 2.7.1 Google Zanzibar - ReBACの先駆者

Google Zanzibarは、YouTube、Drive、Cloudなどで使用されている大規模ReBACシステムです。その核心概念：

1. **関係性タプル**: `(user, relation, object)`の3つ組
2. **関係性の合成**: 複数の関係を組み合わせて新しい関係を導出
3. **一貫性保証**: スナップショットによる読み取り一貫性
4. **性能最適化**: 関係性のキャッシュと並列探索

#### 2.7.2 実際のReBACライブラリの実装パターン

主要なReBACライブラリの実装パターンを調査し、学習用実装の参考にします：

**完全なReBACサポート 🏗️**

**SpiceDB (AuthZed)** - Zanzibarインスパイア
```
// Schema定義による関係性の記述
definition document {
  relation owner: user
  relation editor: user | group#member
  permission edit = owner + editor
}
```
- Zanzibarの概念を忠実に実装
- 専用のスキーマ言語でリレーションを定義
- グラフ最適化とキャッシュを内蔵

**OpenFGA (Okta/Auth0)** - CNCF graduated project
```json
{
  "type_definitions": [
    {
      "type": "document",
      "relations": {
        "owner": { "this": {} },
        "can_edit": { "computedUserset": { "object": "", "relation": "owner" } }
      }
    }
  ]
}
```
- JSONベースの型定義
- RESTful API でアクセス
- Zanzibarの軽量版として位置づけ

**Ory Keto** - Goベースの実装
```
// APIによる関係の管理
PUT /relation-tuples
{
  "namespace": "files",
  "object": "document1",
  "relation": "owner",
  "subject_id": "alice"
}
```
- RESTful APIによるシンプルな操作
- 関係性の追加・削除・検索
- Docker containerとして配布

**限定的なReBACサポート ⚡**

**OPA (Open Policy Agent)** - Rego言語による関係性表現
```rego
allow {
  user_owns_document[input.user][input.document]
}

user_owns_document[user][doc] {
  ownership[user][doc] = true
}

user_owns_document[user][doc] {
  manages[user][team]
  team_owns_document[team][doc]
}
```
- 宣言的なルール記述
- 関係性の推論が可能
- 汎用的なポリシーエンジン

**Cedar (AWS)** - 構造化されたポリシー言語
```
permit(
  principal in Group::"editors",
  action == Action::"edit",
  resource
) when {
  principal has department &&
  principal.department == resource.department
};
```
- 属性ベースだが、グループ関係も表現可能
- type-safeなポリシー記述
- AWS系サービスとの統合

#### 2.7.3 実装アプローチの分類

| アプローチ | 代表例 | 特徴 | 学習への影響 |
|----------|--------|------|------------|
| **純粋なReBAC** | SpiceDB、OpenFGA | Zanzibar準拠、関係性中心 | 概念理解に最適 |
| **API中心** | Ory Keto | RESTful、シンプル | 実装が理解しやすい |
| **ルール記述** | OPA | 宣言的、柔軟性高 | 応用範囲が広い |
| **型安全** | Cedar | 構造化、コンパイル時チェック | 実用性が高い |

#### 2.7.4 学習用実装における設計選択

主要ライブラリの調査結果を踏まえ、学習用実装では以下を採用：

**SpiceDB型の純粋なReBAC**
- 関係性タプルによる表現
- グラフ構造による推移的権限
- BFSによる最短パス探索

**実装の簡潔性**
- TypeScriptによる型安全な実装
- インメモリグラフによる高速アクセス
- 学習に必要十分な機能に絞り込み

学習用実装では、Zanzibarの本質的な概念に集中し、分散システムの複雑さは除外します。

### 2.8 権限管理モデルの進化における位置づけ

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

#### 3.6.1 ReBACにおけるDenyの根本的な考え方

**従来モデルでのDenyアプローチ:**
- **ACL**: 明示的なDenyエントリーでAllow/Denyを競合解決
- **RBAC**: 通常Denyなし（ロールの加算的モデル）
- **ABAC**: DenyポリシーとPermitポリシーでルール評価

**ReBACにおけるDenyパラダイム:**

ReBACでは関係性ベースの権限モデルのため、従来の「明示的拒否」とは異なるアプローチを取ります。

#### 3.6.2 主要ReBACシステムのDenyサポート状況

**Denyを直接サポートしないシステム** ❌

**Google Zanzibar** - Pure ReBAC
```
// 関係があれば許可、なければ拒否の単純なモデル
Check(user:alice, edit, doc:readme) → ALLOWED/DENIED
```
- **Default Denyパターン**: 関係性が存在しなければ自動的に拒否
- **推移的許可**: 関係の連鎖があれば許可
- **シンプルさ**: 明示的な拒否ルールは存在しない

**SpiceDB** - Zanzibar準拠
```
definition document {
  relation owner: user
  permission edit = owner  // 所有者のみ許可、他は自動的に拒否
}
```
- Zanzibarと同様のポジティブモデル
- 関係性の有無で自動的に許可/拒否が決定

**限定的にDenyをサポート** ✅

**OpenFGA** - 条件付きでDenyサポート
```json
{
  "type": "document",
  "relations": {
    "blocked_user": { "this": {} },
    "can_view": {
      "difference": {
        "base": { "computedUserset": { "relation": "viewer" } },
        "subtract": { "computedUserset": { "relation": "blocked_user" } }
      }
    }
  }
}
```
- `difference`演算子により「除外」を表現
- 基本権限から特定の関係を差し引く

**Ory Keto** - 否定的関係の実験的サポート
```
// 否定的な関係性
PUT /relation-tuples
{
  "namespace": "access",
  "object": "sensitive-doc",
  "relation": "blocked",
  "subject_id": "alice"
}
```
- 特定の関係タイプを否定的として扱う
- 実装は実験的段階

#### 3.6.3 なぜReBACではDenyが複雑か

**1. グラフ探索との競合**
```typescript
// 複雑な評価が必要
// alice → team → document (許可パス)
// alice → blocked → document (拒否パス)
// どちらを優先する？
```

**2. 推移的関係での矛盾**
```typescript
// Aliceはチームを管理し、チームがドキュメントを所有
// しかしAliceは個別にそのドキュメントへのアクセスをブロックされている
// この矛盾をどう解決する？
```

**3. 性能への影響**
- 許可パスと拒否パスの両方を探索する必要
- グラフ探索の複雑度が増加
- キャッシュ戦略の複雑化

#### 3.6.4 学習用実装における設計決定

**採用方針: 段階的な学習アプローチ**

**Phase 1: Deny無し（Zanzibar型）- 基本実装**
```typescript
// シンプルなポジティブモデル
type RelationType = 'owns' | 'manages' | 'memberOf' | 'viewer' | 'editor'
```

**理由:**
1. **概念の純粋性**: ReBACの本質（関係性ベースの権限導出）に集中
2. **実装の単純性**: グラフ探索アルゴリズムが直感的
3. **デバッグの容易さ**: 権限の根拠（関係パス）が明確
4. **Zanzibar準拠**: 業界標準のアプローチを学習

**Phase 2: 否定的関係（発展課題）**
```typescript
// 将来的な拡張
type RelationType = 
  | 'owns' | 'manages' | 'memberOf' | 'viewer' | 'editor'  // ポジティブ
  | 'blocked' | 'restricted' | 'suspended'              // ネガティブ
```

**Phase 3: ハイブリッドアプローチ（上級課題）**
```typescript
// ABAC的な条件との組み合わせ
interface ConditionalRelation extends RelationTuple {
  condition?: (context: Context) => boolean
  priority?: number  // 競合解決のための優先度
}
```

#### 3.6.5 実世界でのDenyのモデリング手法

**手法1: 関係の削除**
```typescript
// 権限を取り消す場合は関係を削除
graph.removeRelation({ subject: 'alice', relation: 'editor', object: 'doc' })
```

**手法2: 条件付き関係（将来実装）**
```typescript
// 時間制限付きの関係
const conditionalRelation = {
  subject: 'alice',
  relation: 'editor',
  object: 'doc',
  validUntil: new Date('2024-12-31')
}
```

**手法3: グループベースの除外**
```typescript
// 特定グループからの除外
graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'editors' })
graph.removeRelation({ subject: 'alice', relation: 'memberOf', object: 'editors' })
// 個別の権限付与に移行
graph.addRelation({ subject: 'alice', relation: 'viewer', object: 'doc' })
```

#### 3.6.6 学習効果の観点

**Denyなし設計の教育価値:**

1. **ReBACの本質理解**: 関係性による権限導出のメカニズムに集中
2. **グラフ理論の学習**: BFS/DFS、最短パス探索の純粋な適用
3. **Zanzibarとの整合性**: 実際の大規模システムとの対応
4. **段階的な学習**: 基本概念の習得後、高度な機能に進む

**将来的なDeny学習への準備:**
- 基本実装の完全な理解
- グラフ探索アルゴリズムの習熟
- 競合解決戦略の概念理解
- 実システムでの複雑性への準備

この段階的アプローチにより、ReBACの核心概念をしっかりと理解した上で、より複雑な権限管理の課題に取り組むことができます。

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

### 7.6 ACL・RBAC・ABACとの比較例

#### 7.6.1 同一シナリオでの実装比較

**シナリオ**: エンジニアリング部門のAliceが、財務部門のBobが作成したドキュメントにアクセスしたい

**ACLの場合（個別権限設定）**
```typescript
// 各ドキュメントで個別に権限を設定
const financialDoc = new AclProtectedResource('budget-2024.xlsx')
financialDoc.addEntry({
  type: 'allow',
  subject: { type: 'user', name: 'alice' },
  permissions: { read: true, write: false }  // 個別に設定
})
// → 管理コスト: O(ユーザー数 × リソース数)
```

**RBACの場合（ロール経由）**
```typescript
// ロールベースの権限管理
const roleManager = new RoleManager(ROLES)
roleManager.assignRole('alice', 'cross-department-viewer')  // 横断閲覧ロール
const financialDoc = new RbacProtectedResource('budget-2024.xlsx', roleManager)
const result = financialDoc.authorize('alice', 'read')
// → 管理コスト: O(ユーザー数 + ロール数)
```

**ABACの場合（属性評価）**
```typescript
// 属性とポリシーによる動的評価
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

**ReBACの場合（関係性ベース）**
```typescript
// 関係性による権限導出
// Alice は Tech Lead として、Bob と協力関係にある
graph.addRelation({ subject: 'alice', relation: 'collaboratesWith', object: 'bob' })
graph.addRelation({ subject: 'bob', relation: 'owns', object: 'budget-2024.xlsx' })
graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'tech-leads' })
graph.addRelation({ subject: 'tech-leads', relation: 'viewer', object: 'financial-docs' })

const result = document.checkRelation('alice', 'read')
// → 関係性パスを探索して権限を導出
// → 管理コスト: O(関係性数)、推移的導出
```

#### 7.6.2 管理性の比較

| 権限モデル | 新規ユーザー追加 | 権限変更の影響範囲 | 組織変更への対応 |
|-----------|-----------------|-------------------|-----------------|
| **ACL** | 各リソースで個別設定 | 単一リソースのみ | 全リソースを個別更新 |
| **RBAC** | ロール割り当てのみ | 全ユーザーに即座に反映 | ロール定義の更新のみ |
| **ABAC** | 属性設定のみ | ポリシー変更で全体に反映 | 属性やポリシーの更新 |
| **ReBAC** | 関係性設定のみ | 関係性変更で推移的に反映 | グラフ構造の更新 |

#### 7.6.3 表現力の比較例

**複雑な組織構造のモデリング**

```typescript
// 実世界の複雑な関係をReBACで表現
class ComplexOrganizationExample {
  setupRealWorldStructure() {
    // 正式な組織階層
    graph.addRelation({ subject: 'alice', relation: 'reports-to', object: 'cto' })
    graph.addRelation({ subject: 'bob', relation: 'reports-to', object: 'cfo' })
    
    // プロジェクトベースの協力関係
    graph.addRelation({ subject: 'alice', relation: 'project-lead', object: 'ai-initiative' })
    graph.addRelation({ subject: 'bob', relation: 'finance-contact', object: 'ai-initiative' })
    
    // 一時的な委譲関係
    graph.addRelation({ subject: 'charlie', relation: 'temporary-substitute', object: 'alice' })
    
    // メンタリング関係
    graph.addRelation({ subject: 'alice', relation: 'mentors', object: 'junior-dev' })
  }
  
  // このような複雑な関係をACL/RBACで表現するには
  // 大量のエントリーやロールが必要
  demonstrateComplexity() {
    // ReBACでは自然に表現される関係が
    // 他のモデルでは人工的な設計が必要
    
    // 例：「Aliceのメンタリングを受けている人は、
    //      Aliceがアクセスできるドキュメントの一部にアクセス可能」
    // → ReBACでは関係性の連鎖で自然に表現
    // → RBACでは複雑なロール設計が必要
    // → ACLでは大量のエントリーが必要
  }
}
```

### 7.7 段階的学習のシナリオ例

#### 7.7.1 Phase 1: 直接関係のみ（深度1）

```typescript
// 最も基本的な関係性
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
    // 直接関係のみをテスト（1ホップ）
    const aliceResult = document.checkRelation('alice', 'write')
    // パス: [alice owns alice-notes.md] - 深度1
    
    const bobResult = document.checkRelation('bob', 'write')
    // パス: [bob editor shared-doc.md] - 深度1
  }
}
```

#### 7.7.2 Phase 2: 間接関係（深度2-3）

```typescript
// チームを介した関係性
class IndirectRelationExample {
  setupTeamStructure() {
    // チームメンバーシップ
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'dev-team' })
    graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'dev-team' })
    
    // チームの権限
    graph.addRelation({ subject: 'dev-team', relation: 'editor', object: 'team-docs' })
    
    // チーム管理
    graph.addRelation({ subject: 'tech-lead', relation: 'manages', object: 'dev-team' })
    graph.addRelation({ subject: 'charlie', relation: 'memberOf', object: 'tech-lead' })
  }
  
  testIndirectAccess() {
    // 間接関係をテスト（2-3ホップ）
    const aliceResult = document.checkRelation('alice', 'write')
    // パス: [alice memberOf dev-team, dev-team editor team-docs] - 深度2
    
    const charlieResult = document.checkRelation('charlie', 'write')
    // パス: [charlie memberOf tech-lead, tech-lead manages dev-team, dev-team editor team-docs] - 深度3
  }
}
```

#### 7.7.3 Phase 3: 複雑な組織構造

```typescript
// 現実的な組織の複雑さ
class ComplexOrganizationExample {
  setupMatrixOrganization() {
    // 機能別組織
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'engineering' })
    graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'product' })
    
    // プロジェクト横断チーム
    graph.addRelation({ subject: 'alice', relation: 'assignedTo', object: 'mobile-project' })
    graph.addRelation({ subject: 'bob', relation: 'assignedTo', object: 'mobile-project' })
    
    // プロジェクト固有の権限
    graph.addRelation({ subject: 'mobile-project', relation: 'editor', object: 'mobile-specs' })
    
    // 外部コントラクター
    graph.addRelation({ subject: 'contractor', relation: 'temporaryAccessTo', object: 'mobile-project' })
  }
  
  testComplexScenarios() {
    // 複雑な権限導出
    const contractorResult = document.checkRelation('contractor', 'read')
    // パス: [contractor temporaryAccessTo mobile-project, mobile-project editor mobile-specs]
    
    // マトリックス組織での横断アクセス
    const crossFunctionalAccess = document.checkRelation('alice', 'write')
    // パス: [alice assignedTo mobile-project, mobile-project editor mobile-specs]
  }
}
```

### 7.8 性能とスケーラビリティの実例

#### 7.8.1 グラフサイズによる性能測定

```typescript
class PerformanceExample {
  measureScalability() {
    // 小規模グラフ（100ノード、500エッジ）
    const smallGraph = this.generateGraph(100, 500)
    const smallTime = this.measureSearchTime(smallGraph, 'alice', 'document1')
    // 期待値: < 1ms
    
    // 中規模グラフ（1000ノード、5000エッジ）
    const mediumGraph = this.generateGraph(1000, 5000)
    const mediumTime = this.measureSearchTime(mediumGraph, 'alice', 'document1')
    // 期待値: < 10ms
    
    // 大規模グラフ（10000ノード、50000エッジ）
    const largeGraph = this.generateGraph(10000, 50000)
    const largeTime = this.measureSearchTime(largeGraph, 'alice', 'document1')
    // 期待値: < 100ms（最適化が必要なレベル）
  }
  
  demonstrateOptimizations() {
    // 深度制限による最適化
    const config = { maxDepth: 3 }  // 3ホップまでに制限
    const result = explorer.findRelationPath('alice', 'document1', config)
    
    // インデックスによる最適化
    const indexedResult = graph.getRelations('alice', 'manages')  // O(1)アクセス
    
    // キャッシュによる最適化（将来実装）
    const cachedResult = explorerWithCache.findRelationPath('alice', 'document1')
  }
}
```

#### 7.8.2 メモリ使用量の分析

```typescript
class MemoryAnalysisExample {
  analyzeMemoryUsage() {
    // 隣接リスト実装のメモリ効率
    const adjacencyListMemory = this.calculateMemoryUsage('adjacencyList')
    // 期待値: O(V + E) where V=ノード数, E=エッジ数
    
    // 隣接行列との比較
    const adjacencyMatrixMemory = this.calculateMemoryUsage('adjacencyMatrix')
    // 期待値: O(V²) - スパースグラフでは非効率
    
    console.log(`隣接リスト: ${adjacencyListMemory}MB`)
    console.log(`隣接行列: ${adjacencyMatrixMemory}MB`)
    // スパースなグラフでは隣接リストが圧倒的に効率的
  }
}
```

## 8. テスト戦略

### 8.1 単体テスト

#### 8.1.1 基本的な関係性テスト

```typescript
describe('RelationGraph', () => {
  test('直接関係の追加と検証', () => {
    const graph = new RelationGraph()
    
    // 関係の追加
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    // 存在確認
    expect(graph.hasDirectRelation('alice', 'owns', 'doc1')).toBe(true)
    expect(graph.hasDirectRelation('alice', 'owns', 'doc2')).toBe(false)
    
    // 逆方向索引の確認
    const reverseRelations = graph.getReverseRelations('doc1', 'owns')
    expect(reverseRelations).toContain({ subject: 'alice', relation: 'owns', object: 'doc1' })
  })
  
  test('関係の削除', () => {
    const graph = new RelationGraph()
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    // 削除前の確認
    expect(graph.hasDirectRelation('alice', 'owns', 'doc1')).toBe(true)
    
    // 削除
    graph.removeRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    // 削除後の確認
    expect(graph.hasDirectRelation('alice', 'owns', 'doc1')).toBe(false)
  })
})
```

#### 8.1.2 探索アルゴリズムテスト

```typescript
describe('RelationshipExplorer', () => {
  test('1ホップの直接関係探索', () => {
    const graph = new RelationGraph()
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    const explorer = new RelationshipExplorer(graph)
    const path = explorer.findRelationPath('alice', 'doc1')
    
    expect(path).toEqual([
      { subject: 'alice', relation: 'owns', object: 'doc1' }
    ])
  })
  
  test('2ホップの推移的関係探索', () => {
    const graph = new RelationGraph()
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team' })
    graph.addRelation({ subject: 'team', relation: 'editor', object: 'doc1' })
    
    const explorer = new RelationshipExplorer(graph)
    const path = explorer.findRelationPath('alice', 'doc1')
    
    expect(path).toEqual([
      { subject: 'alice', relation: 'memberOf', object: 'team' },
      { subject: 'team', relation: 'editor', object: 'doc1' }
    ])
    expect(path.length).toBe(2)  // 2ホップ
  })
  
  test('最短パスの発見', () => {
    const graph = new RelationGraph()
    // 複数経路を設定
    // 経路1: alice -> team -> doc1 (2ホップ)
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team' })
    graph.addRelation({ subject: 'team', relation: 'editor', object: 'doc1' })
    
    // 経路2: alice -> manager -> team -> doc1 (3ホップ)
    graph.addRelation({ subject: 'alice', relation: 'reportsTo', object: 'manager' })
    graph.addRelation({ subject: 'manager', relation: 'manages', object: 'team' })
    
    const explorer = new RelationshipExplorer(graph)
    const path = explorer.findRelationPath('alice', 'doc1')
    
    // BFSにより最短パス（2ホップ）が発見される
    expect(path.length).toBe(2)
  })
  
  test('循環の検出と回避', () => {
    const graph = new RelationGraph()
    // 循環を作成: A -> B -> C -> A
    graph.addRelation({ subject: 'A', relation: 'manages', object: 'B' })
    graph.addRelation({ subject: 'B', relation: 'manages', object: 'C' })
    graph.addRelation({ subject: 'C', relation: 'manages', object: 'A' })
    
    const explorer = new RelationshipExplorer(graph)
    
    // 循環があっても無限ループしない
    const path = explorer.findRelationPath('A', 'nonexistent')
    expect(path).toBeNull()  // パスが見つからない
  })
  
  test('深度制限の動作', () => {
    const graph = new RelationGraph()
    // 4ホップの長い経路を作成
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team1' })
    graph.addRelation({ subject: 'team1', relation: 'partOf', object: 'dept1' })
    graph.addRelation({ subject: 'dept1', relation: 'partOf', object: 'company' })
    graph.addRelation({ subject: 'company', relation: 'owns', object: 'doc1' })
    
    const explorer = new RelationshipExplorer(graph, { maxDepth: 3 })
    const path = explorer.findRelationPath('alice', 'doc1')
    
    // 深度制限により見つからない
    expect(path).toBeNull()
  })
})
```

#### 8.1.3 権限評価テスト

```typescript
describe('ReBACProtectedResource', () => {
  test('所有者の直接アクセス', () => {
    const graph = new RelationGraph()
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    const resource = new ReBACProtectedResource('doc1', graph, PERMISSION_RULES)
    const result = resource.checkRelation('alice', 'write')
    
    expect(result.type).toBe('granted')
    expect(result.path).toEqual([
      { subject: 'alice', relation: 'owns', object: 'doc1' }
    ])
  })
  
  test('関係性が存在しない場合の拒否', () => {
    const graph = new RelationGraph()
    const resource = new ReBACProtectedResource('doc1', graph, PERMISSION_RULES)
    const result = resource.checkRelation('alice', 'write')
    
    expect(result.type).toBe('denied')
    expect(result.reason).toBe('no-relation')
  })
  
  test('複数の関係パスがある場合の処理', () => {
    const graph = new RelationGraph()
    // 複数の経路でアクセス可能
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })  // 直接所有
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team' })
    graph.addRelation({ subject: 'team', relation: 'editor', object: 'doc1' })  // チーム経由
    
    const resource = new ReBACProtectedResource('doc1', graph, PERMISSION_RULES)
    const result = resource.checkRelation('alice', 'write')
    
    expect(result.type).toBe('granted')
    // 最初に見つかった（最短の）パスが返される
    expect(result.path.length).toBe(1)  // 直接所有パス
  })
})
```

### 8.2 統合テスト

#### 8.2.1 実世界シナリオのテスト

```typescript
describe('Real-world Scenarios', () => {
  test('組織変更シナリオ：チーム再編成', () => {
    const graph = new RelationGraph()
    
    // 初期状態：Aliceはチーム1のメンバー
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team1' })
    graph.addRelation({ subject: 'team1', relation: 'editor', object: 'project-docs' })
    
    const resource = new ReBACProtectedResource('project-docs', graph, PERMISSION_RULES)
    
    // 初期状態での権限確認
    let result = resource.checkRelation('alice', 'write')
    expect(result.type).toBe('granted')
    
    // 組織変更：Aliceがチーム2に異動
    graph.removeRelation({ subject: 'alice', relation: 'memberOf', object: 'team1' })
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team2' })
    
    // チーム2には権限がない
    result = resource.checkRelation('alice', 'write')
    expect(result.type).toBe('denied')
    
    // チーム2に権限を付与
    graph.addRelation({ subject: 'team2', relation: 'viewer', object: 'project-docs' })
    
    // 読み取りのみ可能
    expect(resource.checkRelation('alice', 'read').type).toBe('granted')
    expect(resource.checkRelation('alice', 'write').type).toBe('denied')
  })
  
  test('一時的な権限委譲シナリオ', () => {
    const graph = new RelationGraph()
    
    // 通常状態：BobがドキュメントのOwner
    graph.addRelation({ subject: 'bob', relation: 'owns', object: 'sensitive-doc' })
    
    const resource = new ReBACProtectedResource('sensitive-doc', graph, PERMISSION_RULES)
    
    // Aliceは初期状態でアクセス不可
    expect(resource.checkRelation('alice', 'read').type).toBe('denied')
    
    // 一時的な委譲：BobがAliceに権限を委譲
    graph.addRelation({ subject: 'alice', relation: 'delegatedBy', object: 'bob' })
    
    // 委譲により間接的にアクセス可能
    const result = resource.checkRelation('alice', 'read')
    expect(result.type).toBe('granted')
    expect(result.path.length).toBe(2)  // alice -> bob -> doc
    
    // 委譲取り消し
    graph.removeRelation({ subject: 'alice', relation: 'delegatedBy', object: 'bob' })
    
    // 再びアクセス不可
    expect(resource.checkRelation('alice', 'read').type).toBe('denied')
  })
  
  test('マトリックス組織でのプロジェクト横断アクセス', () => {
    const graph = new RelationGraph()
    
    // 機能組織での所属
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'engineering' })
    graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'design' })
    
    // プロジェクトチームへの参加
    graph.addRelation({ subject: 'alice', relation: 'assignedTo', object: 'mobile-project' })
    graph.addRelation({ subject: 'bob', relation: 'assignedTo', object: 'mobile-project' })
    
    // プロジェクト固有のリソース
    graph.addRelation({ subject: 'mobile-project', relation: 'editor', object: 'mobile-specs' })
    
    const resource = new ReBACProtectedResource('mobile-specs', graph, PERMISSION_RULES)
    
    // 異なる部門でもプロジェクト経由でアクセス可能
    expect(resource.checkRelation('alice', 'write').type).toBe('granted')
    expect(resource.checkRelation('bob', 'write').type).toBe('granted')
    
    // プロジェクトから離脱
    graph.removeRelation({ subject: 'alice', relation: 'assignedTo', object: 'mobile-project' })
    
    // アクセス不可になる
    expect(resource.checkRelation('alice', 'write').type).toBe('denied')
  })
})
```

#### 8.2.2 複雑な権限パターンのテスト

```typescript
describe('Complex Permission Patterns', () => {
  test('多層組織での権限継承', () => {
    const graph = new RelationGraph()
    
    // 組織階層：Company -> Department -> Team -> Individual
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'dev-team' })
    graph.addRelation({ subject: 'dev-team', relation: 'partOf', object: 'engineering-dept' })
    graph.addRelation({ subject: 'engineering-dept', relation: 'partOf', object: 'company' })
    graph.addRelation({ subject: 'company', relation: 'owns', object: 'company-handbook' })
    
    const resource = new ReBACProtectedResource('company-handbook', graph, PERMISSION_RULES)
    const result = resource.checkRelation('alice', 'read')
    
    // 4ホップの権限継承
    expect(result.type).toBe('granted')
    expect(result.path.length).toBe(4)
  })
  
  test('権限の合流パターン', () => {
    const graph = new RelationGraph()
    
    // 複数経路でのアクセス
    // 経路1: alice -> admin-role -> doc
    graph.addRelation({ subject: 'alice', relation: 'hasRole', object: 'admin' })
    graph.addRelation({ subject: 'admin', relation: 'editor', object: 'shared-doc' })
    
    // 経路2: alice -> team -> doc
    graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'core-team' })
    graph.addRelation({ subject: 'core-team', relation: 'viewer', object: 'shared-doc' })
    
    const resource = new ReBACProtectedResource('shared-doc', graph, PERMISSION_RULES)
    
    // より強い権限（editor）が優先される
    const writeResult = resource.checkRelation('alice', 'write')
    expect(writeResult.type).toBe('granted')
    expect(writeResult.relation).toBe('editor')  // admin経由での権限
  })
})
```

### 8.3 性能テスト

#### 8.3.1 スケーラビリティテスト

```typescript
describe('Performance and Scalability', () => {
  test('大規模グラフでの探索性能', () => {
    const graph = new RelationGraph()
    
    // 10,000ノード、50,000エッジのグラフを生成
    const { nodes, edges } = generateLargeGraph(10000, 50000)
    
    // グラフにデータを投入
    const startTime = performance.now()
    edges.forEach(edge => graph.addRelation(edge))
    const loadTime = performance.now() - startTime
    
    expect(loadTime).toBeLessThan(1000)  // 1秒以内での読み込み
    
    // 探索性能のテスト
    const explorer = new RelationshipExplorer(graph)
    const searchStart = performance.now()
    const path = explorer.findRelationPath('user1', 'document1')
    const searchTime = performance.now() - searchStart
    
    expect(searchTime).toBeLessThan(100)  // 100ms以内での探索
  })
  
  test('深度制限による性能向上', () => {
    const graph = new RelationGraph()
    generateDeepGraph(graph, 1000, 20)  // 20層の深いグラフ
    
    const config1 = { maxDepth: 20 }  // 制限なし
    const config2 = { maxDepth: 5 }   // 5層制限
    
    const explorer = new RelationshipExplorer(graph)
    
    // 制限なしの場合
    const start1 = performance.now()
    const result1 = explorer.findRelationPath('start', 'end', config1)
    const time1 = performance.now() - start1
    
    // 制限ありの場合
    const start2 = performance.now()
    const result2 = explorer.findRelationPath('start', 'end', config2)
    const time2 = performance.now() - start2
    
    // 制限により性能が向上
    expect(time2).toBeLessThan(time1)
  })
  
  test('メモリ使用量の測定', () => {
    const graph = new RelationGraph()
    
    // メモリ使用量測定のヘルパー
    const measureMemory = () => {
      if (process.memoryUsage) {
        return process.memoryUsage().heapUsed
      }
      return 0  // ブラウザ環境では概算
    }
    
    const initialMemory = measureMemory()
    
    // 大量のデータを追加
    for (let i = 0; i < 10000; i++) {
      graph.addRelation({
        subject: `user${i}`,
        relation: 'memberOf',
        object: `team${i % 100}`
      })
    }
    
    const finalMemory = measureMemory()
    const memoryUsed = finalMemory - initialMemory
    
    // メモリ使用量が予想範囲内
    expect(memoryUsed).toBeLessThan(50 * 1024 * 1024)  // 50MB以下
  })
})
```

#### 8.3.2 キャッシュとインデックスの効果測定

```typescript
describe('Optimization Effects', () => {
  test('インデックスによる高速化', () => {
    const graph = new RelationGraph()
    
    // 大量のデータを追加
    for (let i = 0; i < 1000; i++) {
      graph.addRelation({
        subject: 'alice',
        relation: 'memberOf',
        object: `team${i}`
      })
    }
    
    // インデックスを使用した検索
    const start = performance.now()
    const relations = graph.getRelations('alice', 'memberOf')
    const indexedTime = performance.now() - start
    
    expect(relations.length).toBe(1000)
    expect(indexedTime).toBeLessThan(10)  // 10ms以下
  })
  
  test('逆方向インデックスの効果', () => {
    const graph = new RelationGraph()
    
    // 多くのユーザーが同じチームに所属
    for (let i = 0; i < 1000; i++) {
      graph.addRelation({
        subject: `user${i}`,
        relation: 'memberOf',
        object: 'popular-team'
      })
    }
    
    // 逆方向検索（チームのメンバー一覧）
    const start = performance.now()
    const members = graph.getReverseRelations('popular-team', 'memberOf')
    const reverseTime = performance.now() - start
    
    expect(members.length).toBe(1000)
    expect(reverseTime).toBeLessThan(10)  // 10ms以下
  })
})
```

### 8.4 エラー処理とエッジケースのテスト

```typescript
describe('Error Handling and Edge Cases', () => {
  test('存在しないエンティティでの探索', () => {
    const graph = new RelationGraph()
    const explorer = new RelationshipExplorer(graph)
    
    const path = explorer.findRelationPath('nonexistent', 'also-nonexistent')
    expect(path).toBeNull()
  })
  
  test('空のグラフでの操作', () => {
    const graph = new RelationGraph()
    const resource = new ReBACProtectedResource('doc1', graph, PERMISSION_RULES)
    
    const result = resource.checkRelation('alice', 'read')
    expect(result.type).toBe('denied')
    expect(result.reason).toBe('no-relation')
  })
  
  test('自己参照の関係性', () => {
    const graph = new RelationGraph()
    
    // 自分自身への関係（有効なケース）
    graph.addRelation({ subject: 'alice', relation: 'owns', object: 'alice' })
    
    expect(graph.hasDirectRelation('alice', 'owns', 'alice')).toBe(true)
  })
  
  test('重複関係の処理', () => {
    const graph = new RelationGraph()
    
    // 同じ関係を複数回追加
    const relation = { subject: 'alice', relation: 'owns', object: 'doc1' }
    graph.addRelation(relation)
    graph.addRelation(relation)  // 重複
    
    // 重複は無視され、1つだけ存在
    const relations = graph.getRelations('alice', 'owns')
    expect(relations.length).toBe(1)
  })
})
```

### 8.5 学習効果測定のためのテスト

```typescript
describe('Learning Effectiveness Tests', () => {
  test('段階的学習の進捗確認', () => {
    // Phase 1: 直接関係のみ
    const phase1Graph = new RelationGraph()
    phase1Graph.addRelation({ subject: 'alice', relation: 'owns', object: 'doc1' })
    
    const phase1Resource = new ReBACProtectedResource('doc1', phase1Graph, PERMISSION_RULES)
    const phase1Result = phase1Resource.checkRelation('alice', 'write')
    
    expect(phase1Result.type).toBe('granted')
    expect(phase1Result.path.length).toBe(1)  // 1ホップ
    
    // Phase 2: 間接関係
    const phase2Graph = new RelationGraph()
    phase2Graph.addRelation({ subject: 'alice', relation: 'memberOf', object: 'team' })
    phase2Graph.addRelation({ subject: 'team', relation: 'editor', object: 'doc1' })
    
    const phase2Resource = new ReBACProtectedResource('doc1', phase2Graph, PERMISSION_RULES)
    const phase2Result = phase2Resource.checkRelation('alice', 'write')
    
    expect(phase2Result.type).toBe('granted')
    expect(phase2Result.path.length).toBe(2)  // 2ホップ
  })
  
  test('権限管理モデル間の違いの理解確認', () => {
    // ReBACの特徴：推移的権限の自動導出
    const graph = new RelationGraph()
    graph.addRelation({ subject: 'alice', relation: 'manages', object: 'team' })
    graph.addRelation({ subject: 'bob', relation: 'memberOf', object: 'team' })
    graph.addRelation({ subject: 'bob', relation: 'owns', object: 'doc1' })
    
    const resource = new ReBACProtectedResource('doc1', graph, PERMISSION_RULES)
    const result = resource.checkRelation('alice', 'write')
    
    // Aliceは直接的な権限設定なしに、関係性の連鎖でアクセス可能
    expect(result.type).toBe('granted')
    expect(result.path.length).toBe(3)  // 推移的な関係
    
    // これはRBAC/ABACでは明示的な設定が必要な権限
    // ReBACでは関係性から自動的に導出される
  })
})
```

この拡充されたテスト戦略により、学習者は以下を体験できます：

1. **段階的な理解の確認**: 基本から複雑なケースまでの理解度測定
2. **実世界シナリオの体験**: 組織変更や権限委譲などの現実的な状況
3. **性能特性の理解**: グラフ探索の計算量や最適化の効果
4. **他モデルとの比較**: ReBACの特徴と利点の実感
5. **エラー処理の重要性**: 堅牢なシステム設計の理解

### 8.6 学習効率重視のユニットテスト戦略（採用方針）

#### 8.6.1 設計方針の見直し

**従来のテスト戦略からの変更点:**

上記8.1-8.5の包括的なテスト戦略は教育的価値が高いものの、学習効率の観点から以下の点を見直しました：

1. **統合テストの除外**: 実世界シナリオや複雑な権限パターンのテストは学習の範囲外
2. **性能テストの除外**: 初期学習では理論理解を優先し、性能最適化は後回し
3. **権限別テストの簡潔化**: 読み取り権限と書き込み権限の本質的違いに着目

#### 8.6.2 権限による違いの分析

**読み取り権限 vs 書き込み権限:**

```typescript
// 権限ルールの比較
const PERMISSION_RULES = [
  { relation: 'owns', permissions: { read: true, write: true } },
  { relation: 'manages', permissions: { read: true, write: true } },
  { relation: 'editor', permissions: { read: true, write: true } },
  { relation: 'viewer', permissions: { read: true, write: false } }  // 唯一の違い
]
```

**分析結果:**
- 共通ロジック: グラフ探索アルゴリズム（BFS）、最短パス探索、循環検出、深度制限
- 実質的違い: viewer関係での書き込み拒否のみ
- 学習価値: 書き込み権限のテストで関係性による権限の違いも学習可能

#### 8.6.3 境界値テストの適用可否

**ReBACにおける境界値テストの特徴:**

従来の権限モデルとの根本的違い：

| モデル | 評価対象 | 境界値テストの適用性 |
|--------|----------|-------------------|
| **ABAC** | 数値属性（clearanceLevel ≥ 3） | ✅ 有効（2,3,4での動作確認） |
| **ABAC** | 時間属性（9:00-17:00） | ✅ 有効（08:59:59, 09:00:00, 17:00:01） |
| **ReBAC** | 関係の有無（owns/editor/viewer） | ❌ 離散的（存在するか、しないか） |
| **ReBAC** | 深度制限（maxDepth=3） | △ 限定的（整数値の境界のみ） |

**ReBACでは境界値テストが不適用な理由:**
1. **離散的な関係**: 「半分owns」や「0.7 manages」のような中間値は存在しない
2. **グラフ構造**: エッジの存在/非存在の2値的評価
3. **整数深度**: 1ホップ、2ホップ（1.5ホップは存在しない）

#### 8.6.4 採用するユニットテスト構造

**書き込み権限に焦点を当てた効率的なテスト:**

```typescript
describe('ReBAC (Relationship-Based Access Control)', () => {
  // 1. RelationGraphクラス（約150行）
  describe('RelationGraph', () => {
    describe('addRelation', () => {
      it('関係を追加できること')
      it('同じ関係を重複追加しても1つとして扱われること')
    })
    describe('removeRelation', () => {
      it('存在する関係を削除できること')
    })
    describe('hasDirectRelation', () => {
      it('存在する直接関係に対してtrueを返すこと')
      it('存在しない関係に対してfalseを返すこと')
    })
    describe('getRelations', () => {
      it('指定したsubjectの全関係を取得できること')
      it('関係タイプで絞り込めること')
    })
  })

  // 2. RelationshipExplorerクラス（約300行）
  describe('RelationshipExplorer', () => {
    describe('findRelationPath', () => {
      describe('基本的な探索', () => {
        it('直接関係（1ホップ）のパスを返すこと')
        it('間接関係（2ホップ）のパスを返すこと')
        it('間接関係（3ホップ）のパスを返すこと')
        it('関係が存在しない場合nullを返すこと')
      })
      describe('最短パス保証', () => {
        it('複数パスが存在する場合、最短パスを返すこと')
      })
      describe('深度制限', () => {
        it('maxDepth内で見つかればパスを返すこと')
        it('maxDepthを超える場合nullを返すこと')
      })
      describe('循環参照', () => {
        it('循環があっても無限ループしないこと')
      })
    })
  })

  // 3. ReBACProtectedResourceクラス（約400行）
  describe('ReBACProtectedResource', () => {
    describe('checkRelation (write権限)', () => {
      describe('関係性なし', () => {
        it('deniedを返し、reasonがno-relationであること')
      })
      describe('直接関係', () => {
        it('owns関係で書き込み可能')
        it('editor関係で書き込み可能')
        it('viewer関係で書き込み不可（権限の違いを学習）')
      })
      describe('推移的な権限導出', () => {
        it('ユーザー→チーム→ドキュメントで書き込み可能')
        it('マネージャー→チーム→メンバー→ドキュメントで書き込み可能')
        it('パスの各ステップが正しく記録されること')
      })
      describe('深度制限の影響', () => {
        it('深度制限を超える場合、max-depth-exceededで拒否')
      })
    })
    describe('getRequiredRelations', () => {
      it('writeアクションに必要な関係タイプを返すこと')
    })
  })
})
```

#### 8.6.5 学習効果を最大化する要素

**1. 段階的な複雑性**
- 深度1（直接関係）→ 深度2（チーム経由）→ 深度3（管理関係）
- 単一関係 → 複数パス → 複雑な組織構造

**2. 具体的なパス可視化**
```typescript
expect(result).toEqual({
  type: 'granted',
  path: [
    { subject: 'alice', relation: 'manages', object: 'dev-team' },
    { subject: 'bob', relation: 'memberOf', object: 'dev-team' },
    { subject: 'bob', relation: 'owns', object: 'document' }
  ],
  relation: 'manages'
})
// → 権限の根拠となる関係性の連鎖を明確に理解
```

**3. 権限の違いを明示**
```typescript
describe('viewer関係での制限', () => {
  it('viewer関係では書き込み不可')
  // → owns/editor/managesとviewerの権限差を理解
})
```

#### 8.6.6 テストコードの構成要素

**ヘルパー関数（約100行）:**
```typescript
// グラフ構築ヘルパー
function createSimpleGraph(): RelationGraph
function createTeamGraph(): RelationGraph  
function createManagerialGraph(): RelationGraph
function createCyclicGraph(): RelationGraph

// デフォルト権限ルール
const DEFAULT_PERMISSION_RULES = [
  { relation: 'owns', permissions: { read: true, write: true }, description: '所有者' },
  { relation: 'manages', permissions: { read: true, write: true }, description: '管理者' },
  { relation: 'editor', permissions: { read: true, write: true }, description: '編集者' },
  { relation: 'viewer', permissions: { read: true, write: false }, description: '閲覧者' }
]
```

**合計行数: 約950行**
- RelationGraph: 150行
- RelationshipExplorer: 300行  
- ReBACProtectedResource: 400行
- ヘルパー関数: 100行

#### 8.6.7 学習効率向上のメリット

**1. 重複の排除**
- 読み取り/書き込み権限の本質的に同じロジックの重複テストを回避
- viewer関係での違いに焦点を当てることで権限概念を効率的に学習

**2. 核心概念への集中**
- グラフ探索（BFS）の理解
- 推移的権限導出の仕組み
- 関係性による権限の違い（owns/editor vs viewer）

**3. 実践的な価値**
- 他の権限モデルとの本質的違いを理解
- 境界値テストが適用されない理由の理解
- ReBACの離散的・構造的特徴の体験

この学習効率重視のアプローチにより、ReBACの本質を短時間で確実に理解できる構成となっています。

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