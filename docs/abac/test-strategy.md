# ABAC テスト戦略

ABAC（Attribute-Based Access Control）の特徴を理解するためのテスト戦略とテスト設計方針を説明します。

## 8. テスト戦略

### 8.1 テスト構造の設計方針

#### 8.1.1 ABACとRBACの概念的違いを反映したテスト設計

ABACのテスト構成は、RBACとは根本的に異なるアプローチが必要です：

| 観点 | RBAC | ABAC |
|------|------|------|
| **中心概念** | ロールの有無 | ポリシーと属性の動的評価 |
| **評価方法** | 静的（事前定義されたロール） | 動的（実行時の属性評価） |
| **テスト焦点** | ユーザー・リソース・ロールの組み合わせ | 属性カテゴリーと評価ルールの組み合わせ |
| **競合解決** | 通常は不要（加算的モデル） | Deny-Override等の戦略が必須 |

**RBACテストの特徴：**
- ロールの割り当て確認
- 権限の累積的な付与
- 比較的単純な組み合わせテスト

**ABACテストの特徴：**
- 属性の動的評価確認
- ポリシー競合の解決戦略
- 実行時コンテキストの複雑な組み合わせ

#### 8.1.2 学習効果を重視した段階的構成

ABACの理解を深めるため、以下の段階的な学習アプローチを採用：

1. **エンジンの基本動作** → PolicyEvaluationEngineの仕組み理解
2. **単純な条件評価** → permit/deny/not-applicableの基本ルール理解
3. **属性ベースの評価** → ABACの本質（属性による動的制御）理解
4. **複合条件の評価** → 実践的なABAC活用パターン理解
5. **競合解決とエッジケース** → 実システムで重要な例外処理理解

この構成により、学習者は段階を追ってABACの複雑さを理解できます。

### 8.2 推奨するテスト構成

#### 8.2.1 基本構造

```typescript
describe('ABAC (Attribute-Based Access Control)', () => {
  describe('PolicyEvaluationEngine', () => {
    // 5つの主要カテゴリーによる段階的学習
    describe('1. エンジンの初期化とポリシー管理', () => { /* ... */ })
    describe('2. 単純な条件評価', () => { /* ... */ })
    describe('3. 属性を使った実践的な評価', () => { /* ... */ })
    describe('4. 競合解決戦略（Deny-Override）', () => { /* ... */ })
    describe('5. エッジケースとnot-applicableの扱い', () => { /* ... */ })
  })
})
```

#### 8.2.2 5つの主要テストカテゴリー

**1. エンジンの初期化とポリシー管理**

```typescript
describe('1. エンジンの初期化とポリシー管理', () => {
  it('PolicyEvaluationEngineが正常に初期化される', () => {
    const engine = new PolicyEvaluationEngine()
    expect(engine).toBeDefined()
  })
  
  it('ポリシーを正常に追加・削除できる', () => {
    const engine = new PolicyEvaluationEngine()
    const policy = createSimplePolicy()
    
    engine.addPolicy(policy)
    // ポリシー登録後の動作確認
    
    engine.removePolicy(policy.id)
    // ポリシー削除後の動作確認
  })
  
  it('初期状態（ポリシーなし）でnot-applicableを返す', () => {
    const engine = new PolicyEvaluationEngine()
    const context = createTestContext()
    
    const decision = engine.evaluate(context)
    expect(decision.type).toBe('not-applicable')
  })
})
```

**学習ポイント：ABACエンジンの基本的な使い方とライフサイクル**

**2. 単純な条件評価**

```typescript
describe('2. 単純な条件評価', () => {
  it('常に真を返す条件でpermitを返す', () => {
    const engine = new PolicyEvaluationEngine()
    
    // 属性に依存しない固定条件
    const alwaysTruePolicy: PolicyRule = {
      id: 'always-true',
      description: '常に許可',
      effect: 'permit',
      condition: () => true  // 固定値による評価
    }
    
    engine.addPolicy(alwaysTruePolicy)
    const decision = engine.evaluate(createTestContext())
    
    expect(decision.type).toBe('permit')
  })
  
  it('常に偽を返す条件でnot-applicableを返す', () => {
    const engine = new PolicyEvaluationEngine()
    
    const alwaysFalsePolicy: PolicyRule = {
      id: 'always-false',
      description: '適用されない',
      effect: 'permit',
      condition: () => false  // 適用されない条件
    }
    
    engine.addPolicy(alwaysFalsePolicy)
    const decision = engine.evaluate(createTestContext())
    
    expect(decision.type).toBe('not-applicable')
  })
})
```

