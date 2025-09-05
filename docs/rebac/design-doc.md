# ReBAC (Relationship-Based Access Control) 設計ドキュメント

## 1. 概要

ReBAC（Relationship-Based Access Control）は、エンティティ間の関係性をグラフ構造で表現し、その関係性から権限を導出する権限管理パターンです。本ドキュメントは、学習用ReBAC実装の詳細な設計を記述します。

> **実装との関係について**  
> 本ドキュメントは概念理解を目的とした設計書です。掲載されている擬似コードやメソッド名は、概念を分かりやすく説明するためのものであり、実際の実装（`src/rebac/rebac.ts`）とは以下の点で異なる場合があります：
> - メソッド名がより簡潔に変更されている（例：`findPathWithAnyRelation` → `findRelationPath`）
> - 型定義がより具体的・実用的になっている
> - エラーハンドリングや探索結果の構造がより詳細化されている
> 
> 実装の詳細については、ソースコードのコメントとTypeScript型定義を参照してください。

## 2. ReBACの核心概念

### 2.1 関係性ベースの権限モデル

従来のモデルとの根本的な違い：

```
RBAC:  ユーザー → ロール → 権限
ABAC:  属性 → ポリシー → 権限判定
ReBAC: エンティティ → 【関係性グラフ】 → 権限（推移的導出）
```

### 2.2 基本要素

#### 関係性タプル（Relationship Tuple）
```typescript
(subject, relation, object)
// 例: (alice, owns, document1)
//     (alice, manages, dev-team)
//     (bob, memberOf, dev-team)
```

#### 推移的権限の導出
```
alice manages dev-team AND bob memberOf dev-team
→ alice can manage bob's resources
```

### 2.3 重要な用語

- **エンティティ（Entity）**: ユーザー、グループ、リソースなどの対象
- **関係性（Relationship）**: エンティティ間のつながり
- **関係性タプル（Tuple）**: `(subject, relation, object)`の3つ組
- **推移的権限（Transitive Permission）**: 関係の連鎖から権限を導出
- **グラフ探索（Graph Traversal）**: 関係性ネットワークを辿って権限の根拠を発見

#### 専門用語の定義

**必要関係性（Required Relations）**
- 特定の権限アクションを実行するために必要とされる関係性のタイプ
- 権限ルール（PermissionRule）によって定義される
- 例：write権限には'owns'、'manages'、'editor'のいずれかが必要

**関係性パス（Relation Path）**
- グラフ上でsubjectからobjectまでを結ぶ関係性タプルの連鎖
- 各タプルは一つのエッジ（関係）を表す
- 推移的な権限導出の根拠となる実際の経路

**権限付与関係性（Granting Relation）**
- 権限判定で実際に権限付与の根拠となった必要関係性
- ReBACDecisionのrelationプロパティに記録される

## 3. 他の権限モデルとの比較

### 3.1 ABACとReBACの中心概念の違い

| 要素 | ABAC | ReBAC |
|------|------|-------|
| **権限の源泉** | 属性（特性） | 関係性（つながり） |
| **評価方法** | ポリシーで属性を評価 | グラフを探索して関係を発見 |
| **中心概念** | 属性＋ポリシー | 関係性＋グラフ |
| **権限判定** | ルールベース | パス探索ベース |

### 3.2 権限管理モデルの進化

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

## 4. 業界標準の調査

### 4.1 Google Zanzibar - ReBACの先駆者

YouTube、Drive、Cloudなどで使用されている大規模ReBACシステム：

1. **関係性タプル**: `(user, relation, object)`の3つ組
2. **関係性の合成**: 複数の関係を組み合わせて新しい関係を導出
3. **一貫性保証**: スナップショットによる読み取り一貫性
4. **性能最適化**: 関係性のキャッシュと並列探索

### 4.2 主要ReBACライブラリ

#### 完全なReBACサポート

**SpiceDB (AuthZed)** - Zanzibarインスパイア
```
definition document {
  relation owner: user
  relation editor: user | group#member
  permission edit = owner + editor
}
```

**OpenFGA (Okta/Auth0)** - CNCF graduated project
```json
{
  "type_definitions": [{
    "type": "document",
    "relations": {
      "owner": { "this": {} },
      "can_edit": { "computedUserset": { "object": "", "relation": "owner" } }
    }
  }]
}
```

**Ory Keto** - Goベースの実装
- RESTful APIによるシンプルな操作
- 関係性の追加・削除・検索
- Docker containerとして配布

#### 実装アプローチの分類

