# ADR: ABAC (Attribute-Based Access Control) 学習用実装の設計

## 1. ステータス

- **日付**: 2025-08-13
- **状態**: 提案
- **決定者**: プロジェクトチーム

## 2. コンテキスト

### 2.1 プロジェクトの背景（権限管理システムの学習用実装）

このプロジェクトは、ユーザーが権限管理システムを学習するための実装サンプルを提供することを目的としています。ABAC（Attribute-Based Access Control）は、属性ベースの動的な評価により、より柔軟で文脈依存のアクセス制御を実現する権限管理パターンです。

### 2.2 ABACの位置づけ（RBACからの発展）

- **RBAC**: ロールという静的な抽象層による権限管理
  - 利点：組織構造との自然な対応、管理の簡素化
  - 欠点：例外的な権限設定が困難、動的な条件に対応できない

- **ABAC**: 属性の動的評価による柔軟な権限制御
  - 利点：文脈依存の制御、きめ細かいポリシー定義
  - 欠点：ポリシーの複雑化、デバッグの困難さ

### 2.3 想定する題材（社内ドキュメント管理システム）

学習効果を高めるため、ACL・RBACと同様に社内ドキュメント管理システムを題材として選択しました：
- 実行権限は不要（ドキュメントは実行するものではない）
- read（閲覧）とwrite（作成・更新・削除）の2つの権限で十分
- 属性例：部門、職位、勤務時間、機密レベル、IPアドレス

### 2.4 ABACの核心概念の学習

ABACの学習において重要な概念：

1. **属性（Attributes）**: エンティティの特性
   - **Subject属性**: ユーザーの部門、職位、クリアランスレベル
   - **Resource属性**: ドキュメントの機密度、所有部門、作成日時
   - **Environment属性**: アクセス時刻、IPアドレス、デバイス種別
   - **Action属性**: 操作の種類、緊急度

2. **ポリシー（Policy）**: 属性を評価するルール
   - **条件（Condition）**: 属性間の関係を定義
   - **効果（Effect）**: permit（許可）またはdeny（拒否）

3. **ポリシー評価エンジン（Policy Evaluation Engine）**:
   - **PEP（Policy Enforcement Point）**: アクセス要求を受け付ける
   - **PDP（Policy Decision Point）**: ポリシーを評価し決定を下す
   - **PIP（Policy Information Point）**: 属性情報を提供
   - **PAP（Policy Administration Point）**: ポリシーを管理

### 2.5 実際のABACライブラリの実装パターン

主要なABACライブラリを調査した結果、以下のアプローチに分類されることが判明しました：

#### 2.5.1 ポリシー記述言語による分類

**DSL（Domain Specific Language）型**

**Casbin (Go/多言語)** - 独自のPERM形式
```conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub_rule, obj_rule, act

[matchers]
m = eval(p.sub_rule) && eval(p.obj_rule) && p.act == r.act
```
- 利点：表現力が高い、複雑な条件を簡潔に記述
- 欠点：学習曲線が急、デバッグが困難

**Open Policy Agent (OPA)** - Rego言語
```rego
allow {
  input.method == "GET"
  input.user.department == input.resource.department
  input.user.clearance_level >= input.resource.classification
}
```
- 利点：宣言的、推論エンジン内蔵
- 欠点：独特の構文、学習コストが高い

**JSON/YAML型**

**node-abac (JavaScript)** - JSONベースの条件記述
```json
{
  "effect": "permit",
  "condition": {
    "and": [
      {"equals": {"user.department": "resource.department"}},
      {"greater-than": {"user.level": 3}}
    ]
  }
}
```
- 利点：構造化されている、パース処理が簡単
- 欠点：冗長、複雑な条件が読みにくい

**py-abac (Python)** - JSONスキーマベース
```python
{
  "uid": "policy-1",
  "effect": "allow",
  "rules": {
    "subject": {"$.role": {"condition": "Equals", "value": "admin"}},
    "resource": {"$.type": {"condition": "Equals", "value": "document"}},
    "context": {"$.time": {"condition": "InRange", "value": ["09:00", "18:00"]}}
  }
}
```

