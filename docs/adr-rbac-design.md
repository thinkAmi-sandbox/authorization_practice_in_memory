# ADR: RBAC (Role-Based Access Control) 学習用実装の設計

## 1. ステータス

- **日付**: 2025-08-12
- **状態**: 提案
- **決定者**: プロジェクトチーム

## 2. コンテキスト

### 2.1 プロジェクトの背景（権限管理システムの学習用実装）

このプロジェクトは、ユーザーが権限管理システムを学習するための実装サンプルを提供することを目的としています。RBAC（Role-Based Access Control）は、ロール（役割）という抽象層を導入することで、より管理しやすい権限制御を実現する重要な権限管理パターンです。

### 2.2 RBACの位置づけ（ACLからの発展）

- **ACL**: 個別のユーザー/グループに対する直接的な権限設定
  - 利点：細かい制御が可能
  - 欠点：ユーザー数が増えると管理が複雑化

- **RBAC**: ロールを介した間接的な権限管理
  - 利点：権限管理の簡素化、職務分離の実現
  - 欠点：例外的な権限設定が困難

### 2.3 想定する題材（社内ドキュメント管理システム）

学習効果を高めるため、ACLと同様に社内ドキュメント管理システムを題材として選択しました：
- 実行権限は不要（ドキュメントは実行するものではない）
- read（閲覧）とwrite（作成・更新・削除）の2つの権限で十分
- ロール例：viewer（閲覧者）、editor（編集者）、admin（管理者）

### 2.4 RBACの核心概念の学習

RBACの学習において重要な概念：

1. **ユーザー（User）**: システムのアクセス主体
2. **ロール（Role）**: 組織内の役割や職務
3. **パーミッション（Permission）**: リソースに対する操作権限
4. **割り当て（Assignment）**: 
   - ユーザー・ロール割り当て（User-Role Assignment）
   - ロール・パーミッション割り当て（Role-Permission Assignment）

## 3. 検討した設計オプション

### 3.1 データ構造の設計

#### 3.1.1 ロールの表現方法

**オプション1: 文字列ベース**
```typescript
type RoleName = string // "editor", "viewer"
```

**オプション2: Enum型**
```typescript
enum RoleName {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin'
}
```

**オプション3: Union型**
```typescript
type RoleName = 'viewer' | 'editor' | 'admin'
```

#### 3.1.2 権限の表現方法

**オプション1: ACLと同じPermissionBits**
```typescript
type PermissionBits = {
  read: boolean
  write: boolean
}
```

**オプション2: 権限の配列**
```typescript
type Permissions = Array<'read' | 'write'>
```

**オプション3: Set型**
```typescript
type Permissions = Set<'read' | 'write'>
```

#### 3.1.3 ロール階層の扱い

**オプション1: 階層なし（フラット）**
- 各ロールは独立
- シンプルで理解しやすい

**オプション2: 単純な継承**
- 上位ロールは下位ロールの権限を含む
- 実装が複雑化

**オプション3: 完全な階層構造**
- DAG（有向非循環グラフ）による表現
- 学習用には過度に複雑

### 3.2 ユーザー・ロール割り当ての管理

#### 3.2.1 単一ロール vs 複数ロール

**オプション1: ユーザーは1つのロールのみ**
```typescript
userRoles: Map<string, RoleName>
```

**オプション2: ユーザーは複数ロール可能**
```typescript
userRoles: Map<string, Set<RoleName>>
```

#### 3.2.2 リソース単位の管理

**オプション1: 1インスタンス1リソース**
- RBACインスタンスが1つのリソースを管理
- ロール定義もリソース単位

**オプション2: グローバルなロール管理**
- ロール定義は全リソース共通
- より実システムに近い

### 3.3 認可決定結果の型設計

#### 3.3.1 シンプルなboolean

```typescript
authorize(userId: string, action: PermissionAction): boolean
```

#### 3.3.2 詳細な結果オブジェクト

```typescript
type AuthzDecision = {
  granted: boolean
  matchedRoles?: string[]
  reason?: string
}
```

#### 3.3.3 Tagged Union（判別可能なUnion型）

