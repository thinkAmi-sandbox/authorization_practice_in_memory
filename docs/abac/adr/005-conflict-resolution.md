# ADR-005: 競合解決戦略

## ステータス

- **日付**: 2025-08-13
- **状態**: 採用
- **決定者**: プロジェクトチーム

## コンテキスト

ABAC（Attribute-Based Access Control）システムにおいて、複数のポリシーが同時に適用される場合の競合解決戦略は、セキュリティとシステムの一貫性を保つために重要な設計決定です。明示的なDeny機能を実装することで、PermitとDenyのルールが競合する可能性があるため、その解決方法を定める必要があります。

### 競合解決戦略の重要性

1. **セキュリティの一貫性**: 異なるポリシーが矛盾する判定を返す場合の統一的な処理
2. **予測可能性**: システムの動作が予測可能で理解しやすい
3. **業界標準との整合性**: 主要なABACライブラリとの互換性
4. **学習効果**: 実際のABACシステムで使用される戦略の理解

### 複数ポリシーの組み合わせ設計

ABACでは、複数のポリシーを組み合わせることが一般的です：

1. **関心の分離**: 各ポリシーが特定の観点を担当
   - 営業時間チェックポリシー
   - 部門アクセス制御ポリシー
   - 機密レベルチェックポリシー

2. **柔軟な組み合わせ**: 状況に応じてポリシーを追加・削除可能

3. **実世界の要件への対応**: 複数の制約条件が同時に存在

## 検討したオプション

### オプション1: First-Match（最初にマッチしたルール）

```typescript
// 最初にマッチしたポリシーの結果を採用
for (const policy of policies) {
  if (policy.condition(context)) {
    return policy.effect  // 最初にマッチした結果で終了
  }
}
```

**利点:**
- 実装が単純で高速
- 理解しやすい
- CASLなど一部のライブラリで採用

**欠点:**
- ルールの順序が重要になる
- セキュリティリスクが高い（Denyが後ろにあると無視される可能性）
- 予測しにくい動作

### オプション2: Permit-Override（Permit優先）

```typescript
// 一つでもPermitがあれば許可
const hasPermit = policies.some(policy => 
  policy.condition(context) && policy.effect === 'permit'
)
if (hasPermit) return 'permit'

// Denyがあれば拒否
const hasDeny = policies.some(policy => 
  policy.condition(context) && policy.effect === 'deny'
)
if (hasDeny) return 'deny'
```

**利点:**
- 利便性重視
- ユーザビリティが高い

**欠点:**
- セキュリティリスクが高い
- 「Fail Open」の原則でセキュリティ上危険

### オプション3: Deny-Override（Deny優先）（採用）

```typescript
// 一つでもDenyがあれば即座に拒否
for (const policy of policies) {
  if (policy.condition(context) && policy.effect === 'deny') {
    return 'deny'  // 即座にDenyを返す
  }
}

// Denyがなく、Permitがあれば許可
const hasPermit = policies.some(policy => 
  policy.condition(context) && policy.effect === 'permit'
)
if (hasPermit) return 'permit'

return 'not-applicable'
```

**利点:**
- **業界標準**: XACML、Casbin、OPA、py-abacなど主要実装で採用
- **セキュリティファースト**: "Fail Secure"の原則に合致
- **明示的な拒否を優先**: セキュリティポリシーの厳格な実装

**欠点:**
- 実装がやや複雑
- 利便性よりセキュリティを優先

### オプション4: Priority-Based（優先度ベース）

```typescript
// ポリシーに優先度を付けて解決
type PolicyRule = {
  priority: number  // 追加の属性
  // ...
}
```

**利点:**
- 柔軟な制御が可能
- 細かい調整ができる

**欠点:**
- 実装が非常に複雑
- 学習用には過度に高度
- 設定ミスのリスクが高い

## 決定

**Deny-Override戦略（オプション3）を採用**

### 採用した競合解決戦略

#### 標準的なDeny-Override戦略の評価ルール

OASIS XACML 3.0標準およびCasbin、OPA等の主要ABACライブラリで採用されている標準的なDeny-Override戦略：

**基本的な優先順位:**
```
Deny > Permit > Not-Applicable
```

**評価アルゴリズム:**
1. **最優先**: 一つでもDenyがあれば最終結果は**Deny**
2. **次優先**: Denyがなく、Permitがあれば最終結果は**Permit**
3. **最後**: すべてがNot-Applicableの場合のみ最終結果は**Not-Applicable**

#### 具体的な競合パターンと評価結果