**コード埋め込み型**

**CASL (JavaScript/TypeScript)** - 条件をコードで記述
```typescript
defineAbilitiesFor(user) {
  can('read', 'Article', { authorId: user.id })
  can('update', 'Article', { 
    authorId: user.id,
    published: false 
  })
}
```
- 利点：型安全、IDEサポート、デバッグが容易
- 欠点：ポリシーの外部化が困難

**Pundit (Ruby)** - ポリシークラスメソッド
```ruby
class ArticlePolicy
  def update?
    user.admin? || (
      record.author == user && 
      record.published_at.nil? &&
      Time.current.hour.between?(9, 18)
    )
  end
end
```

**標準仕様型**

**XACML (Java等)** - OASIS標準のXML
```xml
<Policy>
  <Rule Effect="Permit">
    <Condition>
      <Apply FunctionId="time-in-range">
        <AttributeValue>09:00:00</AttributeValue>
        <AttributeValue>18:00:00</AttributeValue>
      </Apply>
    </Condition>
  </Rule>
</Policy>
```
- 利点：標準化、相互運用性
- 欠点：極めて冗長、人間には読みにくい

#### 2.5.2 評価エンジンの実装パターン

| パターン | 代表例 | 特徴 | 学習への影響 |
|---------|--------|------|------------|
| **インタープリタ型** | Casbin、OPA | ポリシーを実行時に解釈 | 柔軟だが性能面で劣る |
| **コンパイル型** | 一部のXACML実装 | ポリシーを事前にコンパイル | 高速だが動的変更が困難 |
| **ハイブリッド型** | CASL | 一部をコンパイル、一部を実行時評価 | バランスが良い |

#### 2.5.3 Effect（Permit/Deny）のサポート状況

**明示的なDenyをサポート** ✅
- Casbin、OPA、XACML、py-abac、Vakt
- 細かい例外制御が可能
- セキュリティポリシーの表現力が高い

**Permitのみ（暗黙的なDeny）** ❌
- 一部の簡易実装
- Default Denyパターン
- シンプルだが表現力に限界

### 2.6 権限管理モデルの進化における位置づけ

```
Unix → ACL → RBAC → ABAC → ReBAC
              ↑       ↑
           静的    動的・文脈依存
          (役割)   (属性評価)
```

各モデルから次への発展：
- **RBAC → ABAC**: 「誰が（Who）」から「どんな条件で（What conditions）」への転換
- **静的から動的へ**: 事前定義されたロールから、実行時の属性評価へ
- **文脈の考慮**: 時間、場所、デバイスなどの環境要因を権限判定に組み込む

## 3. 検討した設計オプション

### 3.1 ポリシー言語の設計

#### 3.1.1 DSL vs JSON vs コード埋め込み

**オプション1: 独自DSL**
```typescript
// 文字列ベースのDSL
"user.department == resource.department AND user.level >= 3"
```
- 利点：表現力が高い、コンパクト
- 欠点：パーサーの実装が必要、型安全性なし

**オプション2: JSON構造**
```typescript
{
  type: 'and',
  conditions: [
    { type: 'equals', left: 'user.department', right: 'resource.department' },
    { type: 'gte', left: 'user.level', value: 3 }
  ]
}
```
- 利点：構造化、拡張性
- 欠点：冗長、ネストが深くなる

**オプション3: 関数ベース（採用）**
```typescript
condition: (ctx: EvaluationContext) => boolean
```
- 利点：型安全、デバッグ容易、IDE支援
- 欠点：ポリシーの外部化が困難
- **学習用として最適**：デバッガでステップ実行可能

### 3.2 属性の型システム

#### 3.2.1 型安全性 vs 柔軟性

**オプション1: 厳密な型定義**
```typescript
interface SubjectAttributes {
  department: string
  level: number
  clearance: 'public' | 'internal' | 'confidential' | 'secret'
}
```
- 利点：型安全、補完が効く
- 欠点：拡張性が低い

