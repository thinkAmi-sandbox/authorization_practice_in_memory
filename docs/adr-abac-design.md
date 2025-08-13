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

### 2.4 RBACとABACの中心概念の違い

#### 2.4.1 権限管理の中心概念の対比

**RBACの中心概念:**
```
ユーザー → 【ロール】 → 権限
```
- **ロール**が権限を抽象化する中心的な概念
- ユーザーはロールを通じて間接的に権限を取得
- 静的な権限割り当て

**ABACの中心概念:**
```
【属性】 → 【ポリシー】 → 権限判定
```
- **属性**（Attributes）が基本要素
- **ポリシー**（Policy）は属性を評価するルール
- 動的な権限評価

#### 2.4.2 概念の対応関係

| 要素 | RBAC | ABAC |
|------|------|------|
| **権限の源泉** | ロール（役割） | 属性（特性） |
| **評価方法** | ロールの有無をチェック | ポリシーで属性を評価 |
| **中心概念** | ロール | 属性＋ポリシー |
| **権限判定** | 静的（事前定義） | 動的（実行時評価） |

#### 2.4.3 具体的な違いの例

**RBAC：ロールが権限を決定**
```typescript
// ロール自体が権限のコンテナ
if (user.hasRole('editor')) {
  // editorロール = 編集権限
  return 'granted'
}
```

**ABAC：ポリシーが属性を評価して決定**
```typescript
// ポリシーは属性を評価する関数
const policy: PolicyRule = {
  effect: 'permit',
  condition: (ctx) => {
    // 複数の属性を動的に評価
    return ctx.subject.department === ctx.resource.department && 
           ctx.subject.level >= 3 &&
           ctx.environment.time.getHours() >= 9
  }
}
```

#### 2.4.4 ポリシーの役割

**重要な理解：ポリシーはロールの「代わり」ではなく「評価ルール」**

1. **RBAC**: ロール自体が権限のコンテナ
   - `role: 'editor' = { read: true, write: true }`
   - ロールと権限は1対1の静的な関係

2. **ABAC**: ポリシーは属性を評価する関数
   - `policy = (attributes) => boolean`
   - 属性の組み合わせを動的に評価

#### 2.4.5 RBACとABACの包含関係

興味深いことに、ABACはRBACを包含できます。ロールを属性の一つとして扱うことで、RBACの機能をABAC内で実現可能：

```typescript
// ABACでロールを属性として使用（ハイブリッドアプローチ）
const hybridPolicy: PolicyRule = {
  effect: 'permit',
  condition: (ctx) => {
    // ロールも属性の一つとして評価
    const hasEditorRole = ctx.subject.role === 'editor'
    const inBusinessHours = ctx.environment.time.getHours() >= 9
    const sameDepartment = ctx.subject.department === ctx.resource.department
    
    // ロール＋他の属性を組み合わせて評価
    return hasEditorRole && inBusinessHours && sameDepartment
  }
}
```

これは「ロール → ポリシー」という単純な置き換えではなく、「静的なロール割り当て → 動的な属性評価」というパラダイムシフトを表しています。

### 2.5 ABACの核心概念の学習

ABACの学習において重要な概念：

1. **属性（Attributes）**: エンティティの特性
   
   **重要**: 以下の属性カテゴリーは**学習用の典型例**であり、ABACで必須の属性ではありません。
   ABACの本質は「属性ベース」であることで、どんな属性を使うかは実装や要件次第です。
   
   - **Subject属性（例）**: ユーザーの部門、職位、クリアランスレベル、役割（ロール）
   - **Resource属性（例）**: ドキュメントの機密度、所有部門、作成日時
   - **Environment属性（例）**: アクセス時刻、IPアドレス、デバイス種別
   - **Action属性（例）**: 操作の種類、緊急度
   
   実際のABAC実装では、業務要件に応じて必要な属性を自由に定義できます。
   この柔軟性こそが、RBACの固定的なロールと対照的なABACの強みです。

2. **ポリシー（Policy）**: 属性を評価するルール
   - **条件（Condition）**: 属性間の関係を定義する評価関数
   - **効果（Effect）**: permit（許可）またはdeny（拒否）
   - **優先度（Priority）**: 競合解決のための重要度