| 競合パターン | 最終決定 | 理由 |
|-------------|----------|------|
| **Deny + Permit** | **Deny** | セキュリティファースト（Fail Secure） |
| **Deny + Not-Applicable** | **Deny** | 明示的な拒否が優先 |
| **Permit + Not-Applicable** | **Permit** | 許可の根拠があり、拒否がない |
| **Deny + Permit + Not-Applicable** | **Deny** | Denyが一つでもあれば拒否 |

#### 実装における評価フロー

```typescript
class PolicyEvaluationEngine {
  evaluate(context: EvaluationContext): PolicyDecision {
    let hasPermit = false
    let permitRule: PolicyRule | null = null
    
    // Step 1: Denyを最優先で探す
    for (const policy of this.policies) {
      if (policy.condition(context)) {
        if (policy.effect === 'deny') {
          // 即座にDenyを返す（他は評価不要）
          return {
            type: 'deny',
            appliedRule: policy,
            context
          }
        }
        if (policy.effect === 'permit') {
          hasPermit = true
          permitRule = policy
        }
      }
    }
    
    // Step 2: Denyがない場合、Permitがあるか確認
    if (hasPermit && permitRule) {
      return {
        type: 'permit',
        appliedRule: permitRule,
        context
      }
    }
    
    // Step 3: すべてがNot-Applicable
    return {
      type: 'not-applicable',
      reason: 'No applicable policies found'
    }
  }
}
```

### 重要な評価ケース

#### ケース1: Not-ApplicableとDenyの競合

```typescript
// ポリシー1: Not-Applicable（条件にマッチしない）
// ポリシー2: Deny（条件にマッチし、拒否）
// → 結果: Deny
```

理由: Denyが一つでも存在すれば、他のNot-Applicableは無視される

#### ケース2: PermitとNot-Applicableの競合

```typescript
// ポリシー1: Permit（条件にマッチし、許可）
// ポリシー2: Not-Applicable（条件にマッチしない）
// → 結果: Permit
```

理由: Denyが存在しないため、Permitが優先される

#### ケース3: 複雑な競合

```typescript
// 部門アクセスポリシー: Permit（同一部門のためマッチ）
// 機密レベルポリシー: Not-Applicable（条件を満たすためマッチしない）
// 外部アクセス制限ポリシー: Deny（外部からのアクセスのためマッチ）
// → 結果: Deny（一つでもDenyがあれば拒否）
```

### XACML標準での正式定義

OASIS XACML 3.0標準では、Deny-Overrideアルゴリズムを以下のように定義：

```
1. いずれかのポリシーがDenyを返す → 最終決定: Deny
2. すべてのポリシーがPermitまたはNot-Applicable、
   かつ少なくとも1つがPermit → 最終決定: Permit
3. すべてのポリシーがNot-Applicable → 最終決定: Not-Applicable
```

### 複数ポリシーマッチ時のルール選択

#### appliedRuleの決定方針

Deny-Override戦略では複数のポリシーがマッチする可能性がありますが、最終的な決定は1つのポリシーによって下されます：

```typescript
// Denyの場合：最初にマッチしたDenyポリシー
if (policy.effect === 'deny') {
  return {
    type: 'deny',
    appliedRule: policy,  // 最初にマッチしたDenyポリシー
    context
  }
}

// Permitの場合：最後にマッチしたPermitポリシー（または任意の1つ）
if (hasPermit && permitRule) {
  return {
    type: 'permit',
    appliedRule: permitRule,  // 代表的なPermitポリシー
    context
  }
}
```

## 結果

### 利点

1. **セキュリティファーストの設計**
   - "Fail Secure"原則の実装
   - 明示的な拒否を最優先
   - セキュリティポリシーの厳格な実行

2. **業界標準との整合性**
   - XACML標準準拠
   - 主要ABACライブラリとの互換性
   - 実際のシステムへの移行が容易

3. **予測可能性と一貫性**
   - 明確な評価順序
   - 一貫した動作
   - デバッグが容易

4. **学習効果の最大化**
   - 実際のABACシステムの理解
   - セキュリティ設計の原則の習得
   - 競合解決の重要性の理解

### トレードオフ

1. **実装の複雑性**
   - 単純なbooleanより複雑
   - 評価ロジックの理解が必要
   - テストケースの増加

2. **利便性の制約**
   - セキュリティ優先のため柔軟性が制限
   - Permitの設定忘れでアクセス不可

### 今後の課題

1. **発展的な機能**
   - 他の競合解決戦略の学習
   - 条件付き戦略の実装
   - カスタム戦略の設計

2. **実システムとの関連**
   - 実際のセキュリティ要件での検証
   - パフォーマンス最適化
   - 監査ログとの連携

この決定により、学習者はABACの重要な概念である「競合解決」を業界標準に準拠した形で理解し、セキュリティを重視したシステム設計の原則を身につけることができます。特に、"Fail Secure"の原則がいかに重要かを実践的に学習できます。