| アプローチ | 代表例 | 特徴 | 学習への影響 |
|----------|--------|------|------------|
| **純粋なReBAC** | SpiceDB、OpenFGA | Zanzibar準拠、関係性中心 | 概念理解に最適 |
| **API中心** | Ory Keto | RESTful、シンプル | 実装が理解しやすい |
| **ルール記述** | OPA | 宣言的、柔軟性高 | 応用範囲が広い |
| **型安全** | Cedar | 構造化、コンパイル時チェック | 実用性が高い |

### 4.3 探索アルゴリズムの業界標準

BFS（幅優先探索）は**ReBACの標準的な探索方法**：

| システム/ライブラリ | 探索方法 | 特徴 |
|-------------------|---------|------|
| **Google Zanzibar** | BFS + 並列探索 | 分散システムで並列化、キャッシュ活用 |
| **SpiceDB** | BFS（デフォルト） | Zanzibarインスパイア、最短パス重視 |
| **OpenFGA** | BFS + 最適化 | 条件付き探索、早期終了 |
| **Ory Keto** | BFS | シンプルな実装 |

BFSが選ばれる理由：
1. **最短パスの保証**: 権限の根拠として最短の関係パスが望ましい
2. **循環検出の容易さ**: visitedセットで簡単に管理
3. **デバッグの容易さ**: レベルごとの探索で関係の「距離」が明確
4. **予測可能な性能**: 深さ制限との相性が良い

## 5. 実装の詳細

### 5.1 型定義

#### 基本型
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
```

#### 関係タイプの分離設計
```typescript
/** エンティティ間の関係タイプ */
export type EntityRelationType = 
  | 'manages'     // 管理関係
  | 'memberOf'    // 所属関係  
  | 'delegatedBy' // 委譲関係

/** リソースへのアクセス関係タイプ */
export type ResourceRelationType = 
  | 'owns'        // 所有関係
  | 'viewer'      // 閲覧者権限
  | 'editor'      // 編集者権限

/** 統合型（既存コードとの互換性） */
export type RelationType = EntityRelationType | ResourceRelationType
```

### 5.2 グラフ構造

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

### 5.3 BFS探索アルゴリズム

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

### 5.4 権限判定の処理フロー

```typescript
export class ReBACProtectedResource {
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision {
    // Step 1: アクションに必要な関係性を特定
    const requiredRelations = this.getRequiredRelations(action)
    
    // Step 2: 推移的な関係性探索
    for (const relation of requiredRelations) {
      const path = this.explorer.findRelationPath(subject, this.resourceId)
      
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

### 5.5 権限判定結果の構造

```typescript
export type ReBACDecision = 
  | { 
      type: 'granted'
      path: RelationPath       // 権限の根拠となる関係性パス
      relation: RelationType   // マッチした関係
    }
  | { 
      type: 'denied'
      reason: 'no-relation'
      searchedRelations: RelationType[]
    }
  | {
      type: 'denied'
      reason: 'max-depth-exceeded'
      maxDepth: number
    }
```

#### pathとrelationプロパティの意味

- **path**: グラフ探索によって発見された、subjectからobjectまでの実際の関係性の経路
- **relation**: 権限付与の根拠となった必要関係性（権限ルールで定義されたもの）

この区別により、「なぜこの権限が付与されたか」（relation）と「どのような関係の連鎖によって許可されたか」（path）の両方を把握できます。

## 6. 実装における設計選択

### 6.1 学習用実装の方針

主要ライブラリの調査結果を踏まえ、学習用実装では以下を採用：

**SpiceDB型の純粋なReBAC**
- 関係性タプルによる表現
- グラフ構造による推移的権限
- BFSによる最短パス探索

**実装の簡潔性**
- TypeScriptによる型安全な実装
- インメモリグラフによる高速アクセス
- 学習に必要十分な機能に絞り込み

### 6.2 段階的な学習パス

1. **Phase 1**: 直接関係のみ（depth = 1）
2. **Phase 2**: 2ホップ関係（depth = 2）
3. **Phase 3**: 実用的な深さ（depth = 3-5）

### 6.3 将来の拡張性

- 否定的関係（Deny）の段階的導入
- キャッシュ戦略の実装
- 並列探索の最適化
- 条件付き関係の実装
- ABAC的な属性評価との組み合わせ

## 7. まとめ

この設計により、ReBACの核心概念を学習しながら、実システムで採用されている設計パターンを理解できます。単純な実装から始めて、段階的に複雑な機能を追加することで、効果的な学習が可能になります。