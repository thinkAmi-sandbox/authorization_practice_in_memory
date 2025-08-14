// ABAC (Attribute-Based Access Control) 学習用実装
// ADRに基づいた型定義とクラス定義（メソッドの実装は学習者が行う）
//
// 参考: docs/adr-abac-design.md
// テスト: src/abac/abac.test.ts

// ==========================================
// 型定義
// ==========================================

/**
 * 権限アクション（ACL・RBACと共通）
 * 社内ドキュメント管理システムでは read/write のみを想定
 */
export type PermissionAction = 'read' | 'write'

/**
 * 部門の種類
 * Subject・Resource両方で使用する共通の値型
 */
export type Department = 'engineering' | 'finance' | 'hr' | 'sales'

/**
 * セキュリティレベル（1-5の範囲）
 * clearanceLevel（ユーザーの権限レベル）とclassificationLevel（ドキュメントの機密度）で共通使用
 * 数値が高いほど高い権限・機密度を表す
 */
export type SecurityLevel = 1 | 2 | 3 | 4 | 5

/**
 * アクセス場所の種類
 * Environment属性で使用
 */
export type Location = 'office' | 'home' | 'external'

/**
 * Subject属性: アクセスを要求するユーザーの属性
 * ABACでは「誰が」に関する情報を表現
 */
export interface SubjectAttributes {
  /** ユーザー名（学習用：実システムではuserIdを使用） */
  userName: string
  /** 所属部門 */
  department: Department
  /** セキュリティクリアランスレベル（数値が高いほど高権限） */
  clearanceLevel: SecurityLevel
}

/**
 * Resource属性: アクセス対象となるリソースの属性
 * ABACでは「何に」に関する情報を表現
 */
export interface ResourceAttributes {
  /** ドキュメント名（学習用：実システムではdocumentIdを使用） */
  documentName: string
  /** ドキュメントを管理している部門 */
  department: Department
  /** 機密度レベル（数値が高いほど機密） */
  classificationLevel: SecurityLevel
}

/**
 * Environment属性: アクセス時の環境的な属性
 * ABACでは「いつ・どこで」に関する情報を表現
 */
export interface EnvironmentAttributes {
  /** アクセス時刻 */
  currentTime: Date
  /** アクセス場所 */
  location: Location
}

/**
 * 評価コンテキスト: ポリシー評価に必要なすべての属性情報
 * ABACの中心的なデータ構造で、4つの属性カテゴリーを統合
 */
export type EvaluationContext = {
  /** アクセス要求者の属性 */
  subject: SubjectAttributes
  /** アクセス対象の属性 */
  resource: ResourceAttributes
  /** 実行したいアクション */
  action: PermissionAction
  /** 環境属性 */
  environment: EnvironmentAttributes
}

/**
 * ポリシールール: ABACにおける個別の権限制御ルール
 * 条件を満たした場合のeffect（permit/deny）を定義
 */
export interface PolicyRule {
  /** ポリシーの一意識別子 */
  id: string
  /** ポリシーの説明（オプション） */
  description?: string
  /** ポリシーの効果（許可または拒否） */
  effect: 'permit' | 'deny'
  /** 
   * ポリシーの適用条件を評価する関数
   * 属性間の関係性を動的に評価するABACの核心部分
   */
  condition: (context: EvaluationContext) => boolean
}

/**
 * ポリシー評価結果（Tagged Union型）
 * 
 * ABACでは単純なboolean型ではなく、詳細な評価結果を返すことで
 * デバッグ、監査、運用における情報を提供する
 */
export type PolicyDecision = 
  | {
      /** 許可の決定 */
      type: 'permit'
      /** 決定に使用されたポリシールール */
      appliedRule: PolicyRule
      /** 評価時のコンテキスト */
      context: EvaluationContext
    }
  | {
      /** 拒否の決定 */
      type: 'deny'
      /** 決定に使用されたポリシールール */
      appliedRule: PolicyRule
      /** 評価時のコンテキスト */
      context: EvaluationContext
    }
  | {
      /** 適用可能なポリシーが見つからない */
      type: 'not-applicable'
      /** not-applicableになった理由 */
      reason: string
    }

// ==========================================
// クラス定義
// ==========================================

/**
 * ポリシー評価エンジン
 * 
 * ABACシステムの中核となるPDP (Policy Decision Point)の実装
 * 登録されたポリシーを使用してアクセス要求を評価し、
 * Deny-Override戦略に基づいて最終的な決定を下す
 */
export class PolicyEvaluationEngine {
  /**
   * 登録されたポリシールールを管理
   * key: ポリシーID, value: ポリシールール
   */
  private policies: Map<string, PolicyRule>

  /**
   * ポリシー評価エンジンを初期化
   * Deny-Override戦略を採用（業界標準）
   */
  constructor() {
    this.policies = new Map()
  }

  /**
   * 与えられたコンテキストに対してポリシーを評価し、アクセス決定を返す
   * 
   * 実装すべき評価アルゴリズム（Deny-Override戦略）:
   * 1. すべてのポリシーを評価し、条件にマッチするものを特定
   * 2. 一つでもDenyポリシーがマッチした場合、即座にDenyを返す
   * 3. Denyがなく、Permitポリシーがマッチした場合、Permitを返す  
   * 4. どのポリシーもマッチしない場合、not-applicableを返す
   * 
   * @param context 評価コンテキスト（subject, resource, action, environment）
   * @returns 評価結果（permit/deny/not-applicable）
   */
  evaluate(context: EvaluationContext): PolicyDecision {
    // TODO: Deny-Override戦略に基づくポリシー評価ロジックを実装
    // ヒント: 
    // - 全ポリシーを順次評価
    // - Denyポリシーの優先処理
    // - 適切なreason文字列の設定
    throw new Error('evaluate method not implemented')
  }

  /**
   * 新しいポリシールールをエンジンに追加
   * 
   * @param rule 追加するポリシールール
   */
  addPolicy(rule: PolicyRule): void {
    // TODO: ポリシーをpoliciesマップに追加する実装
    throw new Error('addPolicy method not implemented')
  }

  /**
   * 指定されたIDのポリシールールをエンジンから削除
   * 
   * @param ruleId 削除するポリシーのID
   */
  removePolicy(ruleId: string): void {
    // TODO: 指定されたIDのポリシーをpoliciesマップから削除する実装
    throw new Error('removePolicy method not implemented')
  }
}