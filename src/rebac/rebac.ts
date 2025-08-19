/**
 * ReBAC (Relationship-Based Access Control) 学習用実装
 * 
 * このファイルは学習用のスケルトンです。
 * 各メソッドの実装は学習者が行ってください。
 */

// ============================================================
// 基本型定義
// ============================================================

/** エンティティ識別子 */
export type EntityId = string;

/** 権限ビット（他の実装と共通） */
export type PermissionBits = {
  read: boolean;
  write: boolean;
};

/** 権限アクション */
export type PermissionAction = keyof PermissionBits;

/** エンティティ間の関係タイプ */
export type EntityRelationType = 
  | 'manages'     // 管理関係
  | 'memberOf'    // 所属関係 (user memberOf team)
  | 'has'         // 所属関係 (team has user)
  | 'delegatedBy' // 委譲関係

/** リソースへのアクセス関係タイプ */
export type ResourceRelationType = 
  | 'owns'        // 所有関係
  | 'viewer'      // 閲覧者権限
  | 'editor'      // 編集者権限

/** 関係性の種類（統合型・既存コードとの互換性のため維持） */
export type RelationType = EntityRelationType | ResourceRelationType

/** エンティティ間の関係タプル */
export interface EntityRelationTuple {
  subject: EntityId           // ユーザーまたはグループ
  relation: EntityRelationType // エンティティ間の関係
  object: EntityId            // グループまたはユーザー
}

/** リソースへの関係タプル */
export interface ResourceRelationTuple {
  subject: EntityId             // ユーザーまたはグループ
  relation: ResourceRelationType // リソースへのアクセス関係
  object: EntityId              // リソース（ドキュメント）
}

/** 関係性タプル */
export interface RelationTuple {
  subject: EntityId;     // 主体（ユーザーやグループ）
  relation: RelationType; // 関係の種類
  object: EntityId;      // 客体（リソースやグループ）
}

/** 関係性パス（探索結果） */
export type RelationPath = RelationTuple[];

/** 権限ルール */
export interface PermissionRule {
  relation: ResourceRelationType;
  permissions: PermissionBits;
  description: string;
}

/** ReBAC設定 */
export interface ReBACConfig {
  maxDepth: number;           // 探索の最大深度
}

/** 探索状態（内部使用） */
interface SearchState {
  current: EntityId;
  path: RelationPath;
  depth: number;
}


/** 探索結果の型 */
export type ExplorationResult =
  | {
      type: 'found';
      path: RelationPath;
      matchedRelation: RelationType;
    }
  | {
      type: 'not-found';
    }
  | {
      type: 'max-depth-exceeded';
      maxDepth: number;
    };

/** ReBAC判定結果（Tagged Union） */
export type ReBACDecision = 
  | { 
      type: 'granted';
      path: RelationPath;        // 権限の根拠となる関係性パス
      relation: ResourceRelationType;    // マッチした関係
    }
  | { 
      type: 'denied';
      reason: 'no-relation';     // 必要な関係性が見つからない
      searchedRelations: ResourceRelationType[]; // 探索した関係
    }
  | {
      type: 'denied';
      reason: 'max-depth-exceeded'; // 探索深度の制限
      maxDepth: number;
    };

// ============================================================
// デフォルト設定
// ============================================================

/** デフォルトの権限ルール（リソースへのアクセス権限のみ） */
export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
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
];

/** デフォルト設定 */
export const DEFAULT_CONFIG: ReBACConfig = {
  maxDepth: 3
};

// ============================================================
// RelationGraph クラス
// ============================================================

/**
 * 関係性グラフを管理するクラス
 * 隣接リストによる効率的なグラフ表現を実装
 */
export class RelationGraph {
  // 順方向の隣接リスト (subject -> relation -> objects)
  private adjacencyList: Map<EntityId, Map<RelationType, Set<EntityId>>>;
  
