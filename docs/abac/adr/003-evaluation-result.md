# ADR-003: 評価結果の設計

## ステータス

- **日付**: 2025-08-13
- **状態**: 採用
- **決定者**: プロジェクトチーム

## コンテキスト

ABAC（Attribute-Based Access Control）システムにおける評価結果の設計は、デバッグ性、監査性、型安全性に大きく影響します。学習用実装として、評価結果をどのように表現するかが、ABACの動作理解と実装の品質を決定します。

### 評価結果における設計課題

1. **情報の詳細度**: シンプルなboolean vs 詳細な結果情報
2. **not-applicableの扱い**: ポリシーにマッチしない場合の表現方法
3. **デバッグ情報**: なぜその結果になったかの追跡可能性
4. **型安全性**: 無効な状態を表現できない設計

### 業界標準との整合性

主要なABACライブラリ（XACML、py-abac等）では、permit/deny/not-applicableの3値を明示的に返し、評価の詳細情報を含めることが一般的です。

## 検討したオプション

### オプション1: シンプルなboolean

```typescript
evaluate(context: EvaluationContext): boolean
```

**利点:**
- 実装が単純
- 呼び出し側の処理が簡潔
- 実行時オーバーヘッドが少ない

**欠点:**
- デバッグ情報がない
- なぜ許可/拒否されたかが不明
- not-applicableの区別ができない
- 監査ログに必要な情報が不足

### オプション2: 詳細な結果（Tagged Union）

```typescript
type PolicyDecision = 
  | { 
      type: 'permit'
      appliedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'deny'
      appliedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'not-applicable'
      reason: string
    }
```

**利点:**
- デバッグ情報が豊富
- なぜ許可/拒否されたかが明確
- 監査ログに必要な情報を含む
- 型安全な結果処理

**欠点:**
- 実装が複雑
- メモリ使用量が増加
- 呼び出し側の処理が複雑

## 決定

**詳細な結果（オプション2）を採用**

### Tagged Unionパターンの採用

```typescript
type PolicyDecision = 
  | { 
      type: 'permit'
      appliedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'deny'
      appliedRule: PolicyRule
      context: EvaluationContext
    }
  | { 
      type: 'not-applicable'
      reason: string
    }
```

### Tagged Unionパターンの設計利点

#### 1. 型安全性の確保

```typescript
// permit/denyの場合：適用されたルールとコンテキストが必ず存在
if (decision.type === 'permit') {
  // TypeScriptが自動的に型を絞り込み、appliedRuleが存在することを保証
  console.log(decision.appliedRule.id)  // エラーなし
  console.log(decision.context)         // エラーなし
}

// not-applicableの場合：適用されたルールは存在しない
if (decision.type === 'not-applicable') {
  console.log(decision.reason)          // エラーなし
  // console.log(decision.appliedRule)  // コンパイルエラー（存在しない）
}
```

#### 2. 意味的な正確性

- **permit/deny**: ポリシーがマッチして判定が下された → `appliedRule`と`context`が必要
- **not-applicable**: どのポリシーもマッチしなかった → `appliedRule`は存在せず、代わりに`reason`で理由を説明

#### 3. 無効な状態を表現できない設計

Tagged Unionを使わない場合の問題点：

```typescript
// もし同じ属性を持たせた場合（悪い例）
type PolicyDecision = {
  type: 'permit' | 'deny' | 'not-applicable'
  appliedRule?: PolicyRule      // オプショナルになってしまう
  context?: EvaluationContext   // オプショナルになってしまう
  reason?: string               // オプショナルになってしまう
}

// 無効な状態が表現可能になってしまう
const invalid: PolicyDecision = {
  type: 'permit',
  reason: 'なぜかreasonがある',  // permitなのにreasonは不要
  // appliedRuleがない！（実行時エラーの原因）
}
```

### not-applicableのreasonフィールドの重要性

#### not-applicableが発生する複数のケース

ABACシステムでは、`not-applicable`になる理由は「ポリシーにマッチするものがなかった」だけではありません：

**1. ポリシーが一つも登録されていない**
```typescript
// エンジンにポリシーが未登録
return { 
  type: 'not-applicable', 
  reason: 'No policies registered' 
}
```

**2. Permitポリシーを含む構成で、どの条件にもマッチしない**
```typescript
// PermitとDenyの両方（またはPermitのみ）が存在するが、すべての条件がfalse
return { 
  type: 'not-applicable', 
  reason: 'No applicable policies found' 
}
```

**3. Denyポリシーのみ存在し、条件にマッチしない**
```typescript
// Permitポリシーが全く存在せず、Denyポリシーの条件も満たさない
return { 
  type: 'not-applicable', 
  reason: 'Only deny policies exist, none matched' 
}
```

#### reasonフィールドの価値

**デバッグの観点:**
- **問題の特定が容易**: 「ポリシーがない」のか「条件が合わない」のかがすぐ分かる
- **設定ミスの発見**: Permitポリシーの設定忘れなどを検出可能

**監査の観点:**
```typescript
// 監査ログで詳細な記録が可能
logger.info({
  result: 'not-applicable',
  reason: decision.reason,  // 具体的な理由が記録される
  context: context
})
```

**運用の観点:**
```typescript
switch (decision.type) {
  case 'not-applicable':
    if (decision.reason === 'No policies registered') {
      // 初期設定エラーとして管理者に通知
      alertAdmin('ABAC engine not configured')
    } else if (decision.reason.includes('Only deny policies')) {
      // Permitポリシーの追加を促す
      logger.warn('Consider adding permit policies')
    }
    break
}
```

### not-applicableの解釈と実装責任

#### 重要な原則: 解釈は呼び出し側（PEP）の責任

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
```

この設計により：
- ABACエンジンは純粋な評価ロジックに集中
- アプリケーション側でセキュリティポリシーを柔軟に実装可能
- 監査ログで「明示的な拒否」と「ポリシー未適用」を区別可能

## 結果

### 利点

1. **デバッグ性の向上**
   - どのポリシーが適用されたかが明確
   - なぜnot-applicableになったかの詳細情報
   - ステップ実行による動的な理解

2. **監査・運用の支援**
   - 詳細な監査ログの記録が可能
   - 設定ミスの早期発見
   - 運用時の問題切り分けが容易

3. **型安全性の確保**
   - 無効な状態を表現できない設計
   - コンパイル時の型チェック
   - IDEサポートによる開発支援

### トレードオフ

1. **実装の複雑性**
   - 呼び出し側でのパターンマッチング処理
   - メモリ使用量の増加

2. **学習コストの増加**
   - Tagged Unionパターンの理解が必要
   - 複数の結果パターンの処理

### 今後の課題

1. **発展的な機能**
   - 複数のポリシーマッチ時の詳細情報
   - パフォーマンス情報の追加

2. **実システムとの関連**
   - 監査システムとの連携パターン
   - ログフォーマットの標準化

この決定により、学習者はABACの評価プロセスを詳細に理解し、実際のシステムで求められる監査性とデバッグ性を体験できます。特に、not-applicableの意味と扱い方を正しく理解することで、実用的なABACシステムの構築につながります。