**学習ポイント：PolicyEvaluationEngineの動作原理と3値評価システム**

**3. 属性を使った実践的な評価**

**3a. 単一カテゴリーの属性評価**

```typescript
describe('3a. 単一カテゴリーの属性評価', () => {
  describe('Subject属性による制御', () => {
    it('特定部門のユーザーのみアクセス許可', () => {
      const departmentPolicy: PolicyRule = {
        id: 'engineering-only',
        description: 'エンジニアリング部門のみ',
        effect: 'permit',
        condition: (ctx) => ctx.subject.department === 'engineering'
      }
      
      const engine = new PolicyEvaluationEngine()
      engine.addPolicy(departmentPolicy)
      
      // エンジニアリング部門のユーザー
      const engineeringContext = createTestContext({
        subject: { department: 'engineering' }
      })
      
      const decision = engine.evaluate(engineeringContext)
      expect(decision.type).toBe('permit')
    })
    
    it('クリアランスレベルによるアクセス制御', () => {
      const clearancePolicy: PolicyRule = {
        id: 'high-clearance',
        description: 'クリアランスレベル3以上',
        effect: 'permit',
        condition: (ctx) => ctx.subject.clearanceLevel >= 3
      }
      
      // テスト実装...
    })
  })
  
  describe('Resource属性による制御', () => {
    it('公開文書のみアクセス許可', () => {
      const publicDocPolicy: PolicyRule = {
        id: 'public-only',
        description: '公開文書のみアクセス可能',
        effect: 'permit',
        condition: (ctx) => ctx.resource.classificationLevel === 1
      }
      
      // テスト実装...
    })
  })
  
  describe('Environment属性による制御', () => {
    it('営業時間内のみアクセス許可', () => {
      const businessHoursPolicy: PolicyRule = {
        id: 'business-hours',
        description: '営業時間内のみ',
        effect: 'permit',
        condition: (ctx) => {
          const hour = ctx.environment.currentTime.getHours()
          return hour >= 9 && hour < 18
        }
      }
      
      // テスト実装...
    })
  })
})
```

**学習ポイント：各属性カテゴリーの役割と個別の評価方法**

**3b. 複数カテゴリーの組み合わせ評価**

```typescript
describe('3b. 複数カテゴリーの組み合わせ評価', () => {
  it('部門一致 + クリアランスチェックの組み合わせ', () => {
    const combinedPolicy: PolicyRule = {
      id: 'dept-and-clearance',
      description: '同一部門かつ十分なクリアランス',
      effect: 'permit',
      condition: (ctx) => {
        const sameDepartment = ctx.subject.department === ctx.resource.department
        const sufficientClearance = ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
        return sameDepartment && sufficientClearance
      }
    }
    
    // 複数属性による動的評価のテスト...
  })
  
  it('OR条件を含む複雑な組み合わせ', () => {
    const complexPolicy: PolicyRule = {
      id: 'complex-conditions',
      description: '管理者または営業時間内の同一部門',
      effect: 'permit',
      condition: (ctx) => {
        const isAdmin = ctx.subject.clearanceLevel === 5
        const isBusinessHours = ctx.environment.currentTime.getHours() >= 9
        const sameDept = ctx.subject.department === ctx.resource.department
        
        return isAdmin || (isBusinessHours && sameDept)
      }
    }
    
    // OR条件による柔軟な制御のテスト...
  })
})
```

**学習ポイント：ABACの動的で文脈依存の評価能力**

**4. 競合解決戦略（ABACの重要な特徴）**