```typescript
type AuthzDecision = 
  | { type: 'granted'; roles: Role[] }
  | { type: 'denied'; reason: 'no-role' | 'insufficient-permission' }
  | { type: 'error'; message: string }
```

### 3.4 Deny（拒否）機能の必要性

#### 3.4.1 ACLとの根本的な違い

**ACLにおけるDeny:**
- **リスト型管理**: 許可（Allow）と拒否（Deny）のエントリーをリストで管理
- **細かい例外制御**: 「全員に許可、ただし特定ユーザーは拒否」のような設定が可能
- **Deny優先の評価**: セキュリティ原則として明示的な拒否を優先

**RBACにおける権限モデル:**
- **ポジティブな権限モデル**: ロールを持つ = 権限がある、ロールを持たない = 権限がない
- **加算的モデル**: 複数ロールの権限は統合される（OR演算）
- **明示的な禁止の概念がない**: Denyという概念自体が存在しない

#### 3.4.2 RBACにDenyが不要な理由

**1. 組織構造との自然な対応**
```
現実世界：「経理部長」という役職 → 経理システムへのアクセス権
RBAC：「accounting-manager」ロール → 経理リソースへの権限
```
現実の組織では「経理部長だけど経理システムは使えない」という矛盾は起きません。ロールは職務に基づいており、その職務に必要な権限が付与されます。

**2. 管理の簡素化**
- Denyがあると「なぜアクセスできないか」の追跡が複雑になる
- RBACでは「必要なロールがない」という単純な理由でアクセスが拒否される
- 権限の有無が明確で、デバッグが容易

**3. 職務分離の原則（Separation of Duties）**
- RBACは職務に基づく権限管理を前提としている
- 相反する職務は異なるロールとして定義される
- 「同じロールで一部の権限だけ禁止」という状況は設計上発生しない

#### 3.4.3 例外処理が必要な場合の対処法

もし一時的にアクセスを制限したい場合の対処法：

**1. ロールの取り消し**
```typescript
rbac.revokeRole('alice', 'editor')  // 一時的に編集権限を削除
```

**2. 制限付きロールの作成**
```typescript
const RESTRICTED_EDITOR = {
  name: 'restricted-editor',
  permissions: { read: true, write: false },
  description: '一時的に書き込み権限を制限された編集者'
}
```

**3. 次世代モデル（ABAC）への移行**
- より複雑な条件が必要な場合はABACへ移行
- 時間帯、場所、部門などの属性に基づく動的な制御が可能

#### 3.4.4 権限管理モデルの進化における位置づけ

```
Unix → ACL → RBAC → ABAC → ReBAC
       ↑       ↑       ↑
     Deny有  Deny無  条件ベース
    (細かい) (役割)  (属性)
```

各モデルの特徴：
- **ACL**: 個別の細かい制御が可能（Denyあり）
- **RBAC**: 組織の役割に基づくシンプルな管理（Denyなし）
- **ABAC**: 属性と条件による柔軟な制御
- **ReBAC**: 関係性に基づく権限管理

RBACは「組織の役割に基づく権限管理」という明確な目的を持ち、その文脈ではDenyは不要です。この設計により、RBACは**シンプルで理解しやすく、組織構造と自然に対応する**権限管理を実現しています。

#### 3.4.5 実際のRBACライブラリにおけるDenyサポート状況

主要なRBACライブラリを調査した結果、**純粋なRBAC実装**と**ハイブリッド型実装**で異なるアプローチを採用していることが判明しました：

**1. Denyを明示的にサポートするライブラリ**

**Casbin (Go/多言語)** ✅
```conf
[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))
```
- `p.eft == deny`で明示的な拒否が可能
- Deny優先の評価（Deny-override）
- ACL、RBAC、ABAC全てのモデルをサポートする汎用ライブラリ

**CASL (JavaScript/TypeScript)** ✅
```javascript
ability.can(PERMISSIONS.MANAGE, MODEL_NAMES.POST)
ability.cannot(PERMISSIONS.DELETE, MODEL_NAMES.POST)
  .because('Only Admins can delete Posts')
```
- `cannot()`メソッドで明示的な拒否
- `ForbiddenError`で拒否理由も管理
- CanCanCanの概念をJavaScriptに移植