**オプション2: 柔軟な型定義（採用）**
```typescript
type AttributeValue = string | number | boolean | Date
type Attributes = Record<string, AttributeValue>
```
- 利点：拡張性が高い、実システムに近い
- 欠点：実行時の型チェックが必要

### 3.3 評価結果の設計

#### 3.3.1 Simple vs Detailed

**オプション1: シンプルなboolean**
```typescript
evaluate(context: EvaluationContext): boolean
```

**オプション2: 詳細な結果（採用）**
```typescript
type PolicyDecision = 
  | { type: 'permit'; matchedRule: PolicyRule; context: EvaluationContext }
  | { type: 'deny'; matchedRule: PolicyRule; context: EvaluationContext }
  | { type: 'not-applicable'; reason: string }
```
- デバッグ情報が豊富
- なぜ許可/拒否されたかが明確

### 3.4 競合解決戦略

#### 3.4.1 複数ルールがマッチした場合の処理

**オプション1: First-Match（最初にマッチしたルール）**
- 単純で高速
- ルールの順序が重要

**オプション2: Deny-Override（Deny優先）**
- セキュリティ原則に合致
- 最も一般的な戦略

**オプション3: Permit-Override（Permit優先）**
- 利便性重視
- 特殊なケースで使用

**オプション4: Priority-Based（優先度ベース）（採用）**
```typescript
type PolicyRule = {
  priority?: number  // 低い値が高優先度
  // ...
}
```
- 柔軟な制御が可能
- 学習用として様々な戦略を実装可能

### 3.5 APIの設計

#### 3.5.1 最小限 vs 完全

**オプション1: 最小限のAPI（採用）**
```typescript
class PolicyEvaluationEngine {
  evaluate(context: EvaluationContext): PolicyDecision
  addPolicy(rule: PolicyRule): void
  removePolicy(ruleId: string): void
}
```
- 3メソッドのみ
- ABACの本質に集中

**オプション2: 完全なAPI**
```typescript
// 上記に加えて
  listPolicies(): PolicyRule[]
  getPolicy(ruleId: string): PolicyRule
  validatePolicy(rule: PolicyRule): ValidationResult
  // ...
```

## 4. 決定事項

### 4.1 採用した設計

#### 4.1.1 関数ベースの条件記述

学習効果を最大化するため、条件を関数として記述：

```typescript
type PolicyRule = {
  id: string
  description?: string
  effect: 'permit' | 'deny'
  condition: (context: EvaluationContext) => boolean
  priority?: number  // 低い値が高優先度
}
```

理由：
- **デバッグが容易**：ブレークポイントを設定可能
- **型安全**：TypeScriptの型チェックが効く
- **理解しやすい**：通常のコードとして読める
- **テストしやすい**：単体テストが書きやすい

#### 4.1.2 柔軟な属性システム

```typescript
type AttributeValue = string | number | boolean | Date
type Attributes = Record<string, AttributeValue>

type EvaluationContext = {
  subject: Attributes    // ユーザー属性
  resource: Attributes   // リソース属性
  action: PermissionAction  // 'read' | 'write'
  environment: Attributes // 環境属性
}
```

理由：
- 様々な属性タイプに対応
- 実システムの柔軟性を体験
- 動的な属性追加が可能

#### 4.1.3 詳細な評価結果（Tagged Union）

```typescript
type PolicyDecision = 
  | { 
      type: 'permit'
      matchedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'deny'
      matchedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'not-applicable'
      reason: string
    }
```

理由：
- デバッグ情報が豊富
- 監査ログに必要な情報を含む
- 型安全な結果処理

#### 4.1.4 優先度ベースの競合解決

```typescript
class PolicyEvaluationEngine {
  private resolutionStrategy: 'first-match' | 'deny-override' | 'permit-override' | 'priority'
  
  evaluate(context: EvaluationContext): PolicyDecision {
    // strategeに基づいて評価
  }
}
```