```typescript
describe('4. 競合解決戦略（Deny-Override）', () => {
  describe('2つの評価結果競合', () => {
    it('PermitとDenyの競合でDenyを優先', () => {
      const permitPolicy: PolicyRule = {
        id: 'permit-policy',
        effect: 'permit',
        condition: () => true
      }
      
      const denyPolicy: PolicyRule = {
        id: 'deny-policy',
        effect: 'deny',
        condition: () => true
      }
      
      const engine = new PolicyEvaluationEngine()
      engine.addPolicy(permitPolicy)
      engine.addPolicy(denyPolicy)
      
      const decision = engine.evaluate(createTestContext())
      expect(decision.type).toBe('deny')
      expect(decision.appliedRule.id).toBe('deny-policy')
    })
  })
  
  describe('3つの評価結果混在', () => {
    it('Permit、Deny、not-applicableの競合でDenyを優先', () => {
      const permitPolicy: PolicyRule = {
        id: 'permit-policy',
        effect: 'permit',
        condition: () => true
      }
      
      const denyPolicy: PolicyRule = {
        id: 'deny-policy',
        effect: 'deny',
        condition: () => true
      }
      
      const notApplicablePolicy: PolicyRule = {
        id: 'not-applicable-policy',
        effect: 'permit',
        condition: () => false  // 適用されない
      }
      
      // Deny > Permit > Not-Applicable の優先順位確認...
    })
  })
})
```

**学習ポイント：RBACにはない明示的Denyの処理方法とXACML標準準拠**

**5. エッジケースとnot-applicableの扱い**

```typescript
describe('5. エッジケースとnot-applicableの扱い', () => {
  it('どのポリシーにもマッチしない場合', () => {
    const engine = new PolicyEvaluationEngine()
    
    const nonMatchingPolicy: PolicyRule = {
      id: 'non-matching',
      effect: 'permit',
      condition: () => false
    }
    
    engine.addPolicy(nonMatchingPolicy)
    const decision = engine.evaluate(createTestContext())
    
    expect(decision.type).toBe('not-applicable')
    expect(decision.reason).toContain('適用可能なポリシーがありません')
  })
  
  it('ポリシーが登録されていない場合', () => {
    const engine = new PolicyEvaluationEngine()
    const decision = engine.evaluate(createTestContext())
    
    expect(decision.type).toBe('not-applicable')
    expect(decision.reason).toContain('ポリシーが登録されていません')
  })
})
```

**学習ポイント：実システムで考慮すべき例外的ケースとデフォルト動作**

### 8.3 各テストカテゴリーの学習効果

#### 8.3.1 段階的な理解の促進

**段階1：基本動作の理解**
- APIの使い方と基本的なフロー
- ポリシーの登録から評価までの一連の流れ
- PolicyEvaluationEngineのライフサイクル管理

**段階2：評価メカニズムの理解**
- permit/deny/not-applicableの3値評価システム
- 条件関数の動作原理
- ポリシーマッチングの基本ロジック

**段階3：属性ベース評価の理解**
- RBACの「ロールを持っているか」から、ABACの「属性条件を満たすか」への転換
- 各属性カテゴリー（Subject、Resource、Environment、Action）の文脈と役割
- 静的な権限から動的な評価への概念的変化

**段階4：動的評価の理解**
- 複数属性の組み合わせによる柔軟な制御
- 実行時の文脈依存の判定
- AND/OR条件による複雑なルール表現

**段階5：実システムへの応用**
- 競合解決の重要性（Deny-Override戦略）
- エラーハンドリングとnot-applicableの解釈
- XACMLやOPAなどの実際のシステムへの理解の橋渡し

#### 8.3.2 RBACとの対比による理解深化

各段階でRBACとの違いを明確にすることで、ABACの特徴を強調：

| テスト段階 | RBAC | ABAC |
|-----------|------|------|
| **基本動作** | `hasRole()` | `evaluate()` |
| **評価対象** | ロールの有無 | ポリシーと属性 |
| **動的制御** | 限定的（セッション属性程度） | 完全対応（あらゆる属性） |
| **競合解決** | 通常不要（権限の加算） | 必須（Deny-Override） |
| **複雑度** | 低（シンプルなマッピング） | 高（動的評価エンジン） |

### 8.4 実装上の考慮事項

#### 8.4.1 テストヘルパー関数

学習者の負担を軽減し、テストの可読性を向上させるため：

```typescript
// デフォルト値を持つテストコンテキスト生成
function createTestContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
  const defaults: EvaluationContext = {
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
  
  return { ...defaults, ...overrides }
}

// 各属性を個別に設定可能な柔軟な設計
function createSubject(overrides?: Partial<SubjectAttributes>): SubjectAttributes {
  return {
    userName: 'testUser',
    department: 'engineering',
    clearanceLevel: 2,
    ...overrides
  }
}

// ポリシー作成のヘルパー
function createSimplePolicy(effect: 'permit' | 'deny', condition?: (ctx: EvaluationContext) => boolean): PolicyRule {
  return {
    id: `test-policy-${Date.now()}`,
    description: `Test policy with ${effect} effect`,
    effect,
    condition: condition || (() => true)
  }
}
```

