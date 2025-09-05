// ReBAC (Relationship-Based Access Control) 学習用実装
//
// このファイルは学習用のスケルトンです。
// 各メソッドの実装は学習者が行ってください。

// ============================================================
// 基本型定義
// ============================================================

// エンティティ識別子
export type EntityId = string

// 権限ビット（他の実装と共通）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits

// リソースへのアクセス関係タイプ
// 直接的関係として、エンティティからリソースへのアクセス権限を表す
export type DirectRelationType =
  | 'owns' // 所有関係
  | 'viewer' // 閲覧者権限
  | 'editor' // 編集者権限

// エンティティ間の関係タイプ
// 間接的関係として、エンティティ間でのつながりを表す
export type IndirectRelationType =
  | 'manages' // 管理関係
  | 'memberOf' // 所属関係 (user memberOf team)
  | 'has' // 所属関係 (team has user)

// 関係タイプの種類
export type RelationType = IndirectRelationType | DirectRelationType

// 直接的関係タプル
export type DirectRelationTuple = {
  subject: EntityId // ユーザーまたはグループ
  relation: DirectRelationType // リソースへのアクセス関係
  object: EntityId // リソース（ドキュメント）
}

// 間接的関係タプル
export type IndirectRelationTuple = {
  subject: EntityId // ユーザーまたはグループ
  relation: IndirectRelationType // エンティティ間の関係
  object: EntityId // グループまたはユーザー
}

// 関係性タプル
export type RelationTuple = IndirectRelationTuple | DirectRelationTuple

// 関係性タプルの連鎖
export type RelationshipChain = RelationTuple[]

// あるエンティティから見た、関係タイプごとのエンティティ集合を表す型
// 例: aliceに関する、own、manages、memberOfごとのエンティティ集合
// Map {
//   "owns" => Set(["document1", "document2"]),
//   "manages" => Set(["bob", "carol"]),
//   "memberOf" => Set(["engineering-team"])
// }
type RelationMap = Map<RelationType, Set<EntityId>>

// 隣接リスト全体
type AdjacencyList = Map<EntityId, RelationMap>

// 関係が持つパーミッション
export type RelationPermissions = {
  relation: DirectRelationType
  permissions: PermissionBits
  description: string
}

// 探索状態（内部使用）
type SearchState = {
  current: EntityId
  path: RelationshipChain
  depth: number
}

// 探索結果の型
export type ExplorationResult =
  | {
      type: 'found'
      path: RelationshipChain
      matchedRelation: RelationType
    }
  | {
      type: 'not-found'
    }
  | {
      type: 'max-depth-exceeded'
      maxDepth: number
    }

// ReBAC判定結果
export type ReBACDecision =
  | {
      type: 'granted'
      path: RelationshipChain // 権限の根拠となる関係性パス
      relation: DirectRelationType // マッチした関係
    }
  | {
      type: 'denied'
      reason: 'no-relation' // 必要な関係性が見つからない
      searchedRelations: DirectRelationType[] // 探索した関係
    }
  | {
      type: 'denied'
      reason: 'max-depth-exceeded' // 探索深度の制限
      maxDepth: number
    }

// 関係性の探索を行うクラス向けの設定
export type ExplorationConfig = {
  maxDepth: number // 探索の最大深度
}

// ============================================================
// デフォルト設定
// ============================================================

// デフォルトの権限ルール（リソースへのアクセス権限のみ）
export const DEFAULT_RELATION_PERMISSIONS: RelationPermissions[] = [
  {
    relation: 'owns',
    permissions: { read: true, write: true },
    description: '所有者は全権限'
  },
  {
    relation: 'editor',
    permissions: { read: true, write: true },
    description: '編集者は読み書き可能'
  },
  {
    relation: 'viewer',
    permissions: { read: true, write: false },
    description: '閲覧者は読み取りのみ'
  }
]

// デフォルト設定
export const DEFAULT_CONFIG: ExplorationConfig = {
  maxDepth: 3
}

// ============================================================
// RelationGraph クラス
// ============================================================

// 関係性グラフを管理するクラス
export class RelationGraph {
  // 隣接リスト (subject -> relation -> objects)
  private adjacencyList: AdjacencyList

  constructor() {
    this.adjacencyList = new Map()
  }

  // 隣接リストに関係性を追加
  addRelation(tuple: IndirectRelationTuple | DirectRelationTuple): void {
    const subjectRelations: RelationMap = this.adjacencyList.get(tuple.subject) ?? new Map()
    if (!this.adjacencyList.has(tuple.subject)) {
      this.adjacencyList.set(tuple.subject, subjectRelations)
    }

    const relationObjects: Set<EntityId> = subjectRelations.get(tuple.relation) ?? new Set()
    if (!subjectRelations.has(tuple.relation)) {
      subjectRelations.set(tuple.relation, relationObjects)
    }
    relationObjects.add(tuple.object)
  }

  // 隣接リストから関係性を削除
  removeRelation(tuple: RelationTuple): void {
    const subjectRelations = this.adjacencyList.get(tuple.subject)
    if (subjectRelations) {
      const relationObjects = subjectRelations.get(tuple.relation)
      if (relationObjects) {
        relationObjects.delete(tuple.object)
        if (relationObjects.size === 0) {
          subjectRelations.delete(tuple.relation)
          if (subjectRelations.size === 0) {
            this.adjacencyList.delete(tuple.subject)
          }
        }
      }
    }
  }