理由：
- 様々な戦略を学習可能
- 実システムの多様性を理解
- 切り替え可能な実装

#### 4.1.5 最小限のAPI設計

```typescript
class PolicyEvaluationEngine {
  constructor(strategy?: ResolutionStrategy)
  
  // ポリシー評価（業界標準の"evaluate"）
  evaluate(context: EvaluationContext): PolicyDecision
  
  // ポリシー管理
  addPolicy(rule: PolicyRule): void
  removePolicy(ruleId: string): void
}
```

理由：
- `evaluate`：XACML、OPA等の標準用語
- 最小限の3メソッド
- ABACの本質に集中

### 4.2 メソッド名の選定理由

各権限管理方式で意図的に異なるメソッド名を使用：

| 権限モデル | メソッド名 | 理由 |
|-----------|-----------|------|
| Unix | `hasPermission` | 権限の有無を確認 |
| ACL | `resolveAccess` | Allow/Denyエントリーの競合を解決 |
| RBAC | `authorize` | ロール基づく認可 |
| **ABAC** | **`evaluate`** | **ポリシー・属性を評価** |
| ReBAC | `checkRelation` | 関係性を確認 |

`evaluate`を選択した理由：
- XACML、OPA等の業界標準
- 「評価」という動的な処理を表現
- ポリシーと属性の組み合わせ評価を示唆

## 5. 理由と根拠

### 5.1 学習効果の最大化

#### 5.1.1 ABACの核心概念への集中

- 属性ベースの動的評価
- ポリシー言語の設計思想
- 文脈依存のアクセス制御
- 競合解決戦略

#### 5.1.2 段階的な理解

1. 単純な属性比較から開始
2. 複合条件の組み合わせ
3. 環境属性の活用
4. 優先度による制御

#### 5.1.3 実践的なパターンの学習

- 営業時間制限
- 部門ベースアクセス
- 機密レベル管理
- IPアドレス制限

### 5.2 他の実装との比較学習

#### 5.2.1 ACL/RBAC/ABACの使い分け

| 観点 | ACL | RBAC | ABAC |
|------|-----|------|------|
| **権限の定義** | 個別設定 | ロール経由 | ポリシー＋属性 |
| **柔軟性** | 低 | 中 | 高 |
| **管理コスト** | 高 | 中 | 中～高 |
| **動的制御** | 不可 | 限定的 | 完全対応 |
| **適用場面** | 小規模 | 組織的 | 複雑な要件 |

#### 5.2.2 移行パスの理解

- RBAC → ABAC：ロールを属性の一つとして扱う
- 段階的移行：一部をABAC化し、徐々に拡張
- ハイブリッド：RBACとABACの併用

### 5.3 設計のトレードオフ

#### 5.3.1 採用した設計の利点

- **関数ベース条件**：デバッグ容易、型安全
- **柔軟な属性**：実システムの多様性を体験
- **優先度ベース**：様々な戦略を学習可能

#### 5.3.2 制限事項

- ポリシーの外部化が困難（学習用では問題なし）
- 実行時のポリシー変更に制限
- パフォーマンスは考慮外

## 6. 実装例

### 6.1 基本的なポリシー定義

```typescript
// 営業時間内のみアクセス許可
const businessHoursPolicy: PolicyRule = {
  id: 'business-hours',
  description: '営業時間（9-18時）のみアクセス可能',
  effect: 'permit',
  priority: 10,
  condition: (ctx) => {
    const hour = (ctx.environment.currentTime as Date).getHours()
    return hour >= 9 && hour <= 18
  }
}

// 同一部門のドキュメントのみアクセス可能
const departmentPolicy: PolicyRule = {
  id: 'same-department',
  description: '同一部門のドキュメントのみアクセス可能',
  effect: 'permit',
  priority: 20,
  condition: (ctx) => 
    ctx.subject.department === ctx.resource.department
}

// 機密レベルチェック（Deny）
const clearancePolicy: PolicyRule = {
  id: 'clearance-check',
  description: 'クリアランスレベル不足の場合は拒否',
  effect: 'deny',
  priority: 1,  // 高優先度（セキュリティ優先）
  condition: (ctx) => {
    const subjectLevel = ctx.subject.clearanceLevel as number
    const resourceLevel = ctx.resource.classificationLevel as number
    return subjectLevel < resourceLevel
  }
}
```