**CanCanCan (Ruby)** ✅
```ruby
can :read, Article
cannot :read, Article, published: false
```
- `cannot`メソッドで明示的な拒否
- Rails向けの標準的な認可ライブラリ

**accesscontrol (Node.js)** ✅
```javascript
ac.grant('user').readOwn('profile')
ac.deny('guest').deleteAny('profile')
```
- `grant`と`deny`の両方をサポート

**2. Denyを直接サポートしないライブラリ**

**Pundit (Ruby)** ❌
```ruby
def update?
  false  # デフォルトで全て拒否
end

def show?
  user.admin? || user == record.owner  # 明示的な許可のみ
end
```
- **「Default Deny」パターン**：デフォルトで全て拒否、明示的に許可
- 明示的なDenyルールは存在しない
- シンプルなboolean返却による権限チェック
- 純粋なRBAC哲学に従った実装

**3. なぜライブラリによって違うのか？**

**Denyをサポートする理由：**
- **柔軟性**: 複雑な例外ルールに対応（「管理者以外は削除不可」など）
- **既存システムとの互換性**: ACLやファイアウォールルールとの統合
- **汎用性**: RBAC以外のモデル（ACL、ABAC）も同時にサポート

**Denyをサポートしない理由：**
- **純粋なRBAC哲学**: ロールベースの加算的モデルを維持
- **シンプルさ**: 「なぜ拒否されたか」の追跡が単純
- **セキュリティ**: Default Denyパターンで十分な安全性

**4. 設計選択の指針**

- **純粋なRBAC実装**（Punditなど）: 組織の役割構造を忠実にモデル化
- **ハイブリッド型**（Casbin、CASLなど）: 複数の認可モデルを統合的にサポート

学習用実装としては、RBACの本質を理解するために**Denyなし**の設計が適切ですが、実用的なライブラリでは柔軟性のためにDenyをサポートすることが多いという結論に至りました。

### 3.5 APIの設計

#### 3.5.1 最小限のAPI（3-4メソッド）

```typescript
class RoleBasedAccessControl {
  authorize(request: AuthzRequest): AuthzDecision
  assignRole(userId: string, roleName: string): void
  revokeRole(userId: string, roleName: string): void
}
```

#### 3.5.2 中程度のAPI（5-7メソッド）

上記に加えて：
```typescript
  defineRole(role: Role): void
  getRoles(userId: string): string[]
  getPermissions(roleName: string): PermissionBits
```

#### 3.5.3 完全なAPI（8メソッド以上）

さらに追加：
```typescript
  hasRole(userId: string, roleName: string): boolean
  getAllUsers(): string[]
  getAllRoles(): Role[]
  clearAssignments(): void
```

## 4. 決定事項

### 4.1 採用した設計

#### 4.1.1 1インスタンス1リソース設計

学習目的では、1つのインスタンスが1つのリソースを管理する設計を採用：
- 責任範囲が明確
- ACL実装との一貫性
- ロールとリソースの関係が理解しやすい

#### 4.1.2 フラットなロール構造（階層なし）

ロール階層は実装しない：
- RBACの本質（ロールによる抽象化）に集中
- 複雑性を排除
- 将来の拡張として階層を学習可能

#### 4.1.3 複数ロール割り当て可能

ユーザーは複数のロールを持てる設計：
```typescript
type UserRoleAssignment = Map<string, Set<string>>
```

理由：
- 実際のシステムでは一般的
- 権限の統合ロジックを学習できる
- 柔軟な権限設定が可能

#### 4.1.4 ACLと同じPermissionBits型

```typescript
export type PermissionBits = {
  read: boolean
  write: boolean
}
```

理由：
- 他の実装との一貫性
- 権限の概念の共通性を示す
- 学習者の混乱を避ける

#### 4.1.5 Tagged Unionによる認可結果

```typescript
export type AuthzDecision = 
  | { type: 'granted'; matchedRoles: string[]; permissions: PermissionBits }
  | { type: 'denied'; reason: 'no-role' }
  | { type: 'denied'; reason: 'insufficient-permission'; roles: string[] }
```

