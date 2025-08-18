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

/** 関係性の種類 */
export type RelationType = 
  | 'owns'        // 所有関係
  | 'manages'     // 管理関係
  | 'memberOf'    // 所属関係
  | 'delegatedBy' // 委譲関係
  | 'viewer'      // 閲覧者権限
  | 'editor';     // 編集者権限

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
  relation: RelationType;
  permissions: PermissionBits;
  description: string;
}

/** ReBAC設定 */
export interface ReBACConfig {
  maxDepth: number;           // 探索の最大深度（デフォルト: 3）
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
      relation: RelationType;    // マッチした関係
    }
  | { 
      type: 'denied';
      reason: 'no-relation';     // 必要な関係性が見つからない
      searchedRelations: RelationType[]; // 探索した関係
    }
  | {
      type: 'denied';
      reason: 'max-depth-exceeded'; // 探索深度の制限
      maxDepth: number;
    };

// ============================================================
// デフォルト設定
// ============================================================

/** デフォルトの権限ルール */
export const DEFAULT_PERMISSION_RULES: PermissionRule[] = [
  { 
    relation: 'owns', 
    permissions: { read: true, write: true }, 
    description: '所有者は全権限' 
  },
  { 
    relation: 'manages', 
    permissions: { read: true, write: true }, 
    description: '管理者は全権限' 
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
   * @param tuple 追加する関係性タプル
   */
  addRelation(tuple: RelationTuple): void {
    const relations = this.adjacencyList.get(tuple.subject)
    if (!relations) {
      this.adjacencyList.set(tuple.subject, new Map([[tuple.relation, new Set([tuple.object])]]))
    } else {
      const objects = relations.get(tuple.relation) || new Set()
      objects.add(tuple.object)
      relations.set(tuple.relation, objects)
      this.adjacencyList.set(tuple.subject, relations)
    }

    const reverseRelations = this.reverseAdjacencyList.get(tuple.object)
    if (!reverseRelations) {
      this.reverseAdjacencyList.set(tuple.object, new Map([[tuple.relation, new Set([tuple.subject])]]))
    } else {
      const subjects = reverseRelations.get(tuple.relation) || new Set()
      subjects.add(tuple.subject)
      reverseRelations.set(tuple.relation, subjects)
      this.reverseAdjacencyList.set(tuple.object, reverseRelations)
    }
  }

  /**
   * 関係性を削除
   * @param tuple 削除する関係性タプル
   */
  removeRelation(tuple: RelationTuple): void {
    // TODO: 実装してください
    // ヒント：
    // 1. adjacencyListから関係を削除
    // 2. reverseAdjacencyListからも削除
    // 3. 空になったMapやSetをクリーンアップ
    throw new Error('Not implemented');
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
   * @param relation 関係の種類（省略時は全種類）
   * @returns 関係性タプルの配列
   */
  getRelations(subject: EntityId, relation?: RelationType): ReadonlyArray<RelationTuple> {
    const relations = this.adjacencyList.get(subject);
    if (!relations) return [];

    // 特定の関係タイプが指定された場合
    if (relation) {
      const objects = relations.get(relation);
      if (!objects) return [];
      
      return Array.from(objects, object => ({
        subject,
        relation,
        object
      }));
    }

    // すべての関係を返す場合
    const tuples: RelationTuple[] = [];
    for (const [rel, objects] of relations) {
      for (const obj of objects) {
        tuples.push({
          subject,
          relation: rel,
          object: obj
        });
      }
    }
    return tuples;
  }

  /**
   * 客体への関係を取得（逆方向）
   * @param object 客体
   * @param relation 関係の種類（省略時は全種類）
   * @returns 関係性タプルの配列
   */
  getReverseRelations(object: EntityId, relation?: RelationType): RelationTuple[] {
    const relations = this.reverseAdjacencyList.get(object);
    if (!relations) return [];

    // 特定の関係タイプが指定された場合
    if (relation) {
      const subjects = relations.get(relation);
      if (!subjects) return [];

      return Array.from(subjects, subject => ({
        subject,
        relation,
        object
      }));
    }

    // すべての関係を返す場合
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
   * グラフをクリア
   */
  clear(): void {
    // TODO: 実装してください
    throw new Error('Not implemented');
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
   * 関係性パスの探索（最短パスを返す）
   * @param subject 開始エンティティ
   * @param targetObject 目標エンティティ
   * @returns 探索結果（パス発見、未発見、深度制限超過）
   */
  findRelationPath(
    subject: EntityId,
    targetObject: EntityId
  ): ExplorationResult {
    // TODO: 実装してください
    // ヒント：
    // 1. BFSのためのキューを初期化（SearchState型を使用）
    // 2. 訪問済みノードを管理（循環回避）
    // 3. maxDepthで探索を制限し、超過した場合は 'max-depth-exceeded' を返す
    // 4. targetObjectに到達したら { type: 'found', path } を返す
    // 5. キューが空になったら { type: 'not-found' } を返す
    throw new Error('Not implemented');
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
    private graph: RelationGraph,
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
    // TODO: 実装してください
    // ヒント：
    // 1. getRequiredRelationsでactionに必要な関係性を取得
    // 2. 各関係性についてfindPathToResourceでパスを探索
    // 3. 探索結果に応じて適切なReBACDecisionを返す：
    //    - パスが見つかった → { type: 'granted', path, relation }
    //    - 全ての関係性で見つからない → { type: 'denied', reason: 'no-relation', searchedRelations }
    //    - 深度制限超過 → { type: 'denied', reason: 'max-depth-exceeded', maxDepth }
    throw new Error('Not implemented');
  }

  /**
   * アクションに必要な関係性を取得
   * @param action 権限アクション
   * @returns 必要な関係タイプの配列
   */
  getRequiredRelations(action: PermissionAction): RelationType[] {
    // TODO: 実装してください
    // ヒント：permissionRulesからactionに対応する関係を抽出
    throw new Error('Not implemented');
  }

  /**
   * リソースへのパスを探索（内部メソッド）
   * @param subject 主体
   * @returns 探索結果
   */
  private findPathToResource(subject: EntityId): ExplorationResult {
    // TODO: 実装してください
    // ヒント：explorerのfindRelationPathを使ってresourceIdへのパスを探索
    throw new Error('Not implemented');
  }

  /**
   * アクセス権限の説明を生成
   * @param subject 主体
   * @returns 各アクションに対する権限判定のマップ
   */
  explainAccess(subject: EntityId): Map<PermissionAction, ReBACDecision> {
    // TODO: 実装してください
    // ヒント：各PermissionActionについてcheckRelationを実行
    throw new Error('Not implemented');
  }

}