3. **ポリシー評価エンジン（Policy Evaluation Engine）**:
   
   XACML標準で定義された4つのコンポーネントがABACアーキテクチャを構成します：
   
   - **PEP（Policy Enforcement Point）**: アクセス要求を受け付け、決定を実行
     - アプリケーションとの統合点となる
     - ユーザーのアクセス要求を受け取る
     - PDPの決定に基づいてアクセスを許可/拒否
     - 実際のリソースへのアクセスを制御
   
   - **PDP（Policy Decision Point）**: ポリシーを評価し決定を下す
     - ポリシーの評価ロジックを実行
     - コンテキストに基づいて permit/deny/not-applicable を決定
     - 競合解決戦略を実装
     - ビジネスロジックから独立した評価エンジン
   
   - **PIP（Policy Information Point）**: 属性情報を提供
     - ユーザー、リソース、環境の属性を収集
     - データソースから必要な属性を取得
     - 属性の取得を一元化し、データソースを抽象化
     - 学習用実装ではインメモリで属性を管理
   
   - **PAP（Policy Administration Point）**: ポリシーを管理
     - ポリシーのライフサイクル管理（追加、更新、削除）
     - ポリシーの保存と取得
     - ポリシーの一貫性を保証
     - 学習用実装では簡単なMapで管理

### 2.6 ポリシー評価エンジンのアーキテクチャ詳細

#### 2.6.1 4つのコンポーネントの連携フロー

ABACのポリシー評価は、以下のフローで実行されます：

```
1. アプリケーション → PEP: アクセス要求
2. PEP → PIP: 属性情報の要求
3. PIP → PEP: 属性情報の返却
4. PEP → PDP: 評価コンテキストと共に評価要求
5. PDP → PAP: ポリシーの取得
6. PAP → PDP: ポリシーセットの返却
7. PDP → PEP: 評価結果（permit/deny/not-applicable）
8. PEP → アプリケーション: アクセス制御の実行
```

#### 2.6.2 学習用実装での簡略化

本学習用実装では、以下の簡略化を行います：

1. **PIPの簡略化**: データベースアクセスの代わりにインメモリで属性を管理
2. **PAPの簡略化**: ポリシーストレージとして単純なMapを使用
3. **統合的な実装**: 学習効果を重視し、各コンポーネントの役割を明確に分離しつつも、単一クラスで実装可能な設計

#### 2.6.3 各コンポーネントの責務と学習ポイント

**学習者が実装すべき各コンポーネントの責務：**

| コンポーネント | 責務 | 学習ポイント |
|--------------|------|-------------|
| **PEP** | アクセス制御の実施 | アプリケーションとの統合方法 |
| **PDP** | ポリシー評価ロジック | 競合解決戦略の実装 |
| **PIP** | 属性の収集と提供 | データ抽象化の概念 |
| **PAP** | ポリシー管理 | ライフサイクル管理の基礎 |

この分離により、各コンポーネントを独立して学習・実装でき、ABACの本質的な構造を理解できます。

### 2.7 属性のカテゴリー構造と文脈の明確化

#### 2.7.1 なぜ属性をカテゴリー別に整理するのか

ABACでは、属性を**カテゴリー別に整理することで文脈を明確化**します：

**フラットな構造の問題点:**
```typescript
// 文脈が不明瞭
{
  department: 'engineering',      // これは誰の部門？
  documentDepartment: 'finance',  // 命名規則が複雑に
  userLevel: 3,
  resourceLevel: 5
}
```

**カテゴリー別構造の利点:**
```typescript
{
  subject: {
    department: 'engineering',    // ユーザーが所属する部門
    clearanceLevel: 3
  },
  resource: {
    department: 'finance',        // ドキュメントを管理する部門
    classificationLevel: 5
  }
}
```

#### 2.7.2 文脈の明確化によるメリット

1. **名前空間の整理**: 同じ属性名でも文脈が明確
   - `subject.department` vs `resource.department`

2. **ポリシーの可読性向上**:
```typescript
condition: (ctx) => {
  // 意図が明確：「アクセスする人の」部門と「ドキュメントの」部門を比較
  return ctx.subject.department === ctx.resource.department
      && ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
}
```

3. **拡張性**: 新しい属性を適切なカテゴリーに追加しやすい

4. **業界標準との整合性**: XACML、OPA等もこの構造を採用

### 2.8 実際のABACライブラリの実装パターン

主要なABACライブラリを調査した結果、以下のアプローチに分類されることが判明しました：

#### 2.8.1 ポリシー記述言語による分類

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