### 6.2 評価エンジンの使用例

```typescript
// エンジンの初期化
const engine = new PolicyEvaluationEngine('priority')

// ポリシーの登録
engine.addPolicy(businessHoursPolicy)
engine.addPolicy(departmentPolicy)
engine.addPolicy(clearancePolicy)

// 評価コンテキストの作成
const context: EvaluationContext = {
  subject: {
    userId: 'alice',
    department: 'engineering',
    clearanceLevel: 2,
    role: 'developer'
  },
  resource: {
    documentId: 'doc-123',
    department: 'engineering',
    classificationLevel: 3,
    owner: 'bob'
  },
  action: 'read',
  environment: {
    currentTime: new Date('2024-01-15T10:00:00'),
    ipAddress: '192.168.1.100',
    deviceType: 'desktop'
  }
}

// アクセス評価
const decision = engine.evaluate(context)

// 結果の処理
switch (decision.type) {
  case 'permit':
    console.log(`アクセス許可: ${decision.matchedRule.description}`)
    break
  case 'deny':
    console.log(`アクセス拒否: ${decision.matchedRule.description}`)
    break
  case 'not-applicable':
    console.log(`該当ポリシーなし: ${decision.reason}`)
    break
}
```

### 6.3 複合条件の例

```typescript
// 管理者の緊急アクセス（複数条件の組み合わせ）
const emergencyAccessPolicy: PolicyRule = {
  id: 'emergency-admin',
  description: '管理者による緊急アクセス',
  effect: 'permit',
  priority: 0,  // 最高優先度
  condition: (ctx) => {
    const isAdmin = ctx.subject.role === 'admin'
    const isEmergency = ctx.environment.emergencyMode === true
    const isFromTrustedNetwork = (ctx.environment.ipAddress as string)
      .startsWith('10.0.')
    
    return isAdmin && isEmergency && isFromTrustedNetwork
  }
}

// 時間外アクセスの制限（環境属性の活用）
const afterHoursRestriction: PolicyRule = {
  id: 'after-hours-restriction',
  description: '時間外は管理者のみアクセス可能',
  effect: 'deny',
  priority: 5,
  condition: (ctx) => {
    const hour = (ctx.environment.currentTime as Date).getHours()
    const isAfterHours = hour < 9 || hour >= 18
    const isNotAdmin = ctx.subject.role !== 'admin'
    
    return isAfterHours && isNotAdmin
  }
}
```

### 6.4 テスト例

```typescript
describe('PolicyEvaluationEngine', () => {
  let engine: PolicyEvaluationEngine
  
  beforeEach(() => {
    engine = new PolicyEvaluationEngine('deny-override')
  })
  
  it('営業時間内のアクセスを許可', () => {
    engine.addPolicy(businessHoursPolicy)
    
    const context = createContext({
      environment: { currentTime: new Date('2024-01-15T10:00:00') }
    })
    
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('permit')
  })
  
  it('クリアランスレベル不足を拒否', () => {
    engine.addPolicy(clearancePolicy)
    
    const context = createContext({
      subject: { clearanceLevel: 1 },
      resource: { classificationLevel: 3 }
    })
    
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('deny')
  })
  
  it('複数ポリシーの競合をDeny優先で解決', () => {
    engine.addPolicy(departmentPolicy)  // permit
    engine.addPolicy(clearancePolicy)   // deny
    
    const context = createContext({
      subject: { department: 'eng', clearanceLevel: 1 },
      resource: { department: 'eng', classificationLevel: 3 }
    })
    
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('deny')  // Deny優先
  })
})
```

## 7. 結果と影響

### 7.1 利点