理由：
- 型安全性
- デバッグのしやすさ
- ACL実装との一貫性

#### 4.1.6 最小限のAPI設計

```typescript
class RoleBasedAccessControl {
  constructor(resource: RbacResource)
  authorize(request: AuthzRequest): AuthzDecision
  assignRole(userId: string, roleName: string): void
  revokeRole(userId: string, roleName: string): void
}
```

理由：
- RBACの本質的な操作に集中
- 学習の負担を軽減
- テストが書きやすい

### 4.2 型定義の詳細

#### 4.2.1 基本型

```typescript
// 権限ビット（ACLと共通）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// 権限アクション
export type PermissionAction = keyof PermissionBits // 'read' | 'write'

// ロール定義
export type Role = {
  name: string
  permissions: PermissionBits
  description?: string // 学習用の説明
}

// RBACで保護されるリソース
export type RbacResource = {
  name: string
  roles: Role[] // 利用可能なロール
  assignments: Map<string, Set<string>> // userId -> roleNames
}
```

#### 4.2.2 リクエストと結果

```typescript
// 認可リクエスト
export type AuthzRequest = {
  userId: string
  action: PermissionAction
}

// 認可決定（Tagged Union）
export type AuthzDecision = 
  | { 
      type: 'granted'
      matchedRoles: string[]
      permissions: PermissionBits
    }
  | { 
      type: 'denied'
      reason: 'no-role'
    }
  | { 
      type: 'denied'
      reason: 'insufficient-permission'
      roles: string[]
    }
```

### 4.3 事前定義ロール

学習用に典型的なロールを事前定義：

```typescript
export const PREDEFINED_ROLES = {
  VIEWER: {
    name: 'viewer',
    permissions: { read: true, write: false },
    description: 'ドキュメントの閲覧のみ可能'
  },
  EDITOR: {
    name: 'editor',
    permissions: { read: true, write: true },
    description: 'ドキュメントの閲覧と編集が可能'
  },
  ADMIN: {
    name: 'admin',
    permissions: { read: true, write: true },
    description: '全権限を持つ管理者'
  }
} as const
```

## 5. 理由と根拠

### 5.1 学習効果の最大化

#### 5.1.1 RBACの核心概念への集中

- ロールという抽象層の価値を理解
- ユーザー管理と権限管理の分離
- 職務分離（Separation of Duties）の実現

#### 5.1.2 ACLとの比較学習

- 同じ題材（ドキュメント管理）で実装方式の違いを比較
- 権限管理の発展（直接設定→ロール経由）を体験
- それぞれの長所・短所を理解

#### 5.1.3 実践的なパターンの学習

- 複数ロールの統合
- ロールベースの権限チェック
- 最小権限の原則

### 5.2 設計の簡潔性

#### 5.2.1 不要な複雑性の排除

以下の要素は意図的に除外：
- ロール階層
- 動的な権限
- セッション管理
- 制約（相互排他ロール等）

#### 5.2.2 段階的な学習パス

1. 基本的なロール割り当て
2. 複数ロールの扱い
3. 権限の統合ロジック
4. （将来）階層的ロールへの拡張

### 5.3 他の実装との一貫性

#### 5.3.1 共通の型定義

- `PermissionBits`：全実装で共通
- `PermissionAction`：統一されたインターフェース
- Tagged Union：一貫した結果表現

#### 5.3.2 命名規則

- Unix: `hasPermission`
- ACL: `resolveAccess`
- RBAC: `authorize` ← 業界標準の用語
- ABAC: `evaluate`（予定）
- ReBAC: `checkRelation`（予定）

## 6. 結果と影響

### 6.1 利点

#### 6.1.1 管理の簡素化を体験

- 新規ユーザーの追加が容易（ロール割り当てのみ）
- 権限変更が一元管理（ロール定義の変更）
- 組織構造との自然な対応

#### 6.1.2 セキュリティの向上

- 最小権限の原則の実装
- 職務分離の実現
- 監査ログの簡素化（ロール単位）

#### 6.1.3 型安全な実装

- コンパイル時のエラー検出
- IDEの補完支援
- 明確なエラーハンドリング