#### 2.8.2 評価エンジンの実装パターン

| パターン | 代表例 | 特徴 | 学習への影響 |
|---------|--------|------|------------|
| **インタープリタ型** | Casbin、OPA | ポリシーを実行時に解釈 | 柔軟だが性能面で劣る |
| **コンパイル型** | 一部のXACML実装 | ポリシーを事前にコンパイル | 高速だが動的変更が困難 |
| **ハイブリッド型** | CASL | 一部をコンパイル、一部を実行時評価 | バランスが良い |

#### 2.8.3 Effect（Permit/Deny）のサポート状況

**明示的なDenyをサポート** ✅
- Casbin、OPA、XACML、py-abac、Vakt
- 細かい例外制御が可能
- セキュリティポリシーの表現力が高い

**Permitのみ（暗黙的なDeny）** ❌
- 一部の簡易実装
- Default Denyパターン
- シンプルだが表現力に限界

### 2.9 権限管理モデルの進化における位置づけ

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

**オプション1: 柔軟な型定義**
```typescript
type AttributeValue = string | number | boolean | Date
type Attributes = Record<string, AttributeValue>
```
- 利点：拡張性が高い、実システムに近い
- 欠点：実行時の型チェックが必要、学習時に何の属性を使うべきか不明確

**オプション2: 厳密な型定義（学習用として採用）**
```typescript
interface SubjectAttributes {
  userId: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  role: 'admin' | 'manager' | 'developer' | 'viewer'
  clearanceLevel: 1 | 2 | 3 | 4 | 5  // 1=最低、5=最高
}

interface ResourceAttributes {
  documentId: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  classificationLevel: 1 | 2 | 3 | 4 | 5
  owner: string
  createdAt: Date
}

interface EnvironmentAttributes {
  currentTime: Date
  ipAddress: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  location: 'office' | 'home' | 'external'
}
```
- 利点：型安全、IDEの補完が効く、学習時に概念を明確に理解できる
- 欠点：拡張性が低い（学習用では問題なし）

**学習効果の観点から厳密な型定義を採用する理由:**
- ABACの概念理解が深まる（どんな属性があるか明確）
- 実装ミスを防げる（タイポが即座にエラーに）
- デバッグが容易（型安全なポリシー記述）

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

### 3.4 Effect（効果）の用語選定

#### 3.4.1 permit vs allow の選択

ABACのEffect（効果）を表す用語として、`permit/deny`または`allow/deny`が主要ライブラリで使用されています。

**標準仕様と主要実装の調査結果：**

| 実装 | Effect用語 | 備考 |
|------|-----------|------|
| **XACML (OASIS標準)** | `Permit/Deny` | ABACの最も正式な標準仕様 |
| **Casbin** | `permit/deny` | 多言語対応の包括的ライブラリ |
| **OPA** | `allow/deny` | クラウドネイティブ向け |
| **node-abac** | `permit/deny` | JavaScript実装 |
| **py-abac** | `allow/deny` | Python実装 |

**本実装では`permit/deny`を採用：**

理由：
1. **XACML標準準拠**: OASIS標準のXACMLが`Permit/Deny`を使用しており、業界標準として確立
2. **意味の明確性**: 
   - `permit` = ポリシー評価による明示的な許可の付与
   - `allow` = より曖昧な許容（単に認める）
   - ABACの「ポリシー評価による明示的な決定」という性質に`permit`が適合
3. **学習効果**: 標準仕様の用語を学ぶことで、実際のABACシステムやXACML、Casbinなどの主要実装の理解が深まる

### 3.5 Deny（拒否）機能の必要性

#### 3.5.1 RBACとABACにおけるDenyの根本的な違い

**RBACにおけるDeny:**
- **通常は不要**: ロールベースの加算的モデル（ロールがある=権限あり、ない=権限なし）
- **組織構造との対応**: 職務に基づく静的な権限管理
- **シンプルな管理**: 「必要なロールがない」という単純な理由でアクセス拒否

**ABACにおけるDeny:**
- **必須機能**: 動的な条件評価には明示的な拒否が不可欠
- **文脈依存の制御**: 属性の組み合わせによる複雑な条件を表現
- **セキュリティ要件**: コンプライアンスやセキュリティポリシーの厳格な実装

#### 3.5.2 ABACでDenyが必要な理由