#### 7.1.1 動的な権限制御の理解

- 実行時の属性評価
- 文脈に応じた柔軟な制御
- 環境要因の考慮

#### 7.1.2 ポリシー設計スキル

- 条件の適切な粒度
- 競合の予測と解決
- パフォーマンスへの配慮

#### 7.1.3 実践的な知識

- 時間ベース制限の実装
- 組織階層の表現
- セキュリティレベル管理

### 7.2 トレードオフ

#### 7.2.1 学習用の簡略化

- ポリシーの外部化は省略
- パフォーマンス最適化は考慮外
- エラーハンドリングは最小限

#### 7.2.2 実システムとの差異

- PIP/PAP等の分離なし
- ポリシー言語は関数ベース
- 属性の動的取得は簡略化

### 7.3 将来の拡張性

#### 7.3.1 ポリシー言語の拡張

```typescript
// JSONベースのポリシー定義への移行
type JsonPolicy = {
  id: string
  effect: 'permit' | 'deny'
  condition: {
    operator: 'and' | 'or' | 'not'
    operands: Condition[]
  }
}
```

#### 7.3.2 属性リゾルバーの追加

```typescript
interface AttributeResolver {
  resolve(entity: string, attribute: string): Promise<AttributeValue>
}
```

#### 7.3.3 ReBACへの発展

- 関係性を属性として扱う
- グラフベースの評価への拡張

## 8. テスト戦略

### 8.1 単体テスト

必須のテストケース：

1. **基本的な属性評価**
   - 文字列比較
   - 数値比較
   - 日付比較

2. **複合条件**
   - AND/OR条件
   - ネストした条件

3. **環境属性**
   - 時間ベース
   - IPアドレス
   - デバイス種別

4. **競合解決**
   - Deny優先
   - Permit優先
   - 優先度ベース

5. **エッジケース**
   - 属性欠落
   - 型の不一致
   - 空のポリシー

### 8.2 統合テスト

シナリオベースのテスト：

1. **営業時間シナリオ**
   - 時間内/外のアクセス
   - 管理者の例外

2. **部門間アクセス**
   - 同一部門
   - 他部門
   - 共有リソース

3. **機密文書アクセス**
   - レベル階層
   - 緊急時の昇格

4. **複合シナリオ**
   - 複数条件の組み合わせ
   - 動的な属性変更

## 9. 参考情報

### 9.1 ABAC関連の文献

- NIST SP 800-162: Guide to Attribute Based Access Control
- XACML 3.0 OASIS Standard
- "Attribute-Based Access Control" by Vincent C. Hu and Karen Scarfone

### 9.2 実装例

#### 9.2.1 汎用・多言語

- **Casbin** (Go/多言語): 最も包括的なアクセス制御ライブラリ
- **Open Policy Agent (OPA)**: クラウドネイティブ向けポリシーエンジン

#### 9.2.2 JavaScript/TypeScript

- **CASL**: 条件ベースの権限管理
- **node-abac**: JSONベースのABAC実装

#### 9.2.3 Python

- **py-abac**: JSONスキーマベースの実装
- **Vakt**: AWS IAM風のポリシー記述

#### 9.2.4 Ruby

- **Pundit**: ポリシークラスベースの条件評価

#### 9.2.5 Java

- **XACML実装各種**: 標準仕様準拠の実装

### 9.3 関連するADR

- Unix権限実装のADR
- ACL実装のADR（本プロジェクト内）
- RBAC実装のADR（本プロジェクト内）
- ReBAC実装のADR（今後作成予定）

## 10. まとめ

このABAC実装は、権限管理の発展における重要なステップである属性ベースの動的評価を学習するために設計されています。RBACの静的なロールベース管理から、ABACの動的で文脈依存の権限制御への移行を体験することで、より複雑な要件に対応できる権限管理の設計と実装を理解できます。

関数ベースの条件記述と最小限のAPIにより、ABACの本質的な概念に集中しながら、実践的なパターンを学習できる設計となっています。