#### 8.4.2 テストケースの命名規則

ABACの概念を明確にする命名：

```typescript
// Good: ABACの概念が明確
describe('部門属性による制御', () => {
  it('同一部門のユーザーにアクセスを許可する', () => {})
  it('異なる部門のユーザーのアクセスを拒否する', () => {})
})

describe('Deny-Override戦略による競合解決', () => {
  it('PermitとDenyが競合した場合、Denyを優先する', () => {})
})

// Bad: 単なる機能テスト
describe('checkPermission', () => {
  it('should return true when user has permission', () => {})
})
```

### 8.5 統合テスト（従来通り）

単体テストで基本概念を理解した後、実践的なシナリオテストでABACの応用力を確認：

#### シナリオベースのテスト

**1. 営業時間シナリオ**
```typescript
describe('営業時間シナリオ', () => {
  it('営業時間内の通常ユーザーがアクセス可能', () => {
    // 9-18時の時間制御テスト
  })
  
  it('営業時間外は管理者のみアクセス可能', () => {
    // 時間 + クリアランスレベルの組み合わせ
  })
})
```

**2. 部門間アクセス**
```typescript
describe('部門間アクセス', () => {
  it('同一部門内での文書共有', () => {})
  it('他部門からの制限付きアクセス', () => {})
  it('全社共有リソースへのアクセス', () => {})
})
```

**3. 機密文書アクセス**
```typescript
describe('機密文書アクセス', () => {
  it('クリアランスレベルに応じた階層的アクセス', () => {})
  it('緊急時の一時的権限昇格', () => {})
})
```

**4. 複合シナリオ**
```typescript
describe('複合シナリオ', () => {
  it('外部からの高機密文書アクセス制限', () => {
    // Environment + Resource属性の組み合わせ
  })
  it('時間外の緊急アクセス（管理者権限）', () => {
    // Environment + Subject属性の組み合わせ
  })
})
```

## 10. テストレビューと対応方針

### 10.1 レビューの観点と指摘事項

#### 10.1.1 学習用途でのテスト範囲の明確化

**レビュー時に検討された追加テストケース：**

1. **例外処理・エラーハンドリング系**
   - PolicyEvaluationEngineの基本操作（addPolicy、removePolicy）のエラーケース
   - conditionメソッド内での例外発生時の挙動
   - EvaluationContextの属性欠落時の処理

2. **Action属性の活用拡張**
   - Action単体での評価パターン
   - Action + 他属性の詳細な組み合わせ

3. **実践的シナリオテスト**
   - セキュリティポリシーの統合テスト
   - 営業時間、部門間アクセス等の実用的なシナリオ

#### 10.1.2 学習用途での対応方針

**採用した方針：ABACの核心概念理解に集中**

本プロジェクトでは「ABACのポリシーと評価、その挙動について理解することがメイン」との方針に基づき、以下のように対応：

**対象外とした理由：**
- **例外処理・エラーハンドリング**: ユニットテストやプロダクションコードの関心事であり、ABACの概念学習には直接寄与しない
- **詳細なAction属性バリエーション**: 現在のテストで十分にAction属性の概念は理解可能
- **実践的シナリオテスト**: ユニットテストの範囲を超えるシナリオテストに該当

**採用した理由：**
- **Deny-Override戦略の完全理解**: ABACの重要な特徴であり、RBACとの差別化要因
- **3つの評価結果混在パターン**: XACML標準に基づく正確な動作理解
- **appliedRuleの正確性**: 複数ポリシー競合時の決定プロセス理解

### 10.2 追加されたテストケース

#### 10.2.1 Deny-Override戦略の完全理解のための追加

**追加したテストケース：**