  // 逆方向の隣接リスト（object -> relation -> subjects）
  private reverseAdjacencyList: Map<EntityId, Map<RelationType, Set<EntityId>>>;

  constructor() {
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
  }

  /**
   * 関係性を追加
   */
  addRelation(tuple: EntityRelationTuple | ResourceRelationTuple): void {
    // 順方向: subject -> relation -> objects
    const subjectRelations = this.adjacencyList.get(tuple.subject) ?? new Map();
    if (!this.adjacencyList.has(tuple.subject)) {
      this.adjacencyList.set(tuple.subject, subjectRelations);
    }
    
    const relationObjects = subjectRelations.get(tuple.relation) ?? new Set();
    if (!subjectRelations.has(tuple.relation)) {
      subjectRelations.set(tuple.relation, relationObjects);
    }
    relationObjects.add(tuple.object);

    // 逆方向: object -> relation -> subjects
    const objectRelations = this.reverseAdjacencyList.get(tuple.object) ?? new Map();
    if (!this.reverseAdjacencyList.has(tuple.object)) {
      this.reverseAdjacencyList.set(tuple.object, objectRelations);
    }
    
    const relationSubjects = objectRelations.get(tuple.relation) ?? new Set();
    if (!objectRelations.has(tuple.relation)) {
      objectRelations.set(tuple.relation, relationSubjects);
    }
    relationSubjects.add(tuple.subject);
  }

  /**
   * 関係性を削除
   * @param tuple 削除する関係性タプル
   */
  removeRelation(tuple: RelationTuple): void {
    // 順方向: subject -> relation -> objects
    const subjectRelations = this.adjacencyList.get(tuple.subject)
    if (subjectRelations) {
      const relationObjects = subjectRelations.get(tuple.relation);
      if (relationObjects) {
        relationObjects.delete(tuple.object);
        if (relationObjects.size === 0) {
          subjectRelations.delete(tuple.relation);
          if (subjectRelations.size === 0) {
            this.adjacencyList.delete(tuple.subject);
          }
        }
      }
    }

    // 逆方向: object -> relation -> subjects
    const objectRelations = this.reverseAdjacencyList.get(tuple.object)
    if (objectRelations) {
      const relationSubjects = objectRelations.get(tuple.relation);
      if (relationSubjects) {
        relationSubjects.delete(tuple.subject);
        if (relationSubjects.size === 0) {
          objectRelations.delete(tuple.relation);
          if (objectRelations.size === 0) {
            this.reverseAdjacencyList.delete(tuple.object);
          }
        }
      }
    }
  }

  /**
   * 直接関係の存在確認
   * @param subject 主体
   * @param relation 関係の種類
   * @param object 客体
   * @returns 関係が存在する場合true
   */
  hasDirectRelation(subject: EntityId, relation: RelationType, object: EntityId): boolean {
    return !!this.adjacencyList.get(subject)?.get(relation)?.has(object)
  }

  /**
   * 主体から出る関係を取得
   * @param subject 主体
   * @returns 関係性タプルの配列
   */
  getRelations(subject: EntityId): ReadonlyArray<RelationTuple> {
    const relations = this.adjacencyList.get(subject);
    if (!relations) return [];

    const tuples: RelationTuple[] = [];
    for (const [relation, objects] of relations) {
      for (const object of objects) {
        tuples.push({
          subject,
          relation,
          object: object
        });
      }
    }
    return tuples;
  }

  /**
   * 客体への関係を取得（逆方向）
   * @param object 客体
   * @returns 関係性タプルの配列
   */
  getReverseRelations(object: EntityId): ReadonlyArray<RelationTuple> {
    const relations = this.reverseAdjacencyList.get(object);
    if (!relations) return [];

    const tuples: RelationTuple[] = [];
    for (const [relation, subjects] of relations) {
      for (const subject of subjects) {
        tuples.push({
          subject,
          relation,
          object
        });
      }
    }
    return tuples;
  }

