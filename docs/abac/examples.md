# ABAC 実装例

ABAC（Attribute-Based Access Control）の実装例とサンプルコードを提供します。各例はコメント付きでABACの概念理解を促進します。

## 6.1 基本的なポリシー定義

### 営業時間制御ポリシー

```typescript
// 営業時間内のみアクセス許可
const businessHoursPolicy: PolicyRule = {
  id: 'business-hours',
  description: '営業時間（9-18時）のみアクセス可能',
  effect: 'permit',
  condition: (ctx) => {
    // Environment属性から現在時刻を取得
    const hour = (ctx.environment.currentTime as Date).getHours()
    // 9時から18時の範囲内かチェック
    return hour >= 9 && hour <= 18
  }
}
```

### 部門基準アクセス制御

```typescript
// 同一部門のドキュメントのみアクセス可能
const departmentPolicy: PolicyRule = {
  id: 'same-department',
  description: '同一部門のドキュメントのみアクセス可能',
  effect: 'permit',
  condition: (ctx) => 
    // Subject属性とResource属性の比較
    ctx.subject.department === ctx.resource.department
}
```

### クリアランスレベル制御（Deny型ポリシー）

```typescript
// 機密レベルチェック（Deny）
const clearancePolicy: PolicyRule = {
  id: 'clearance-check',
  description: 'クリアランスレベル不足の場合は拒否',
  effect: 'deny', // Denyポリシーの例
  condition: (ctx) => {
    // Subject属性からユーザーのクリアランスレベル取得
    const subjectLevel = ctx.subject.clearanceLevel as number
    // Resource属性から文書の機密レベル取得
    const resourceLevel = ctx.resource.classificationLevel as number
    // ユーザーレベルが文書レベルより低い場合にtrueを返す（拒否）
    return subjectLevel < resourceLevel
  }
}
```

## 6.2 評価エンジンの使用例

### エンジンの初期化とポリシー登録

```typescript
// Deny-Override戦略でエンジンを初期化
const engine = new PolicyEvaluationEngine()

// 各種ポリシーを順次登録
engine.addPolicy(businessHoursPolicy)
engine.addPolicy(departmentPolicy)
engine.addPolicy(clearancePolicy)
```

### 評価コンテキストの作成

```typescript
// 型安全な評価コンテキストの作成
const context: EvaluationContext = {
  // Subject属性：アクセスを試みるユーザーの情報
  subject: {
    userName: 'alice',
    department: 'engineering',  // 型定義により選択肢が限定
    clearanceLevel: 2           // 1-5の数値範囲
  },
  // Resource属性：アクセス対象リソースの情報
  resource: {
    documentName: 'financial-report.pdf',
    department: 'engineering',
    classificationLevel: 3      // このドキュメントの機密レベル
  },
  // Action属性：実行したいアクション
  action: 'read',
  // Environment属性：実行時の環境情報
  environment: {
    currentTime: new Date('2024-01-15T10:00:00'), // 営業時間内
    location: 'office'          // office/home/externalのみ
  }
}
```

### アクセス評価と結果処理

```typescript
// ABACエンジンによる動的評価実行
const decision = engine.evaluate(context)

// Tagged Unionパターンによる型安全な結果処理
switch (decision.type) {
  case 'permit':
    console.log(`アクセス許可: ${decision.appliedRule.description}`)
    // 実際のアクセス処理を実行
    break
  case 'deny':
    console.log(`アクセス拒否: ${decision.appliedRule.description}`)
    // アクセス拒否のログ記録
    break
  case 'not-applicable':
    console.log(`該当ポリシーなし: ${decision.reason}`)
    // デフォルトの処理（通常は拒否）
    break
}
```

## 6.3 複合条件の例

### 複数環境属性の組み合わせ

```typescript
// オフィス内でのアクセス（複数条件の組み合わせ）
const officeAccessPolicy: PolicyRule = {
  id: 'office-access',
  description: 'オフィス内での営業時間内アクセス',
  effect: 'permit',
  condition: (ctx) => {
    // 場所の条件チェック
    const isFromOffice = ctx.environment.location === 'office'
    // 時間の条件チェック
    const isBusinessHours = ctx.environment.currentTime.getHours() >= 9 &&
                           ctx.environment.currentTime.getHours() < 18
    
    // AND条件による複合評価
    return isFromOffice && isBusinessHours
  }
}
```

### 外部アクセス制限（セキュリティポリシー）

```typescript
// 外部からの機密文書アクセス制限（環境属性の活用）
const externalAccessRestriction: PolicyRule = {
  id: 'external-access-restriction',
  description: '外部からの機密文書アクセスを制限',
  effect: 'deny', // セキュリティポリシーはDenyで実装
  condition: (ctx) => {
    // Environment属性でアクセス元を判定
    const isExternal = ctx.environment.location === 'external'
    // Resource属性で機密度を判定
    const isHighClassification = ctx.resource.classificationLevel >= 4
    
    // 外部かつ高機密の場合に拒否
    return isExternal && isHighClassification
  }
}
```

## 6.4 テスト例

### 基本的なテストケース

```typescript
describe('PolicyEvaluationEngine', () => {
  let engine: PolicyEvaluationEngine
  
  beforeEach(() => {
    // 各テストで新しいエンジンインスタンスを作成
    engine = new PolicyEvaluationEngine()
  })
  
  it('営業時間内のアクセスを許可', () => {
    // テスト対象ポリシーを登録
    engine.addPolicy(businessHoursPolicy)
    
    // 営業時間内のコンテキストを作成
    const context = createContext({
      environment: { currentTime: new Date('2024-01-15T10:00:00') }
    })
    
    // 評価実行と結果確認
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('permit')
  })
  
  it('クリアランスレベル不足を拒否', () => {
    // Denyポリシーをテスト
    engine.addPolicy(clearancePolicy)
    
    // レベル不足のコンテキストを作成
    const context = createContext({
      subject: { clearanceLevel: 1 },     // ユーザーレベル：低
      resource: { classificationLevel: 3 } // 文書レベル：高
    })
    
    // Deny決定を確認
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('deny')
  })
  
  it('複数ポリシーの競合をDeny優先で解決', () => {
    // 競合するポリシーを両方登録
    engine.addPolicy(departmentPolicy)  // permit条件
    engine.addPolicy(clearancePolicy)   // deny条件
    
    // 両方の条件が適用される状況を作成
    const context = createContext({
      subject: { department: 'eng', clearanceLevel: 1 },
      resource: { department: 'eng', classificationLevel: 3 }
    })
    
    // Deny-Override戦略により拒否される
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('deny')  // Deny優先
  })
})
```

### ヘルパー関数の活用

```typescript
// テストコンテキスト作成のヘルパー関数
function createContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  // デフォルト値を持つベースコンテキスト
  const defaultContext: EvaluationContext = {
    subject: {
      userName: 'testUser',
      department: 'engineering',
      clearanceLevel: 2
    },
    resource: {
      documentName: 'test-doc.pdf',
      department: 'engineering',
      classificationLevel: 1
    },
    action: 'read',
    environment: {
      currentTime: new Date('2024-01-15T12:00:00'),
      location: 'office'
    }
  }
  
  // オーバーライドを適用してカスタマイズ
  return { ...defaultContext, ...overrides }
}
```

これらの実装例により、ABACの核心概念である属性ベースの動的評価、複合条件の処理、Deny-Override戦略による競合解決を実践的に学習できます。