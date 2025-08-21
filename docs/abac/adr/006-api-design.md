# ADR-006: API設計

## ステータス

- **日付**: 2025-08-13
- **状態**: 採用
- **決定者**: プロジェクトチーム

## コンテキスト

ABAC（Attribute-Based Access Control）システムの学習用実装において、APIの設計は使いやすさと学習効果のバランスを決定する重要な要素です。過度に複雑なAPIは学習の妨げとなり、過度に単純なAPIは実用性を欠くため、適切なバランスを見つける必要があります。

### API設計における考慮事項

1. **学習の容易さ**: ABACの本質に集中できる最小限のAPI
2. **実用性**: 実際のABACシステムで必要となる基本機能
3. **業界標準との整合性**: 主要なABACライブラリとの用語・概念の一致
4. **拡張性**: 将来的な機能追加への対応

### 権限管理方式におけるメソッド名の差別化

各権限管理方式で意図的に異なるメソッド名を使用することで、それぞれの特徴と概念を明確に表現します。

## 検討したオプション

### オプション1: 最小限のAPI

```typescript
class PolicyEvaluationEngine {
  evaluate(context: EvaluationContext): PolicyDecision
  addPolicy(rule: PolicyRule): void
  removePolicy(ruleId: string): void
}
```

**利点:**
- 3メソッドのみでシンプル
- ABACの本質に集中
- 学習負荷が軽い
- 理解しやすい

**欠点:**
- 実用性が限定的
- デバッグ支援機能が不足
- ポリシー管理機能が不足

### オプション2: 完全なAPI

```typescript
class PolicyEvaluationEngine {
  // 基本機能
  evaluate(context: EvaluationContext): PolicyDecision
  addPolicy(rule: PolicyRule): void
  removePolicy(ruleId: string): void
  
  // 拡張機能
  listPolicies(): PolicyRule[]
  getPolicy(ruleId: string): PolicyRule | undefined
  validatePolicy(rule: PolicyRule): ValidationResult
  clearPolicies(): void
  
  // デバッグ支援
  evaluateDetailed(context: EvaluationContext): DetailedEvaluation
  explainDecision(context: EvaluationContext): ExplanationResult
  
  // 設定管理
  setStrategy(strategy: ConflictResolutionStrategy): void
  getStrategy(): ConflictResolutionStrategy
}
```

**利点:**
- 実用的な機能が豊富
- デバッグ支援機能
- 設定の柔軟性
- 実システムに近い

**欠点:**
- 学習には過度に複雑
- ABACの本質が見えにくい
- 実装コストが高い

### オプション3: 学習用最適化API（採用）

```typescript
class PolicyEvaluationEngine {
  constructor()  // Deny-Override戦略で固定
  
  // ポリシー評価（業界標準の"evaluate"）
  evaluate(context: EvaluationContext): PolicyDecision
  
  // ポリシー管理
  addPolicy(rule: PolicyRule): void
  removePolicy(ruleId: string): void
}
```

**利点:**
- 必要最小限の機能
- ABACの本質に集中
- 業界標準の用語を使用
- 学習効果が高い

**欠点:**
- 一部の実用機能が不足
- デバッグ支援が限定的

## 決定

**学習用最適化API（オプション3）を採用**

### 採用したAPI設計

#### クラス設計

```typescript
class PolicyEvaluationEngine {
  private policies: PolicyRule[] = []
  
  constructor() {
    // Deny-Override戦略で固定（学習の焦点を明確化）
  }
  
  /**
   * ポリシー評価：属性とポリシーを評価して決定を返す
   * @param context 評価コンテキスト（Subject、Resource、Environment、Action）
   * @returns 評価結果（permit/deny/not-applicable）
   */
  evaluate(context: EvaluationContext): PolicyDecision
  
  /**
   * ポリシー追加：新しいポリシールールを追加
   * @param rule 追加するポリシールール
   */
  addPolicy(rule: PolicyRule): void
  
  /**
   * ポリシー削除：指定されたIDのポリシールールを削除
   * @param ruleId 削除するポリシールールのID
   */
  removePolicy(ruleId: string): void
}
```

#### メソッド名の選定理由

各権限管理方式で意図的に異なるメソッド名を使用：

| 権限モデル | メソッド名 | 理由 |
|-----------|-----------|------|
| Unix | `hasPermission` | 権限の有無を確認 |
| ACL | `resolveAccess` | Allow/Denyエントリーの競合を解決 |
| RBAC | `authorize` | ロール基づく認可 |
| **ABAC** | **`evaluate`** | **ポリシー・属性を評価** |
| ReBAC | `checkRelation` | 関係性を確認 |

#### `evaluate`を選択した理由