**1. セキュリティ違反の防止**
```typescript
// 例：機密文書への不正アクセス防止
const securityDenyPolicy: PolicyRule = {
  id: 'deny-insufficient-clearance',
  effect: 'deny',
  priority: 1,  // 最高優先度
  condition: (ctx) => {
    // クリアランスレベル不足は明示的に拒否
    return ctx.subject.clearanceLevel < ctx.resource.classificationLevel
  }
}
```

**2. コンプライアンス要件の実装**
```typescript
// 例：GDPR準拠のデータアクセス制御
const gdprCompliancePolicy: PolicyRule = {
  id: 'gdpr-cross-border-restriction',
  effect: 'deny',
  condition: (ctx) => {
    const isEUData = ctx.resource.dataSubjectLocation === 'EU'
    const isUSAccess = ctx.environment.accessLocation === 'US'
    const hasAgreement = ctx.subject.dataTransferAgreement === true
    return isEUData && isUSAccess && !hasAgreement
  }
}
```

**3. 環境ベースの制限**
```typescript
// 例：外部ネットワークからの機密アクセス制限
const networkRestrictionPolicy: PolicyRule = {
  id: 'deny-external-confidential',
  effect: 'deny',
  condition: (ctx) => {
    const isExternal = !ctx.environment.ipAddress.startsWith('10.')
    const isConfidential = ctx.resource.classification === 'confidential'
    return isExternal && isConfidential
  }
}
```

#### 3.5.3 Deny機能の設計決定

本実装では、ABACの本質的な要件としてDenyを完全にサポートすることを決定：

| 観点 | RBAC | ABAC（本実装） |
|------|------|--------------|
| **Denyの有無** | なし（純粋なRBAC） | **あり（必須）** |
| **理由** | ロールの加算的モデル | 属性の動的評価 |
| **実装の複雑性** | シンプル | 競合解決戦略が必要 |
| **使用例** | 組織の役割 | セキュリティ、コンプライアンス、環境制御 |

### 3.6 not-applicableの扱い

#### 3.6.1 ポリシーがマッチしない場合の設計

ABACでは、permit/denyのポリシーにマッチしない場合の扱いが重要な設計判断となります。

**主要ライブラリの実装パターン:**

| ライブラリ | 返り値 | not-applicable相当の扱い |
|-----------|--------|------------------------|
| **XACML系** | 3〜4値 | 明示的に`NotApplicable` |
| **py-abac** | 3値 | 明示的に`NotApplicable` |
| **CASL** | boolean | `false`として扱う |
| **Pundit** | boolean/例外 | `false`または例外 |
| **Casbin** | boolean | `false`として扱う |
| **OPA** | boolean | `undefined`→`false` |

**本実装の決定: 3値（permit/deny/not-applicable）を明示的に返す**

理由：
1. **XACML標準準拠**: OASIS標準では明確に3つの状態を定義
2. **デバッグの容易性**: なぜ判定されなかったかの理由を含められる
3. **明示的な状態表現**: ポリシー未定義と明示的拒否を区別できる
4. **学習効果**: ABACの概念を正確に理解できる

#### 3.6.2 not-applicableの解釈と実装責任

**重要な原則: 解釈は呼び出し側（PEP）の責任**

ABACエンジン（PDP）は評価結果として`not-applicable`を返しますが、最終的なアクセス許可/拒否の判断は呼び出し側が行います：

```typescript
// パターン1: Default Deny（推奨）
const decision = engine.evaluate(context)
if (decision.type === 'permit') {
  // アクセス許可
} else {
  // deny または not-applicable → 拒否
}

// パターン2: フォールバック処理
switch (decision.type) {
  case 'permit':
    return allowAccess()
  case 'deny':
    return rejectAccess()
  case 'not-applicable':
    // 別の認可方式にフォールバック
    return checkRBACPermission(user, resource)
}

// パターン3: エラーとして扱う
case 'not-applicable':
  // ポリシー設定ミスの可能性
  logger.warn('No applicable policy found', context)
  return rejectWithError('Policy configuration error')
```

この設計により：
- ABACエンジンは純粋な評価ロジックに集中
- アプリケーション側でセキュリティポリシーを柔軟に実装可能
- 監査ログで「明示的な拒否」と「ポリシー未適用」を区別可能

### 3.7 競合解決戦略

#### 3.7.1 複数ルールがマッチした場合の処理

Denyを実装することで、PermitとDenyのルールが競合する可能性があるため、解決戦略が重要：

