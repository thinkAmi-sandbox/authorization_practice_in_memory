// ABAC (Attribute-Based Access Control) 学習用実装
// ADRに基づいた型定義とクラス定義（メソッドの実装は学習者が行う）

// ==========================================
// 型定義
// ==========================================

// パーミッション（ACL・RBACと共通）
export type PermissionAction = 'read' | 'write'

// 部門
export type Department = 'engineering' | 'finance' | 'hr' | 'sales'

// セキュリティレベル（1-5の範囲）
// clearanceLevel（ユーザーの権限レベル）とclassificationLevel（ドキュメントの機密度）で共通使用
// 数値が高いほど高い権限・機密度を表す
export type SecurityLevel = 1 | 2 | 3 | 4 | 5

// アクセス場所の種類
export type Location = 'office' | 'home' | 'external'

// Subject属性: アクセスを要求するユーザーの属性
// ABACでは「誰が」に関する情報を表現
export type SubjectAttributes = {
  userName: string  // ユーザー名
  department: Department
  clearanceLevel: SecurityLevel
}

// Resource属性: アクセス対象となるリソースの属性
// ABACでは「何に」に関する情報を表現
export type ResourceAttributes = {
  // ドキュメント名
  documentName: string
  // ドキュメントを管理している部門
  department: Department
  // 機密度レベル（数値が高いほど機密）
  classificationLevel: SecurityLevel
}

// Environment属性: アクセス時の環境的な属性
// ABACでは「いつ・どこで」に関する情報を表現
export type EnvironmentAttributes = {
  // アクセス時刻
  currentTime: Date
  // アクセス場所
  location: Location
}


// 評価コンテキスト: 個々のルール評価に必要なすべての属性情報
//ABACの中心的なデータ構造で、4つの属性カテゴリーを統合
export type EvaluationContext = {
  // アクセス要求者の属性
  subject: SubjectAttributes
  // アクセス対象の属性
  resource: ResourceAttributes
  // 実行したいアクション
  action: PermissionAction
  // 環境属性
  environment: EnvironmentAttributes
}

 // ABACにおける個別の権限制御ルール
 // 条件を満たした場合のeffect（permit/deny）を定義
export type Rule = {
  // 一意識別子
  id: string
  // 説明
  description?: string
  // 効果（許可または拒否）
  effect: 'permit' | 'deny'

  // 適用条件を評価する関数
  // 属性間の関係性を動的に評価する
  condition: (context: EvaluationContext) => boolean
}

 // ルール評価エンジンでの評価結果（Tagged Union型）
 //
 // ABACでは単純なboolean型ではなく、詳細な評価結果を返すことで
 // デバッグ、監査、運用における情報を提供する
export type RuleDecision =
  | {
      // 許可
      type: 'permit'
      // 決定に使用されたルール
      appliedRule: Rule
      // 評価時のコンテキスト
      context: EvaluationContext
    }
  | {
      // 拒否
      type: 'deny'
      appliedRule: Rule
      context: EvaluationContext
    }
  | {
      // 適用可能なルールが見つからない
      type: 'not-applicable'
      // not-applicableになった理由
      reason: string
    }

// ==========================================
// クラス定義
// ==========================================

 // ルール評価エンジン
 //
 // 登録されたルールを使用してアクセス要求を評価し、
 // Deny-Overrideに基づいて最終的な決定を下す
export class RuleEvaluationEngine {
  private REASONS = {
    unregistered: 'ルールが1つも登録されていない',
    noMatch: 'Permitルールを含む構成で、どの条件にもマッチしない',
    noMatchDenyOnly: 'Denyルールのみ存在し、条件にマッチしない'
  } as const;

  // 登録されたルールを管理
  //key: ルール名, value: ルール
  private rules: Map<string, Rule>

  constructor() {
    this.rules = new Map()
  }

  // 与えられたコンテキストに対してルールを使って評価する
  //
  // 実装すべき評価アルゴリズム（Deny-Override）:
  // 1. すべてのルールを評価し、条件にマッチするものを特定
  // 2. 一つでもDenyルールがマッチした場合、即座にDenyを返す
  // 3. Denyがなく、Permitルールがマッチした場合、Permitを返す
  // 4. どのルールにもマッチしない場合、not-applicableを返す
  evaluate(context: EvaluationContext): RuleDecision {
    if (this.rules.size === 0) {
      return {type: 'not-applicable', reason: this.REASONS.unregistered}
    }

    const denyRules = [...this.rules.values()].filter(rule => rule.effect === 'deny')
    for (const rule of denyRules) {
      if (rule.condition(context)) {
        return {
          type: 'deny',
          appliedRule: rule,
          context: context
        }
      }
    }

    const permitRules = [...this.rules.values()].filter(rule => rule.effect === 'permit')
    for (const rule of permitRules) {
      if (rule.condition(context)) {
        return {
          type: 'permit',
          appliedRule: rule,
          context: context
        }
      }
    }

    if (denyRules.length > 0 && permitRules.length === 0) {
      return {type: 'not-applicable', reason: this.REASONS.noMatchDenyOnly}
    }

    return {type: 'not-applicable', reason: this.REASONS.noMatch}
  }

  // 新しいルールをエンジンに追加
  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule)
  }

  // 指定された名前のルールをエンジンから削除
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
  }
}