  // 直接関係の存在確認
  hasDirectRelation(subject: EntityId, relation: RelationType, object: EntityId): boolean {
    return !!this.adjacencyList.get(subject)?.get(relation)?.has(object)
  }

  // subjectから出る関係を取得
  // あるエンティティ（例:alice）から出る全ての関係を取得
  getRelations(subject: EntityId): ReadonlyArray<RelationTuple> {
    const relations = this.adjacencyList.get(subject)
    if (!relations) return []

    const tuples: RelationTuple[] = []
    for (const [relation, objects] of relations) {
      for (const object of objects) {
        tuples.push({
          subject,
          relation,
          object: object
        })
      }
    }
    return tuples
  }

  // すべての関係を削除
  clear(): void {
    this.adjacencyList.clear()
  }
}

// ============================================================
// RelationshipExplorer クラス
// ============================================================

// 関係性の探索を行うクラス
// BFS（幅優先探索）により最短パスを発見
export class RelationshipExplorer {
  constructor(
    private graph: RelationGraph,
    private config: ExplorationConfig = DEFAULT_CONFIG
  ) {}

  // 関係性を取得する
  //
  // 既存のReBAC実装に従い、直接関係のチェック→BFSの順で、関係性を取得する
  //
  // 例:
  // 複数の関係を一度にチェック
  // const relations = new Set(['viewer', 'editor', 'owns']);
  // const result = explorer.findPathWithAnyRelation('alice', 'document', relations);
  findRelationPath(
    subject: EntityId,
    targetObject: EntityId,
    targetRelations: ReadonlySet<RelationType>
  ): ExplorationResult {
    // 最初に、直接関係をチェック
    // 直接関係チェックはなくても機能的には問題ないが、BFSによる探索を行わなくて済み、パフォーマンス面で良い
    // 既存のReBACの実装も同等となっていることから、今回も実装を残しておく
    // (以下、Claude Opus 4.1 による調査結果)
    //
    //   1. Google Zanzibar
    //   - Googleの論文では「Check API」の実装で、直接関係を最初にチェックすることが明記
    //     - 「fast path」と呼ばれ、グラフ探索を避けられる最も効率的なケースとして扱われます。
    //
    //   2. SpiceDB（Authzedの実装）
    //   - 関係チェックの順序
    //     - 直接関係のチェック（ルックアップ）
    //     - 計算された関係の評価
    //     - 再帰的な探索
    //
    //   3. Ory Keto
    //   - 関係チェックの順序
    //     - ローカルキャッシュのチェック
    //     - 直接関係のチェック
    //     - 間接関係の探索
    for (const relation of targetRelations) {
      if (this.graph.hasDirectRelation(subject, relation, targetObject)) {
        return {
          type: 'found',
          path: [{ subject, relation, object: targetObject }],
          matchedRelation: relation
        }
      }
    }

    // BFS探索
    const queue: SearchState[] = [{ current: subject, path: [], depth: 0 }]
    const visited = new Set<EntityId>([subject])

    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      const { current, path, depth } = item

      if (depth >= this.config.maxDepth) {
        return {
          type: 'max-depth-exceeded',
          maxDepth: this.config.maxDepth
        }
      }

      const relations = this.graph.getRelations(current)
      for (const tuple of relations) {
        if (tuple.object === targetObject && targetRelations.has(tuple.relation)) {
          return {
            type: 'found',
            path: [...path, tuple],
            matchedRelation: tuple.relation
          }
        }

        if (visited.has(tuple.object)) continue
        visited.add(tuple.object)

        queue.push({
          current: tuple.object,
          path: [...path, tuple],
          depth: depth + 1
        })
      }
    }

    return { type: 'not-found' }
  }
}

// ============================================================
// ReBACProtectedResource クラス
// ============================================================

// ReBACによって保護されたリソースを表すクラス
export class ReBACProtectedResource {
  private explorer: RelationshipExplorer

  constructor(
    private resourceId: EntityId,
    graph: RelationGraph,
    private relationPermissions: RelationPermissions[] = DEFAULT_RELATION_PERMISSIONS,
    config?: ExplorationConfig
  ) {
    this.explorer = new RelationshipExplorer(graph, config)
  }

  // 関係性に基づいて権限をチェック
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision {
    const requiredRelations = this.getRequiredRelations(action)

    const result = this.explorer.findRelationPath(subject, this.resourceId, requiredRelations)

    switch (result.type) {
      case 'found':
        return {
          type: 'granted',
          path: result.path,
          relation: result.matchedRelation as DirectRelationType
        }

      case 'max-depth-exceeded':
        return {
          type: 'denied',
          reason: 'max-depth-exceeded',
          maxDepth: result.maxDepth
        }

      case 'not-found':
        return {
          type: 'denied',
          reason: 'no-relation',
          searchedRelations: Array.from(requiredRelations)
        }
    }
  }

  // アクションに必要な関係性を取得
  getRequiredRelations(action: PermissionAction): ReadonlySet<DirectRelationType> {
    return new Set(
      this.relationPermissions
        .filter((rule) => rule.permissions[action])
        .map((rule) => rule.relation)
    )
  }
}
