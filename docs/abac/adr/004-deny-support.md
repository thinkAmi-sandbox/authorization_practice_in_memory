# ADR-004: Deny機能のサポート

## ステータス

- **日付**: 2025-08-13
- **状態**: 採用
- **決定者**: プロジェクトチーム

## コンテキスト

ABAC（Attribute-Based Access Control）システムにおいて、明示的なDeny（拒否）機能の実装は、セキュリティ要件とコンプライアンス要件を満たすために重要な設計決定です。学習用実装として、Deny機能をどの程度サポートするかが、ABACの本質理解と実用性のバランスを決定します。

### RBACとABACにおけるDenyの根本的な違い

#### RBAC（Role-Based Access Control）における権限管理
- **加算的モデル**: ロールがある = 権限あり、ない = 権限なし
- **組織構造との対応**: 職務に基づく静的な権限管理
- **シンプルな管理**: 「必要なロールがない」という単純な理由でアクセス拒否
- **Denyの必要性**: 通常は不要（純粋なRBACでは）

#### ABAC（Attribute-Based Access Control）における権限管理
- **動的評価モデル**: 属性の組み合わせによる複雑な条件を表現
- **文脈依存の制御**: 環境や状況に応じた柔軟な制御
- **複雑な要件対応**: セキュリティ、コンプライアンス、環境制御
- **Denyの必要性**: 必須機能

### Effect（効果）の用語選定

ABACのEffect（効果）を表す用語として、業界標準との整合性を考慮する必要があります。

## 検討したオプション

### オプション1: permit vs allow の選択

| 実装 | Effect用語 | 備考 |
|------|-----------|------|
| **XACML (OASIS標準)** | `Permit/Deny` | ABACの最も正式な標準仕様 |
| **Casbin** | `permit/deny` | 多言語対応の包括的ライブラリ |
| **OPA** | `allow/deny` | クラウドネイティブ向け |
| **node-abac** | `permit/deny` | JavaScript実装 |
| **py-abac** | `allow/deny` | Python実装 |

**permit/deny を採用する理由:**
1. **XACML標準準拠**: OASIS標準のXACMLが`Permit/Deny`を使用
2. **意味の明確性**: 
   - `permit` = ポリシー評価による明示的な許可の付与
   - `allow` = より曖昧な許容（単に認める）
3. **学習効果**: 標準仕様の用語を学ぶことで実際のABACシステムの理解が深まる

### オプション2: Deny機能の実装範囲

#### 選択肢A: Denyなし（RBACライク）
```typescript
type PolicyEffect = 'permit'  // permitのみ
```

**利点:**
- 実装が単純
- RBACからの移行が容易
- 競合解決が不要

**欠点:**
- ABACの本質的な機能が不足
- セキュリティ要件を満たせない
- 学習効果が限定的

#### 選択肢B: 限定的なDenyサポート
```typescript
type PolicyEffect = 'permit' | 'deny'
// 但し、基本的にpermitのみを使用し、Denyは例外的な場合のみ
```

#### 選択肢C: 完全なDenyサポート（採用）
```typescript
type PolicyEffect = 'permit' | 'deny'
// permitとdenyを対等に扱い、競合解決戦略を実装
```

## 決定

**完全なDenyサポート（選択肢C）と permit/deny 用語を採用**

### 採用した設計

```typescript
type PolicyRule = {
  id: string
  description?: string
  effect: 'permit' | 'deny'  // 明示的なpermit/deny
  condition: (context: EvaluationContext) => boolean
}
```

### ABACでDenyが必要な理由

#### 1. セキュリティ違反の防止

```typescript
// 例：機密文書への不正アクセス防止
const securityDenyPolicy: PolicyRule = {
  id: 'deny-insufficient-clearance',
  effect: 'deny',
  condition: (ctx) => {
    // クリアランスレベル不足は明示的に拒否
    return ctx.subject.clearanceLevel < ctx.resource.classificationLevel
  }
}
```

#### 2. コンプライアンス要件の実装

```typescript
// 例：機密ドキュメントへの外部アクセス制御
const confidentialAccessPolicy: PolicyRule = {
  id: 'confidential-access-restriction',
  effect: 'deny',
  condition: (ctx) => {
    const isExternal = ctx.environment.location === 'external'
    const isHighClassification = ctx.resource.classificationLevel >= 4
    const isNotHighClearance = ctx.subject.clearanceLevel < 4
    return isExternal && isHighClassification && isNotHighClearance
  }
}
```