```typescript
// 3つの評価結果が混在する場合
describe('評価がPermit、Deny、not-applicableで競合', () => {
  it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
    const permitPolicy = createPolicy('permit', () => true)
    const denyPolicy = createPolicy('deny', () => true)
    const notApplicablePolicy = createPolicy('permit', () => false)
    
    engine.addPolicy(permitPolicy)
    engine.addPolicy(denyPolicy)
    engine.addPolicy(notApplicablePolicy)
    
    const decision = engine.evaluate(createTestContext())
    
    // Deny > Permit > Not-Applicable の優先順位を確認
    expect(decision.type).toBe('deny')
    expect(decision.appliedRule.id).toBe(denyPolicy.id)
  })
})

// 複数同種結果での優先順位確認
describe('評価順がPermit、Deny、Permitで競合', () => {
  it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
    const permitPolicy1 = createPolicy('permit', () => true)
    const denyPolicy = createPolicy('deny', () => true)
    const permitPolicy2 = createPolicy('permit', () => true)
    
    // 順序に関係なくDenyが優先されることを確認
    expect(decision.type).toBe('deny')
    expect(decision.appliedRule.id).toBe(denyPolicy.id)
  })
})

describe('評価順がPermit、not-applicable、Permitで競合', () => {
  it('Permitと評価され、appliedRuleには最初のPermitポリシーが設定されること', () => {
    const permitPolicy1 = createPolicy('permit', () => true)
    const notApplicablePolicy = createPolicy('permit', () => false)
    const permitPolicy2 = createPolicy('permit', () => true)
    
    // Denyがない場合のPermit優先を確認
    expect(decision.type).toBe('permit')
    expect(decision.appliedRule.id).toBe(permitPolicy1.id)
  })
})
```

#### 10.2.2 レビュー過程で修正された誤り

**修正内容：**
- 「評価順がPermit、not-applicable、Permitで競合」のテストケースで、期待値が誤って「Denyと評価され」となっていた問題を「Permitと評価され」に修正
- appliedRuleの表現を「決定を下した最初のポリシー」から「Permitポリシー」「Denyポリシー」等、より具体的な表現に統一

### 10.3 最終的なテスト構成の評価

#### 10.3.1 ABACの核心概念カバレッジ

**完全にカバーされている領域：**

1. **ポリシー評価の基本動作**
   - permit/deny/not-applicableの3値評価
   - 単一ポリシーでの各種条件評価

2. **属性ベース評価**
   - 単一カテゴリー（Subject、Resource、Environment）での評価
   - 複数カテゴリー組み合わせでの動的評価
   - OR条件を含む複雑な評価パターン

3. **Deny-Override戦略**
   - 2つの評価結果競合（Permit/Deny、Permit/not-applicable、Deny/not-applicable）
   - 3つの評価結果混在（Permit/Deny/not-applicable）
   - 複数同種結果での適用ポリシー決定

4. **not-applicableの扱い**
   - ポリシー未登録時の動作
   - 各種条件でのreason設定

#### 10.3.2 学習効果の観点からの適切性

**段階的学習フローの実現：**

```
1. エンジンの基本動作理解
   ↓
2. 単純条件での評価理解  
   ↓
3. 属性ベース評価の理解
   ↓
4. 複合条件・競合解決の理解
```

この構成により、学習者は以下を段階的に理解できる：

- **RBACとの違い**: 静的なロールチェックから動的な属性評価への転換
- **ABACの強み**: 文脈依存の柔軟な制御
- **実装の複雑さ**: Deny-Override等の競合解決戦略の必要性

### 10.4 将来的なテスト拡張時の指針

#### 10.4.1 学習用途での境界線

**学習範囲内：**
- ABACの概念的特徴を理解するためのテスト
- 他の権限管理方式（RBAC、ACL等）との差別化要因を理解するためのテスト
- 実際のABACライブラリの動作を理解するためのテスト

**学習範囲外：**
- プロダクションコードの品質保証のためのテスト
- エラーハンドリングや例外処理のテスト
- パフォーマンスや運用面の考慮事項

#### 10.4.2 追加検討時の判断基準

テストケース追加を検討する際は、以下の質問で判断：

1. **ABACの概念理解に直接寄与するか？**
2. **RBACとの違いを明確にするか？**
3. **実際のABACライブラリの理解に役立つか？**
4. **学習者の認知負荷を適切な範囲に保てるか？**

すべて「Yes」の場合のみ追加を検討する。

この厳格な基準により、学習効果を最大化しながら、テスト複雑度を適切な範囲に保持できます。