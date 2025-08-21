# ABAC (Attribute-Based Access Control) Design Document

## 目次
1. [概要](#概要)
2. [ABACの位置づけ](#abacの位置づけ)
3. [RBACからの発展](#rbacからの発展)
4. [ABACの核心概念](#abacの核心概念)
5. [ポリシー評価エンジンのアーキテクチャ](#ポリシー評価エンジンのアーキテクチャ)
6. [実際のABACライブラリ調査結果](#実際のabacライブラリ調査結果)
7. [学習効果とトレードオフ](#学習効果とトレードオフ)
8. [ReBACへの発展の道筋](#rebacへの発展の道筋)
9. [参考情報](#参考情報)

## 概要

ABAC（Attribute-Based Access Control）は、属性ベースの動的な評価により、より柔軟で文脈依存のアクセス制御を実現する権限管理パターンです。このプロジェクトでは、ユーザーが権限管理システムを学習するための実装サンプルとして、ABACの核心的な概念と実装パターンを提供します。

### 学習の焦点

- システム全体の模倣ではなく、各権限管理パターンのロジックと特徴の理解に焦点を当てます
- ABACの核心的な仕組み（属性ベースの動的評価、ポリシーエンジン）を学ぶことが目的です
- 実装はシンプルに保ち、権限チェックのアルゴリズムや概念の理解を優先します

## ABACの位置づけ

### 権限管理モデルの進化

```
Unix → ACL → RBAC → ABAC → ReBAC
              ↑       ↑
           静的    動的・文脈依存
          (役割)   (属性評価)
```

ABACは権限管理の進化において、**静的な役割ベース**から**動的な属性評価ベース**への重要な転換点を表します。

### 想定する題材

学習効果を高めるため、社内ドキュメント管理システムを題材として選択：

- 実行権限は不要（ドキュメントは実行するものではない）
- read（閲覧）とwrite（作成・更新・削除）の2つの権限で十分
- 属性例：部門、職位、勤務時間、機密レベル、IPアドレス

## RBACからの発展

### 中心概念の違い

#### RBACの中心概念
```
ユーザー → 【ロール】 → 権限
```
- **ロール**が権限を抽象化する中心的な概念
- ユーザーはロールを通じて間接的に権限を取得
- 静的な権限割り当て

#### ABACの中心概念
```
【属性】 → 【ポリシー】 → 権限判定
```
- **属性**（Attributes）が基本要素
- **ポリシー**（Policy）は属性を評価するルール
- 動的な権限評価

### 概念の対応関係

| 要素 | RBAC | ABAC |
|------|------|------|
| **権限の源泉** | ロール（役割） | 属性（特性） |
| **評価方法** | ロールの有無をチェック | ポリシーで属性を評価 |
| **中心概念** | ロール | 属性＋ポリシー |
| **権限判定** | 静的（事前定義） | 動的（実行時評価） |

### 具体的な違いの例

#### RBAC：ロールが権限を決定
```typescript
// ロール自体が権限のコンテナ
if (user.hasRole('editor')) {
  // editorロール = 編集権限
  return 'granted'
}
```

#### ABAC：ポリシーが属性を評価して決定
```typescript
// ポリシーは属性を評価する関数
const policy: PolicyRule = {
  effect: 'permit',
  condition: (ctx) => {
    // 複数の属性を動的に評価
    return ctx.subject.department === ctx.resource.department && 
           ctx.subject.clearanceLevel >= 3 &&
           ctx.environment.currentTime.getHours() >= 9
  }
}
```

### ポリシーの役割

**重要な理解：ポリシーはロールの「代わり」ではなく「評価ルール」**

1. **RBAC**: ロール自体が権限のコンテナ
   - `role: 'editor' = { read: true, write: true }`
   - ロールと権限は1対1の静的な関係

2. **ABAC**: ポリシーは属性を評価する関数
   - `policy = (attributes) => boolean`
   - 属性の組み合わせを動的に評価

### RBACとABACの包含関係

興味深いことに、ABACはRBACを包含できます。ロールを属性の一つとして扱うことで、RBACの機能をABAC内で実現可能：

```typescript
// ABACでの時間・部門・クリアランス複合チェック（純粋なABACアプローチ）
const multiAttributePolicy: PolicyRule = {
  effect: 'permit',
  condition: (ctx) => {
    // 複数の属性を動的に評価
    const inBusinessHours = ctx.environment.currentTime.getHours() >= 9
    const sameDepartment = ctx.subject.department === ctx.resource.department
    const sufficientClearance = ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
    
    // 時間＋部門＋クリアランスの組み合わせ評価
    return inBusinessHours && sameDepartment && sufficientClearance
  }
}
```

これは「ロール → ポリシー」という単純な置き換えではなく、「静的なロール割り当て → 動的な属性評価」というパラダイムシフトを表しています。

### 移行パスの理解

- **RBAC → ABAC**：ロールを属性の一つとして扱う
- **段階的移行**：一部をABAC化し、徐々に拡張
- **ハイブリッド**：RBACとABACの併用

## ABACの核心概念

### 1. 属性（Attributes）

エンティティの特性を表現する基本要素。以下の4つのカテゴリーは学習用の典型例であり、業界標準として多くのライブラリで採用されています：

#### 属性カテゴリーの意義

**重要**: 以下の4つの属性カテゴリー（Subject、Resource、Environment、Action）は**学習用の典型例**であり、ABACで必須の属性カテゴリーではありません。ABACの本質は「属性ベース」であることで、どんな属性を使うかは実装や要件次第です。

**ただし、事実上の業界標準となっている分類：**
- **XACML（OASIS標準）**: この4カテゴリーを採用
- **OPA（Open Policy Agent）**: 同様の分類を採用
- **主要なABACライブラリ**: 多くがこの分類に従う

#### 各カテゴリーの詳細

- **Subject属性（例）**: ユーザーの部門、職位、クリアランスレベル、役割（ロール）
- **Resource属性（例）**: ドキュメントの機密度、所有部門、作成日時
- **Environment属性（例）**: アクセス時刻、IPアドレス、デバイス種別
- **Action属性（例）**: 操作の種類、緊急度

実際のABAC実装では、業務要件に応じて必要な属性を自由に定義できます。この柔軟性こそが、RBACの固定的なロールと対照的なABACの強みです。

### 2. ポリシー（Policy）

属性を評価するルール。以下の要素で構成されます：

- **条件（Condition）**: 属性間の関係を定義する評価関数
- **効果（Effect）**: permit（許可）またはdeny（拒否）
- **優先度（Priority）**: 競合解決のための重要度

### 3. 属性のカテゴリー構造と文脈の明確化

#### なぜ属性をカテゴリー別に整理するのか

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

#### 文脈の明確化によるメリット

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

## ポリシー評価エンジンのアーキテクチャ

### XACML標準の4つのコンポーネント

XACML標準で定義された4つのコンポーネントがABACアーキテクチャを構成します：

#### PEP（Policy Enforcement Point）
- アプリケーションとの統合点となる
- ユーザーのアクセス要求を受け取る
- PDPの決定に基づいてアクセスを許可/拒否
- 実際のリソースへのアクセスを制御

#### PDP（Policy Decision Point）
- ポリシーの評価ロジックを実行
- コンテキストに基づいて permit/deny/not-applicable を決定
- 競合解決戦略を実装
- ビジネスロジックから独立した評価エンジン

#### PIP（Policy Information Point）
- ユーザー、リソース、環境の属性を収集
- データソースから必要な属性を取得
- 属性の取得を一元化し、データソースを抽象化
- 学習用実装ではインメモリで属性を管理

#### PAP（Policy Administration Point）
- ポリシーのライフサイクル管理（追加、更新、削除）
- ポリシーの保存と取得
- ポリシーの一貫性を保証
- 学習用実装では簡単なMapで管理

### 4つのコンポーネントの連携フロー

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

### 学習用実装での簡略化

**インメモリCLI環境での学習用という条件に基づく簡略化：**

本学習用実装では、以下の前提条件により自然な簡略化を行います：

- **インメモリ環境**: データベースや外部システムとの連携が不要
- **CLI的な使用方法**: Webアプリケーションでの複数ユーザー同時アクセスを想定しない
- **学習効果重視**: 各コンポーネントの概念理解を優先し、実装の複雑さは最小限に

**具体的な簡略化内容：**

1. **PIPの簡略化**: 外部データソースからの属性取得の代わりに、インメモリでの属性管理
   - **実システム**: LDAP、DB、API呼び出しによる属性取得
   - **学習用**: プリミティブなオブジェクトでの属性管理

2. **PAPの簡略化**: ポリシーストレージとして単純なMapを使用
   - **実システム**: データベースやファイルシステムでのポリシー永続化
   - **学習用**: インメモリMap構造での一時的な管理

3. **PEPの統合**: RESTful APIとの統合の代わりに、直接メソッド呼び出し
   - **実システム**: HTTPリクエスト受付、レスポンス生成
   - **学習用**: 関数呼び出しによる直接的なアクセス制御

### 各コンポーネントの責務と学習ポイント

**学習者が実装すべき各コンポーネントの責務：**

| コンポーネント | 責務 | 学習ポイント |
|--------------|------|-------------|
| **PEP** | アクセス制御の実施 | アプリケーションとの統合方法 |
| **PDP** | ポリシー評価ロジック | 競合解決戦略の実装 |
| **PIP** | 属性の収集と提供 | データ抽象化の概念 |
| **PAP** | ポリシー管理 | ライフサイクル管理の基礎 |

この分離により、各コンポーネントを独立して学習・実装でき、ABACの本質的な構造を理解できます。

## 実際のABACライブラリ調査結果

主要なABACライブラリを調査した結果、以下のアプローチに分類されることが判明しました：

### ポリシー記述言語による分類

#### DSL（Domain Specific Language）型

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

#### JSON/YAML型

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

#### コード埋め込み型

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

#### 標準仕様型

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

### 評価エンジンの実装パターン

| パターン | 代表例 | 特徴 | 学習への影響 |
|---------|--------|------|------------|
| **インタープリタ型** | Casbin、OPA | ポリシーを実行時に解釈 | 柔軟だが性能面で劣る |
| **コンパイル型** | 一部のXACML実装 | ポリシーを事前にコンパイル | 高速だが動的変更が困難 |
| **ハイブリッド型** | CASL | 一部をコンパイル、一部を実行時評価 | バランスが良い |

### Effect（Permit/Deny）のサポート状況

**明示的なDenyをサポート** ✅
- Casbin、OPA、XACML、py-abac、Vakt
- 細かい例外制御が可能
- セキュリティポリシーの表現力が高い

**Permitのみ（暗黙的なDeny）** ❌
- 一部の簡易実装
- Default Denyパターン
- シンプルだが表現力に限界

## 学習効果とトレードオフ

### 学習効果の最大化

#### ABACの核心概念への集中

- 属性ベースの動的評価
- ポリシー言語の設計思想
- 文脈依存のアクセス制御
- 競合解決戦略

#### 段階的な理解

1. 単純な属性比較から開始
2. 複合条件の組み合わせ
3. 環境属性の活用
4. 優先度による制御

#### 実践的なパターンの学習

- 営業時間制限
- 部門ベースアクセス
- 機密レベル管理
- IPアドレス制限

### 他の実装との比較学習

#### ACL/RBAC/ABACの使い分け

| 観点 | ACL | RBAC | ABAC |
|------|-----|------|------|
| **権限の定義** | 個別設定 | ロール経由 | ポリシー＋属性 |
| **柔軟性** | 低 | 中 | 高 |
| **管理コスト** | 高 | 中 | 中～高 |
| **動的制御** | 不可 | 限定的 | 完全対応 |
| **適用場面** | 小規模 | 組織的 | 複雑な要件 |

### 設計のトレードオフ

#### 採用した設計の利点

- **関数ベース条件**：デバッグ容易、型安全
- **厳密な属性型**：学習効果の最大化、IDE支援の活用
- **Deny-Override**：業界標準に準拠した安全な戦略

#### 制限事項

- ポリシーの外部化が困難（学習用では問題なし）
- 実行時のポリシー変更に制限
- パフォーマンスは考慮外

### 結果と影響

#### 利点

**動的な権限制御の理解**
- 実行時の属性評価
- 文脈に応じた柔軟な制御
- 環境要因の考慮

**ポリシー設計スキル**
- 条件の適切な粒度
- 競合の予測と解決
- パフォーマンスへの配慮

**実践的な知識**
- 時間ベース制限の実装
- 組織階層の表現
- セキュリティレベル管理

#### 学習用の簡略化とトレードオフ

**学習用の簡略化**
- ポリシーの外部化は省略
- パフォーマンス最適化は考慮外
- エラーハンドリングは最小限

**実システムとの差異**
- PIP/PAP等の分離なし
- ポリシー言語は関数ベース
- 属性の動的取得は簡略化

## ReBACへの発展の道筋

### 将来の拡張性

#### ポリシー言語の拡張

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

#### 属性リゾルバーの追加

```typescript
interface AttributeResolver {
  resolve(entity: string, attribute: string): Promise<AttributeValue>
}
```

#### ReBACへの発展

- 関係性を属性として扱う
- グラフベースの評価への拡張

ABACでは、関係性も属性の一つとして扱うことが可能です。これがReBAC（Relationship-Based Access Control）への自然な発展路線となります：

```typescript
// ABACで関係性を属性として扱う例
const relationshipPolicy: PolicyRule = {
  effect: 'permit',
  condition: (ctx) => {
    // 関係性を属性として評価
    return ctx.subject.relationships.includes(ctx.resource.owner) ||
           ctx.subject.department === ctx.resource.ownerDepartment
  }
}
```

このアプローチから、グラフベースの関係性評価を主軸とするReBACへと自然に発展していきます。

## 参考情報

### ABAC関連の文献

- NIST SP 800-162: Guide to Attribute Based Access Control
- XACML 3.0 OASIS Standard
- "Attribute-Based Access Control" by Vincent C. Hu and Karen Scarfone

### 実装例

#### 汎用・多言語

- **Casbin** (Go/多言語): 最も包括的なアクセス制御ライブラリ
- **Open Policy Agent (OPA)**: クラウドネイティブ向けポリシーエンジン

#### JavaScript/TypeScript

- **CASL**: 条件ベースの権限管理
- **node-abac**: JSONベースのABAC実装

#### Python

- **py-abac**: JSONスキーマベースの実装
- **Vakt**: AWS IAM風のポリシー記述

#### Ruby

- **Pundit**: ポリシークラスベースの条件評価

#### Java

- **XACML実装各種**: 標準仕様準拠の実装

### 関連するADR

- [Unix権限実装のADR](../adr-unix-permission.md)
- [ACL実装のADR](../adr-acl-design.md)
- [RBAC実装のADR](../adr-rbac-design.md)
- [ABAC実装のADR](../adr-abac-design.md)
- [ReBAC実装のADR](../adr-rebac-design.md)

### 詳細なADR

ABACの設計に関する詳細な技術的判断については、以下のADRを参照してください：

- [001-policy-language.md](adr/001-policy-language.md) - ポリシー記述言語の選択
- [002-attribute-system.md](adr/002-attribute-system.md) - 属性システムの設計
- [003-evaluation-result.md](adr/003-evaluation-result.md) - 評価結果の型設計
- [004-deny-support.md](adr/004-deny-support.md) - Deny効果のサポート
- [005-conflict-resolution.md](adr/005-conflict-resolution.md) - 競合解決戦略
- [006-api-design.md](adr/006-api-design.md) - API設計の方針

---

*このドキュメントは学習用の実装プロジェクトの一部として作成されており、権限管理システムの理解を深めることを目的としています。*