  /**
   * すべての関係を削除
   */
  clear(): void {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }
}

// ============================================================
// RelationshipExplorer クラス
// ============================================================

/**
 * 関係性の探索を行うクラス
 * BFS（幅優先探索）により最短パスを発見
 */
export class RelationshipExplorer {
  constructor(
    private graph: RelationGraph,
    private config: ReBACConfig = DEFAULT_CONFIG
  ) {}

  /**
   * 関係性を取得する
   *
   * 既存のReBAC実装に従い、直接関係のチェック→BFSの順で、関係性を取得する
   * 
   * @param subject 開始エンティティ
   * @param targetObject 目標エンティティ
   * @param targetRelations チェック対象の関係タイプのセット
   * @returns 探索結果（パス発見、未発見、深度制限超過）と発見された関係
   * 
   * @example
   * // 複数の関係を一度にチェック
   * const relations = new Set(['viewer', 'editor', 'owns']);
   * const result = explorer.findPathWithAnyRelation('alice', 'document', relations);
   */
  findPathWithAnyRelation(
    subject: EntityId,
    targetObject: EntityId,
    targetRelations: ReadonlySet<RelationType>
  ): ExplorationResult {
    // 直接関係をチェック
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
        };
      }
    }

    // BFS探索
    const queue: SearchState[] = [{ current: subject, path: [], depth: 0 }];
    const visited = new Set<EntityId>([subject]);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { current, path, depth } = item;

      if (depth >= this.config.maxDepth) {
        return { 
          type: 'max-depth-exceeded', 
          maxDepth: this.config.maxDepth 
        };
      }

      const relations = this.graph.getRelations(current);
      for (const tuple of relations) {
        if (tuple.object === targetObject && targetRelations.has(tuple.relation)) {
          return { 
            type: 'found', 
            path: [...path, tuple],
            matchedRelation: tuple.relation
          };
        }

        if (visited.has(tuple.object)) continue;
        visited.add(tuple.object);

        queue.push({
          current: tuple.object,
          path: [...path, tuple],
          depth: depth + 1
        });
      }
    }

    return { type: 'not-found' };
  }
}

// ============================================================
// ReBACProtectedResource クラス
// ============================================================

/**
 * ReBACによって保護されたリソースを表すクラス
 */
export class ReBACProtectedResource {
  private explorer: RelationshipExplorer;

  constructor(
    private resourceId: EntityId,
    graph: RelationGraph,
    private permissionRules: PermissionRule[] = DEFAULT_PERMISSION_RULES,
    config?: ReBACConfig
  ) {
    this.explorer = new RelationshipExplorer(graph, config);
  }

  /**
   * 関係性に基づいて権限をチェック
   * @param subject チェック対象の主体
   * @param action 実行したいアクション
   * @returns 権限判定結果
   */
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision {
    const requiredRelations = this.getRequiredRelations(action);

    const result = this.explorer.findPathWithAnyRelation(
      subject, 
      this.resourceId, 
      requiredRelations
    );

    switch (result.type) {
      case 'found':
        return { 
          type: 'granted', 
          path: result.path, 
          relation: result.matchedRelation as ResourceRelationType
        };

      case 'max-depth-exceeded':
        return {
          type: 'denied',
          reason: 'max-depth-exceeded',
          maxDepth: result.maxDepth
        };

      case 'not-found':
        return {
          type: 'denied',
          reason: 'no-relation',
          searchedRelations: Array.from(requiredRelations)
        };
    }
  }

  /**
   * アクションに必要な関係性を取得
   * @param action 権限アクション
   * @returns 必要な関係タイプの配列
   */
  getRequiredRelations(action: PermissionAction): ReadonlySet<ResourceRelationType> {
    return new Set(
      this.permissionRules
      .filter(rule => rule.permissions[action])
      .map(rule => rule.relation)
    );
  }
}