**オプション1: First-Match（最初にマッチしたルール）**
- 単純で高速
- ルールの順序が重要

**オプション2: Deny-Override（Deny優先）（推奨）**
- セキュリティ原則に合致
- 最も一般的な戦略
- 明示的な拒否は常に優先される

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
- Denyルールに高優先度を設定することでセキュリティを確保

### 3.8 ポリシーの組み合わせ設計

#### 3.8.1 単一ポリシー vs 複数ポリシー

**複数ポリシーの組み合わせを前提とした設計（採用）**

ABACでは、複数のポリシーを組み合わせることが一般的です：

1. **関心の分離**: 各ポリシーが特定の観点を担当
   - 営業時間チェックポリシー
   - 部門アクセス制御ポリシー
   - 機密レベルチェックポリシー

2. **柔軟な組み合わせ**: 状況に応じてポリシーを追加・削除可能

3. **実世界の要件への対応**: 複数の制約条件が同時に存在
   - 「営業時間内」AND「同一部門」AND「適切なクリアランスレベル」

これは、RBACの「ロールを持っているか」という単純なチェックとは対照的で、
ABACの動的評価の強みを示しています。

### 3.9 APIの設計

#### 3.9.1 最小限 vs 完全

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

#### 4.1.2 厳密な属性システム（学習用最適化）

```typescript
// 学習効果を最大化するため、事前定義された属性型を採用
interface SubjectAttributes {
  userId: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  role: 'admin' | 'manager' | 'developer' | 'viewer'
  clearanceLevel: 1 | 2 | 3 | 4 | 5
}

interface ResourceAttributes {
  documentId: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  classificationLevel: 1 | 2 | 3 | 4 | 5
  owner: string
  createdAt: Date
}

interface EnvironmentAttributes {
  currentTime: Date
  ipAddress: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  location: 'office' | 'home' | 'external'
}

type EvaluationContext = {
  subject: SubjectAttributes
  resource: ResourceAttributes
  action: PermissionAction  // 'read' | 'write'
  environment: EnvironmentAttributes
}
```

理由：
- **概念の明確化**: 各属性の役割と型が明確
- **IDEサポート**: 完全な型補完とエラー検出
- **学習の容易さ**: 何を実装すべきかが明示的
- **デバッグ効率**: コンパイル時にエラーを検出

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

#### 4.1.4 明示的なDenyのサポート

ABACの本質的な要件として、明示的なDenyを完全にサポート：

```typescript
type PolicyRule = {
  id: string
  description?: string
  effect: 'permit' | 'deny'  // 明示的なpermit/deny
  condition: (context: EvaluationContext) => boolean
  priority?: number
}
```

理由：
- **セキュリティ要件の実装**: クリアランスレベル、機密度チェック
- **コンプライアンス対応**: GDPR等の規制要件の表現
- **環境制御**: ネットワーク、時間帯による制限
- **RBACとの差別化**: 動的評価には明示的な拒否が必須

#### 4.1.5 優先度ベースの競合解決

```typescript
class PolicyEvaluationEngine {
  private resolutionStrategy: 'first-match' | 'deny-override' | 'permit-override' | 'priority'
  
  evaluate(context: EvaluationContext): PolicyDecision {
    // strategyに基づいて評価
    // デフォルトはdeny-override（セキュリティ優先）
  }
}
```

理由：
- 様々な戦略を学習可能
- 実システムの多様性を理解
- 切り替え可能な実装
- Deny優先をデフォルトとしてセキュリティを確保

#### 4.1.6 最小限のAPI設計

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
- **厳密な属性型**：学習効果の最大化、IDE支援の活用
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

// 評価コンテキストの作成（型安全）
const context: EvaluationContext = {
  subject: {
    userId: 'alice',
    department: 'engineering',  // 型定義により選択肢が限定
    clearanceLevel: 2,          // 1-5の範囲
    role: 'developer'           // 事前定義されたロールのみ
  },
  resource: {
    documentId: 'doc-123',
    department: 'engineering',
    classificationLevel: 3,
    owner: 'bob',
    createdAt: new Date('2024-01-01')
  },
  action: 'read',
  environment: {
    currentTime: new Date('2024-01-15T10:00:00'),
    ipAddress: '192.168.1.100',
    deviceType: 'desktop',      // 型定義により選択肢が限定
    location: 'office'          // office/home/externalのみ
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