1. **業界標準への準拠**
   - XACML、OPA等の主要ABACライブラリで標準的に使用
   - 学習者が実際のライブラリに移行しやすい

2. **動的評価の表現**
   - 「評価」という用語が動的な処理を適切に表現
   - ポリシーと属性の組み合わせ評価を示唆

3. **ABACの本質の表現**
   - 静的な「確認」ではなく動的な「評価」
   - 複雑な条件を評価するプロセスを表現

#### 戦略の固定化

```typescript
constructor() {
  // Deny-Override戦略で固定
  // 学習用として戦略選択の複雑さを排除
}
```

**固定化の理由:**
- 学習の焦点をABACの本質（属性評価）に集中
- 戦略選択の複雑さを排除
- 業界標準（Deny-Override）を確実に習得

### 最小限API設計の詳細な根拠

#### 1. 学習効果の最大化

**3メソッドに絞る利点:**
- **認知負荷の軽減**: 覚えるべきAPIが最小限
- **本質への集中**: ABACの核心概念（evaluate）に焦点
- **段階的学習**: 基本を理解してから拡張を検討

#### 2. ABACの本質表現

**evaluateメソッドの中心性:**
```typescript
// ABACの本質：動的な属性評価
const decision = engine.evaluate({
  subject: { department: 'engineering', clearanceLevel: 3 },
  resource: { department: 'finance', classificationLevel: 4 },
  action: 'read',
  environment: { location: 'office', currentTime: new Date() }
})

// 結果の活用
if (decision.type === 'permit') {
  // アクセス許可
  console.log(`許可理由: ${decision.appliedRule.description}`)
}
```

#### 3. 実用性との両立

**必要十分な機能:**
- `evaluate`: ABACの核心機能
- `addPolicy`: ポリシーの動的追加（テスト・実験に必要）
- `removePolicy`: ポリシーの削除（テスト・実験に必要）

**省略した機能とその理由:**
- `listPolicies`: 学習用では内部実装を隠蔽することが重要
- `validatePolicy`: TypeScriptの型チェックで代替可能
- `setStrategy`: Deny-Overrideに固定して学習を単純化

#### 4. 実システムへの移行パス

学習用APIから実用APIへの自然な拡張：

```typescript
// 学習後の発展的な拡張例
class AdvancedPolicyEvaluationEngine extends PolicyEvaluationEngine {
  // デバッグ支援
  listPolicies(): PolicyRule[]
  explainDecision(context: EvaluationContext): ExplanationResult
  
  // 戦略設定
  setConflictResolution(strategy: 'deny-override' | 'permit-override'): void
  
  // パフォーマンス最適化
  evaluateAsync(context: EvaluationContext): Promise<PolicyDecision>
}
```

### 型定義の整合性

#### EvaluationContextの統一

```typescript
type EvaluationContext = {
  subject: SubjectAttributes
  resource: ResourceAttributes
  action: PermissionAction  // 'read' | 'write'
  environment: EnvironmentAttributes
}
```

#### PolicyDecisionの詳細情報

```typescript
type PolicyDecision = 
  | { type: 'permit'; appliedRule: PolicyRule; context: EvaluationContext }
  | { type: 'deny'; appliedRule: PolicyRule; context: EvaluationContext }
  | { type: 'not-applicable'; reason: string }
```

## 結果

### 利点

1. **学習効果の最大化**
   - ABACの本質（属性評価）に集中
   - 認知負荷の軽減
   - 段階的な理解の促進

2. **業界標準との整合性**
   - `evaluate`による標準的な用語の習得
   - 実際のABACライブラリとの概念的な一致
   - 実システムへの移行準備

3. **実装の単純性**
   - 最小限のインターフェース
   - テストの容易さ
   - デバッグの簡単さ

4. **概念の明確化**
   - ABACの動的評価の理解
   - 他の権限管理方式との違いの明確化
   - ポリシーベースの権限制御の体験

### トレードオフ

1. **機能の制限**
   - デバッグ支援機能の不足
   - 設定変更の柔軟性の制限
   - 一部の実用機能の省略

2. **実用性の制約**
   - プロダクション環境には追加機能が必要
   - 複雑な運用要件には対応不十分

### 今後の課題

1. **発展的な学習**
   - 拡張APIの設計と実装
   - デバッグ機能の追加
   - パフォーマンス最適化

2. **実システムとの連携**
   - 監査ログとの統合
   - 外部ポリシーストアとの連携
   - 分散環境での動作

この決定により、学習者はABACの本質的な機能である「属性の動的評価」を、最もシンプルで理解しやすい形で体験できます。同時に、業界標準の用語と概念を身につけることで、実際のABACシステムへの移行も容易になります。