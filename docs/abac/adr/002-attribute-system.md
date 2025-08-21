# ADR-002: 属性システムの設計

## ステータス

- **日付**: 2025-08-13
- **状態**: 採用
- **決定者**: プロジェクトチーム

## コンテキスト

ABAC（Attribute-Based Access Control）システムの核心は、主体（Subject）、客体（Resource）、環境（Environment）の属性を評価することです。学習用実装において、属性システムをどのように設計するかは、ABACの概念理解と実装の複雑さを大きく左右します。

### 属性システムにおける設計課題

1. **型安全性 vs 柔軟性**: 厳密な型定義と動的な拡張性のバランス
2. **カテゴリー構造**: 属性をどのように分類・整理するか
3. **属性の重複**: 同じ概念を異なる文脈で扱う場合の設計
4. **学習の最適化**: 認知負荷を軽減しつつ概念理解を深める

### 業界標準との整合性

主要なABACライブラリ（XACML、OPA等）では、属性をカテゴリー別に整理し、文脈を明確化する構造を採用しています。

## 検討したオプション

### オプション1: 柔軟な型定義

```typescript
type AttributeValue = string | number | boolean | Date
type Attributes = Record<string, AttributeValue>

interface EvaluationContext {
  subject: Attributes
  resource: Attributes
  environment: Attributes
  action: string
}
```

**利点:**
- 拡張性が高い
- 実システムに近い柔軟性
- 動的な属性追加が可能

**欠点:**
- 実行時の型チェックが必要
- 学習時に何の属性を使うべきか不明確
- タイポによるバグが発生しやすい
- IDEサポートが限定的

### オプション2: 厳密な型定義（学習用最適化）

```typescript
interface SubjectAttributes {
  userName: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  clearanceLevel: 1 | 2 | 3 | 4 | 5
}

interface ResourceAttributes {
  documentName: string
  department: 'engineering' | 'finance' | 'hr' | 'sales'
  classificationLevel: 1 | 2 | 3 | 4 | 5
}

interface EnvironmentAttributes {
  currentTime: Date
  location: 'office' | 'home' | 'external'
}

type EvaluationContext = {
  subject: SubjectAttributes
  resource: ResourceAttributes
  action: 'read' | 'write'
  environment: EnvironmentAttributes
}
```

**利点:**
- 型安全性の確保
- IDEの補完が効く
- 学習時に概念を明確に理解できる
- コンパイル時エラー検出

**欠点:**
- 拡張性が低い（学習用では問題なし）
- 実システムには適用しにくい

## 決定

**厳密な型定義（オプション2）を採用**

### 採用した属性構造

#### カテゴリー別属性の整理

```typescript
// Subject（主体）: アクセスを要求するユーザー
interface SubjectAttributes {
  userName: string                                    // 学習用：実システムではuserIdを使用
  department: 'engineering' | 'finance' | 'hr' | 'sales'  // ユーザーが所属する部門
  clearanceLevel: 1 | 2 | 3 | 4 | 5                  // ユーザーのセキュリティクリアランスレベル
}

// Resource（客体）: アクセス対象のリソース
interface ResourceAttributes {
  documentName: string                                // 学習用：実システムではdocumentIdを使用
  department: 'engineering' | 'finance' | 'hr' | 'sales'  // ドキュメントを管理する部門
  classificationLevel: 1 | 2 | 3 | 4 | 5            // ドキュメントの機密度分類レベル
}

// Environment（環境）: アクセス時の文脈情報
interface EnvironmentAttributes {
  currentTime: Date                                   // アクセス要求時刻
  location: 'office' | 'home' | 'external'          // アクセス元の場所
}
```

### 属性の意図的な重複設計

#### 同一概念の文脈別表現

本実装では、`department`属性をSubjectとResourceの両方に定義し、また`clearanceLevel`（Subject）と`classificationLevel`（Resource）という類似概念を別名で定義しています。これは重複ではなく、ABACの本質を理解するための意図的な設計です。

**重複を許容する理由:**

1. **異なる文脈の明確な表現**
   ```typescript
   // 同じ「部門」でも文脈が全く異なる
   const sameDepartment = ctx.subject.department === ctx.resource.department
   // ↑ユーザーの所属部門とドキュメント管理部門の比較
   ```

2. **ABACの本質：属性間の関係性評価**
   ```typescript
   condition: (ctx) => {
     const sameDepartment = ctx.subject.department === ctx.resource.department
     const sufficientClearance = ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
     return sameDepartment && sufficientClearance
   }
   ```

3. **実世界のモデリングの正確な表現**
   - **人事ファイル**: HR部門が管理（resource.department = 'hr'）
   - **アクセス者**: エンジニア部門の社員（subject.department = 'engineering'）
   - → 部門が異なるためアクセス拒否

4. **名前の使い分けによる意図の明確化**
   - `clearanceLevel`: ユーザーのセキュリティクリアランスレベル（アクセス権限レベル）
   - `classificationLevel`: ドキュメントの機密度分類レベル（保護レベル）

#### カテゴリー構造による文脈の明確化

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
    department: 'engineering',    // ユーザーが所属している部門
    clearanceLevel: 3
  },
  resource: {
    department: 'finance',        // ドキュメントを管理している部門
    classificationLevel: 5
  }
}
```

### 属性の最小化（学習用途最適化）

ABACの概念理解を最優先とし、学習者の認知負荷を軽減するため、最小限の属性セットに絞り込みました。

**最小化の方針:**

1. **3つの基本的な評価パターンをカバー**
   - 文字列の等価比較: `department === department`
   - 数値の大小比較: `clearanceLevel >= classificationLevel`
   - 時間/場所による動的制御: `currentTime`, `location`

2. **ABACの核心概念を維持**
   - Subject-Resource間の属性比較
   - 環境による文脈依存の制御
   - 複数属性の組み合わせ評価

3. **認知負荷の軽減**
   - 各カテゴリー2-3属性で管理可能
   - テストケースも簡潔に
   - 実装時の混乱を防止

## 結果

### 利点

1. **学習効果の最大化**
   - 各属性の役割と型が明確
   - IDEの完全な型補完とエラー検出
   - ABACの核心概念（属性間の関係性評価）の理解促進

2. **実装品質の向上**
   - コンパイル時の型チェック
   - タイポの即座な検出
   - デバッグの容易さ

3. **概念理解の深化**
   - 同じ概念でも文脈による違いの理解
   - カテゴリー別属性整理の意義の理解
   - 実世界のモデリングパターンの学習

### トレードオフ

1. **拡張性の制限**
   - 新しい属性の追加には型定義の変更が必要
   - 実システムには直接適用困難

2. **柔軟性の制約**
   - 動的な属性追加が困難
   - ポリシーの外部化に制限

### 今後の課題

1. **発展的学習への対応**
   - より複雑な属性構造の理解
   - 動的属性システムへの移行学習

2. **実システムとの関連付け**
   - 柔軟な属性システムとの比較学習
   - 実際のABACライブラリとの対応関係の理解

この決定により、学習者はABACの属性システムの本質を、型安全な環境で確実に理解できます。特に、属性間の関係性評価がABACの核心概念であることを、具体的なコードを通じて体験できます。