#### 3. 環境ベースの制限

```typescript
// 例：外部からの機密アクセス制限
const externalRestrictionPolicy: PolicyRule = {
  id: 'deny-external-confidential',
  effect: 'deny',
  condition: (ctx) => {
    const isExternal = ctx.environment.location === 'external'
    const isConfidential = ctx.resource.classificationLevel >= 4
    return isExternal && isConfidential
  }
}
```

### RBACとABACの比較

| 観点 | RBAC | ABAC（本実装） |
|------|------|--------------|
| **Denyの有無** | なし（純粋なRBAC） | **あり（必須）** |
| **理由** | ロールの加算的モデル | 属性の動的評価 |
| **実装の複雑性** | シンプル | 競合解決戦略が必要 |
| **使用例** | 組織の役割 | セキュリティ、コンプライアンス、環境制御 |

### Denyポリシーのみの場合の挙動

#### 設計決定: 標準的なABACの動作を採用

```typescript
// Denyポリシーのみが登録されている場合の評価フロー
if (denyPolicies.length > 0 && permitPolicies.length === 0) {
  // すべてのDenyポリシーを評価
  for (const policy of denyPolicies) {
    if (policy.condition(context)) {
      return { type: 'deny', appliedRule: policy, context }
    }
  }
  // どのDenyポリシーにもマッチしない
  return { type: 'not-applicable', reason: 'Only deny policies exist, none matched' }
}
```

#### この設計の理由

1. **XACML標準準拠**: OASIS標準では、ポリシーがマッチしない場合は明確にNotApplicableを返す

2. **明示的な意図の表現**: 
   - Denyポリシーは「特定の条件下での明示的な拒否」を意味する
   - 条件にマッチしない = そのポリシーは適用されない
   - Permitポリシーが存在しない = 許可する根拠がない

3. **セキュリティの観点**: 
   - not-applicableの解釈はPEP（呼び出し側）の責任
   - 多くの実装では「Default Deny」パターンでnot-applicableも拒否として扱う

#### 具体例

```typescript
// 外部からの機密文書アクセスを拒否するポリシーのみが存在
const externalDenyPolicy: PolicyRule = {
  id: 'deny-external-confidential',
  effect: 'deny',
  condition: (ctx) => {
    return ctx.environment.location === 'external' && 
           ctx.resource.classificationLevel >= 4
  }
}

// オフィスからの機密文書アクセス要求
const context = {
  environment: { location: 'office' },
  resource: { classificationLevel: 5 }
}

// 結果: not-applicable（Denyの条件にマッチしないため）
// 最終的なアクセス可否は呼び出し側が決定（通常はDefault Denyで拒否）
```

## 結果

### 利点

1. **ABACの本質的な機能を提供**
   - セキュリティ要件の実装が可能
   - コンプライアンス要件への対応
   - 環境制御による動的な制限

2. **学習効果の最大化**
   - RBACとの違いを明確に理解
   - 実際のABACシステムとの整合性
   - 業界標準の用語・概念の習得

3. **実用性の確保**
   - 複雑なセキュリティ要件への対応
   - 段階的な権限制御の実装
   - 監査・コンプライアンス要件の満足

### トレードオフ

1. **実装の複雑性**
   - 競合解決戦略の実装が必要
   - テストケースの複雑化
   - デバッグの困難さ

2. **学習コストの増加**
   - permit/denyの使い分けの理解
   - 競合解決の仕組みの理解
   - ポリシー設計の複雑さ

### 今後の課題

1. **発展的な機能**
   - より高度な競合解決戦略
   - 条件付きDeny（conditional deny）
   - ポリシー間の依存関係

2. **実システムとの関連**
   - 実際のセキュリティ要件の実装例
   - コンプライアンス要件のモデリング
   - 監査システムとの連携

この決定により、学習者はABACの重要な特徴である「明示的なDeny」を理解し、セキュリティとコンプライアンスの観点から権限管理システムを設計する能力を身につけることができます。特に、RBACでは表現困難な複雑な制御要件をABACで解決する方法を実践的に学習できます。