### 6.2 トレードオフ

#### 6.2.1 柔軟性 vs シンプルさ

採用：シンプルさを優先
- 例外的な権限設定は困難
- ロール爆発の可能性
- 学習目的では問題なし

#### 6.2.2 完全性 vs 学習効率

採用：学習効率を優先
- NIST RBACモデルの一部のみ実装
- Core RBAC相当の機能
- Hierarchical/Constrained RBACは除外

### 6.3 将来の拡張性

#### 6.3.1 階層的ロール

将来の学習課題として：
```typescript
type RoleHierarchy = {
  parent: string
  children: string[]
}
```

#### 6.3.2 動的職務分離

制約の追加：
```typescript
type Constraint = {
  type: 'mutual-exclusive'
  roles: string[]
}
```

#### 6.3.3 ABACへの移行

属性ベースへの発展：
- ロールを属性の一つとして扱う
- より柔軟な条件設定

## 7. 実装例

### 7.1 基本的な使用例

```typescript
// RBACインスタンスの作成
const rbac = new RoleBasedAccessControl({
  name: 'project-proposal.doc',
  roles: [
    PREDEFINED_ROLES.VIEWER,
    PREDEFINED_ROLES.EDITOR,
    PREDEFINED_ROLES.ADMIN
  ],
  assignments: new Map()
})

// ロール割り当て
rbac.assignRole('alice', 'editor')
rbac.assignRole('bob', 'viewer')
rbac.assignRole('charlie', 'admin')

// 権限チェック
const decision = rbac.authorize({
  userId: 'alice',
  action: 'write'
})

// 結果の処理
switch (decision.type) {
  case 'granted':
    console.log(`アクセス許可: ${decision.matchedRoles.join(', ')}`)
    break
  case 'denied':
    if (decision.reason === 'no-role') {
      console.log('ロールが割り当てられていません')
    } else {
      console.log(`権限不足: ${decision.roles.join(', ')}`)
    }
    break
}
```

### 7.2 複数ロールの例

```typescript
// ユーザーに複数ロールを割り当て
rbac.assignRole('david', 'viewer')
rbac.assignRole('david', 'editor')

// 権限は統合される（editor権限でwrite可能）
const decision = rbac.authorize({
  userId: 'david',
  action: 'write'
})
// 結果: granted（editorロールによる）
```

### 7.3 ロールの取り消し

```typescript
// ロールの取り消し
rbac.revokeRole('alice', 'editor')

// 権限チェック（もはやwrite権限なし）
const decision = rbac.authorize({
  userId: 'alice',
  action: 'write'
})
// 結果: denied（no-role）
```

## 8. テスト戦略

### 8.1 単体テスト

必須のテストケース：
1. 基本的な権限チェック
2. ロールの割り当て・取り消し
3. 複数ロールの統合
4. 存在しないユーザー/ロール
5. 権限なしのケース

### 8.2 統合テスト

シナリオベースのテスト：
1. 新入社員のオンボーディング
2. 部署異動による権限変更
3. 臨時の権限昇格
4. 退職時の権限削除

## 9. 参考情報

### 9.1 RBAC関連の文献

- NIST RBAC Model (INCITS 359-2004)
- ANSI RBAC Standard
- "Role-Based Access Control" by Ferraiolo, Kuhn, and Chandramouli

### 9.2 実装例

- Spring Security (Java)
- Casbin (Go/多言語)
- CASL (JavaScript)
- Pundit (Ruby)

### 9.3 関連するADR

- Unix権限実装のADR
- ACL実装のADR（本プロジェクト内）
- ABAC実装のADR（今後作成予定）
- ReBAC実装のADR（今後作成予定）

## 10. まとめ

このRBAC実装は、権限管理の発展における重要なステップであるロールベースの抽象化を学習するために設計されています。ACLの直接的な権限設定から、ロールを介した間接的な権限管理への移行を体験することで、より大規模なシステムにおける権限管理の課題と解決策を理解できます。

最小限のAPIと明確な型定義により、RBACの本質的な概念に集中しながら、実践的なパターンを学習できる設計となっています。