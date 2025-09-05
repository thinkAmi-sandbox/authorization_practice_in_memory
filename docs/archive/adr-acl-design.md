# ADR: ACL (Access Control List) 学習用実装の設計

## 1. ステータス

- **日付**: 2025-07-21
- **状態**: 提案
- **決定者**: プロジェクトチーム

## 2. コンテキスト

### 2.1 プロジェクトの背景（権限管理システムの学習用実装）

このプロジェクトは、ユーザーが権限管理システムを学習するための実装サンプルを提供することを目的としています。特にACL（Access Control List）は、Unixパーミッションよりも細かい権限制御を実現する重要な権限管理パターンです。

### 2.2 ACLの位置づけ（Unixパーミッションとの違い）

- **Unixパーミッション**: 所有者・グループ・その他の3つの主体に対する固定的な権限設定
- **ACL**: 任意の数のユーザー・グループに対する個別の権限設定が可能

### 2.3 想定する題材（社内ドキュメント管理システム）

学習効果を高めるため、社内ドキュメント管理システムを題材として選択しました。この文脈では：
- 実行権限は不要（ドキュメントは実行するものではない）
- read（閲覧）とwrite（作成・更新・削除）の2つの権限で十分

### 2.4 認可ライブラリの一般的な実装パターンの学習

このプロジェクトでは、認可ライブラリの利用者として、その内部実装を理解することも重要な学習目的です。主要な認可ライブラリ（Spring Security、Casbin、AWS IAM、CanCanCan等）の多くは「Deny優先型」を採用しており、これは以下の理由によります：

- **セキュリティの原則**: 明示的な拒否は常に優先されるべき
- **管理の容易さ**: エントリーの順序を気にする必要がない
- **ポリシーの合成**: 複数のポリシーソースを統合しやすい

## 3. 検討した設計オプション

### 3.1 データ構造の設計

#### 3.1.1 文字列結合形式 vs 構造化された型

**オプション1: 文字列結合形式**
```typescript
subject: "user:alice" | "group:admin"
```

**オプション2: 構造化された型**
```typescript
subject: { type: 'user' | 'group', name: string }
```

#### 3.1.2 複数リソース管理 vs 1インスタンス1リソース

**オプション1: 複数リソース管理**
- 1つのACLインスタンスで複数のリソースを管理
- より実システムに近い

**オプション2: 1インスタンス1リソース**
- 1つのACLインスタンスが1つのリソースのみを管理
- シンプルで理解しやすい

#### 3.1.3 Subject型の設計（id vs name）

**オプション1: idフィールド**
```typescript
{ type: 'user', id: string }
```

**オプション2: nameフィールド**
```typescript
{ type: 'user', name: string }
```

### 3.2 エントリー型の設計

#### 3.2.1 deny フィールド方式 vs Tagged Union 方式

**オプション1: deny フィールド方式**
```typescript
export type Entry = {
  subject: Subject
  permissions: PermissionBits
  deny?: boolean  // trueなら拒否、falseまたは省略なら許可
}
```

**問題点:**
- `deny: true` かつ `read: true` のような曖昧な組み合わせが可能
- `permissions` の意味が `deny` フィールドによって変わる
- 型システムで意図を表現できない

**オプション2: Tagged Union 方式**
```typescript
export type Entry = 
  | { type: 'allow'; subject: Subject; permissions: PermissionBits }
  | { type: 'deny'; subject: Subject; permissions: PermissionBits }
```

**利点:**
- 型安全性：コンパイル時に意図が明確
- 一貫性：`permissions` の `true` は常に「対象となる権限」を意味
- 明確性：AllowとDenyが明確に区別される

### 3.3 権限モデル

#### 3.3.1 アクションの種類（read/write/execute vs read/write）

**オプション1: 3種類（read/write/execute）**
- Unixパーミッションと同じ
- より多様な例が作れる

**オプション2: 2種類（read/write）**
- ドキュメント管理に特化
- deleteはwriteに含まれる

#### 3.3.2 Unix互換 vs ACL独自の権限ビット

**オプション1: Unix互換**
```typescript
import { PermissionBits } from '../unix-permission/unix-permission'
```

**オプション2: ACL独自**
```typescript
export type ACLPermissionBits = { read: boolean; write: boolean; execute: boolean }
```

### 3.4 所有者の扱い

#### 3.4.1 所有者特権あり（Unix方式）

- 所有者は常にフルアクセス権を持つ
- ACLエントリーに関係なく制限できない

#### 3.4.2 純粋なACL（所有者も通常エントリーで制御）

- 所有者も他のユーザーと同様にACLエントリーで制御
- より柔軟で教育的

### 3.5 アクセス決定結果の型設計

#### 3.5.1 Optionalプロパティを持つ単一型

```typescript
type AccessDecision = {
  granted: boolean
  matchedEntry?: Entry
  matchedBy?: 'user-entry' | 'group-entry'
  denyReason?: 'no-match' | 'denied-by-entry'
}
```

#### 3.5.2 Union型による状態分離

```typescript
type AccessDecision = 
  | { granted: true; matchedEntry: Entry; matchedBy: string }
  | { granted: false; reason: string }
```

#### 3.5.3 Tagged Union（判別可能なUnion型）

**順序依存型向け（4つの詳細な状態）:**
```typescript
type AccessDecision = 
  | { type: 'granted'; matchedEntry: Entry; matchedBy: 'user-entry' | 'group-entry' }
  | { type: 'no-match' }
  | { type: 'permission-denied'; matchedEntry: Entry; matchedBy: 'user-entry' | 'group-entry' }
  | { type: 'explicit-deny'; matchedEntry: Entry; matchedBy: 'user-entry' | 'group-entry' }
```

**Deny優先型向け（3つのシンプルな状態）:**
```typescript
type AccessDecision = 
  | { type: 'granted'; allowEntries: Entry[] }
  | { type: 'denied'; denyEntry: Entry; allowEntries: Entry[] }
  | { type: 'no-match' }
```

### 3.6 権限パターンの型安全性

#### 3.6.1 Tagged Union導入後の課題

Tagged Union方式でEntry型を定義した場合、権限パターン定数の扱いに課題が生じます：

**課題:**
- 許可用のパターン（例：READ_ONLY）を拒否エントリーで使用できてしまう
- 拒否用のパターン（例：DENY_ALL）を許可エントリーで使用すると意味が逆転
- 型システムでこの誤用を防げない

#### 3.6.2 ヘルパー関数方式

**アプローチ:**
```typescript
function createAllowEntry(subject: Subject, pattern: AllowPattern): Entry
function createDenyEntry(subject: Subject, pattern: DenyPattern): Entry
```

**問題点:**
- ヘルパー関数を使わない場合、依然として誤用が可能
- 開発者がヘルパー関数の使用を忘れる可能性

#### 3.6.3 Branded Types方式

**アプローチ:**
```typescript
type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }
```

**利点:**
- 型レベルで完全に制約
- ヘルパー関数なしでも型安全
- コンパイル時にエラーを検出
- 実行時のオーバーヘッドなし（_brandは実行時に存在しない）

### 3.7 評価方式の選択

#### 3.7.1 順序依存型（Order-Dependent）

**特徴:**
- エントリーは上から順に評価される
- 最初にマッチしたエントリーが適用される
- 例：Windows NTFS、ファイアウォールACL

**利点:**
- より細かい制御が可能
- 例外ルールを作りやすい

**欠点:**
- エントリーの順序管理が必要
- ポリシーの合成が困難

#### 3.7.2 Deny優先型（Deny-First）

**特徴:**
- すべてのマッチするエントリーを評価
- 1つでもDenyがあれば拒否
- 例：Spring Security、Casbin、AWS IAM

**利点:**
- セキュリティ原則に合致（明示的な拒否を優先）
- エントリーの順序を気にしなくてよい
- 複数のポリシーソースを容易に統合可能

**欠点:**
- 例外的な許可が作りにくい場合がある

## 4. 決定事項

### 4.1 採用した設計

#### 4.1.1 1インスタンス1リソース設計

学習目的では、1つのインスタンスが1つのリソースを管理する設計を採用。これにより：
- 責任範囲が明確
- 実装がシンプル
- 理解しやすい

#### 4.1.2 Tagged UnionによるEntry型

```typescript
export type Entry = 
  | { type: 'allow'; subject: Subject; permissions: PermissionBits }
  | { type: 'deny'; subject: Subject; permissions: PermissionBits }
```

型安全性と意図の明確化を重視。`permissions`の`true`は常に「対象となる権限」を意味し、`type`フィールドで許可/拒否を明確に区別。

#### 4.1.3 構造化されたSubject型（type + name）

```typescript
export type Subject = {
  type: 'user' | 'group'
  name: string  // 'id'ではなく'name'を使用
}
```

型安全性と可読性を重視した設計。

#### 4.1.4 read/writeの2権限のみ

ドキュメント管理システムの文脈に合わせて：
- read: ドキュメントの閲覧
- write: ドキュメントの作成・更新・削除

#### 4.1.5 純粋なACL（所有者特権なし）

所有者も通常のACLエントリーで権限を制御。これにより：
- ACLの本質（すべてのアクセスがエントリーで制御される）を学べる
- より柔軟な権限設定が可能

#### 4.1.6 Deny優先型の評価方式

認可ライブラリの一般的な実装パターンを学ぶため、Deny優先型を採用。これにより：
- セキュリティ原則（明示的な拒否の優先）を学習
- エントリーの順序に依存しない実装
- 実際の認可ライブラリ（Spring Security、AWS IAM等）と同じ動作

##### 4.1.6.1 同一主体への許可・拒否の重複設定

Deny優先型では、同一のユーザーまたはグループに対して、許可（Allow）と拒否（Deny）の両方のエントリーを設定することが可能です：

**同一ユーザーへの重複例:**
```typescript
entries: [
  // Aliceに読み取り許可
  {
    type: 'allow',
    subject: { type: 'user', name: 'alice' },
    permissions: { read: true, write: false }
  },
  // 同じAliceに書き込み拒否
  {
    type: 'deny',
    subject: { type: 'user', name: 'alice' },
    permissions: { read: false, write: true }
  }
]
```

**同一グループへの重複例:**
```typescript
entries: [
  // Developersグループに書き込み許可
  {
    type: 'allow',
    subject: { type: 'group', name: 'developers' },
    permissions: { read: false, write: true }
  },
  // 同じDevelopersグループに読み取り拒否
  {
    type: 'deny',
    subject: { type: 'group', name: 'developers' },
    permissions: { read: true, write: false }
  }
]
```

##### 4.1.6.2 重複設定が発生する理由

実際のシステムでは、以下の理由で同一主体への重複設定が発生します：

1. **管理者の意図的な設定**: 細かい権限制御のため、部分的な許可と部分的な拒否を組み合わせる
2. **時系列的な変更**: 古い許可設定が残ったまま、新しいセキュリティポリシーで拒否を追加
3. **複数管理者による設定**: 異なる管理者が独立して権限を設定した結果
4. **グループと個人の競合**: ユーザーが所属するグループに拒否があり、個人に許可がある場合

##### 4.1.6.3 Deny優先型での競合解決

Deny優先型では、以下のルールで競合を解決します：

1. **すべてのマッチするエントリーを評価**: エントリーの順序に関係なく、該当するすべてのエントリーをチェック
2. **拒否が1つでもあれば拒否**: セキュリティの原則として、明示的な拒否は常に優先
3. **拒否がない場合のみ許可を評価**: すべての拒否エントリーをチェックした後で、許可エントリーを確認

**評価例:**
```typescript
// Alice（Developersグループ所属）がwriteアクセスを要求
// エントリー: Alice個人にwrite許可、DevelopersグループにDeny
// 結果: グループのDenyが優先され、アクセス拒否

const decision = {
  type: 'denied',
  denyEntry: { /* Developersグループの拒否エントリー */ },
  allowEntries: [ /* Aliceの許可エントリー */ ]  // 参考情報として含まれる
}
```

##### 4.1.6.4 実装上の考慮点

1. **エントリーの管理**: 同一主体への重複エントリーを許可することで、柔軟な権限設定が可能
2. **デバッグ情報**: `AccessDecision`に`allowEntries`と`denyEntry`の両方を含めることで、なぜ拒否されたかを追跡可能
3. **パフォーマンス**: すべてのエントリーを評価する必要があるが、学習用途では問題にならない
4. **将来の最適化**: 必要に応じて、同一主体のエントリーを事前に統合することも可能

#### 4.1.7 Tagged Unionによる型安全なAccessDecision

Deny優先型に合わせたシンプルな3つの結果パターン：
- `granted`: Denyエントリーがなく、権限を持つAllowエントリーが存在
- `denied`: Denyエントリーが1つでも存在（理由の詳細は区別しない）
- `no-match`: マッチするエントリーが存在しない

順序依存型と異なり、`permission-denied`と`explicit-deny`の区別は不要。Deny優先型では「なぜ拒否されたか」よりも「拒否されたか」が重要であるため。

#### 4.1.8 Branded Typesによる権限パターンの型安全性

Tagged Union導入により生じた権限パターンの誤用リスクを解決するため、Branded Types（ブランド型）を採用：

```typescript
type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }
```

**採用理由:**
1. **完全な型安全性**: 許可用パターンを拒否エントリーで使用しようとするとコンパイルエラー
2. **実行時への影響なし**: `_brand`プロパティは型情報のみで、実行時には存在しない
3. **開発者体験の向上**: IDEが適切な候補を提示し、誤用を即座に検出

**実装方針:**
- `ALLOW_PATTERNS`: 許可エントリー用のパターン定数
- `DENY_PATTERNS`: 拒否エントリー用のパターン定数
- 各パターンに適切なブランド型を付与

### 4.2 メソッドシグネチャ

#### 4.2.1 resolveAccessメソッド（権限解決を表す名称）

```typescript
resolveAccess(request: AccessRequest): AccessDecision
```

**メソッド名の選定経緯:**

当初は`checkAccess`を使用していたが、以下の理由により`resolveAccess`に変更：

1. **検討した候補:**
   - `checkAccess`: 汎用的すぎて具体的な処理内容が不明確
   - `evaluateAccess`: ABAC系でよく使われるが、ACLライブラリでは一般的でない
   - `isAllowed`: ACL系で標準的だが、booleanを返す印象を与える（実際は詳細なオブジェクトを返す）
   - `resolveAccess`: 複数のAllow/Denyエントリーから最終決定を「解決」する意味を明確に表現

2. **resolveAccessを選択した理由:**
   - **型の整合性**: `AccessRequest`を受け取り`AccessDecision`を返すという、入出力の型名と整合
   - **処理内容の正確な表現**: 複数のAllow/Denyエントリーから最終的なアクセス可否を「解決」
   - **ACLの本質**: ACL（Access Control List）の「アクセス制御」という主目的と一致
   - **返り値の性質**: 単なるboolean/権限ビットではなく、詳細な決定情報を返すことと合致

#### 4.2.2 エントリー管理メソッド群（最小限）

- `addEntry(entry: Entry): void`
- `removeEntry(subject: Subject): void`

学習用途では、これら2つのメソッドのみで十分。`clearEntries`も削除し、必要最小限のAPIに絞ることで、ACLの本質（エントリーの追加・削除とアクセスチェック）に集中できる。

## 5. 理由と根拠

### 5.1 学習効果の最大化

#### 5.1.1 ACLと認可ライブラリの核心概念への集中

- Deny優先型による安全なアクセス制御の理解
- 実際の認可ライブラリと同じ評価ロジック
- 複雑な機能（ワイルドカード、継承等）を排除

#### 5.1.2 型安全性による理解の促進

- Tagged Unionにより、すべての結果パターンが明示的
- TypeScriptの型チェックが学習を支援

#### 5.1.3 最小限設計の採用理由

学習用途に最適化するため、以下の要素を意図的に削除：

- **クエリメソッド群**: デバッグはテストコードで行うべきであり、本番コードには不要
- **エントリー作成ヘルパー**: 型を直接扱うことで、データ構造の理解を深める
- **clearEntries**: 学習段階では使用頻度が低い
- **複雑なAccessDecision**: Deny優先型では「なぜ拒否されたか」の詳細は不要

この最小限設計により、初学者は3つのメソッド（resolveAccess、addEntry、removeEntry）に集中でき、ACLの本質を効率的に学習できる。

### 5.2 Unix実装との一貫性と差別化

#### 5.2.1 共通部分（PermissionBits）

同じ`PermissionBits`型を使用することで、権限の概念の共通性を示す。

#### 5.2.2 異なる部分（アクセスチェックインターフェース）

- Unix: `hasPermission(userName, userGroups, action): boolean`
- ACL: `resolveAccess(request): AccessDecision`

異なるインターフェースにより、権限管理方式の違いを明確に。

### 5.3 実践的な例の作りやすさ

#### 5.3.1 ドキュメント管理システムへの適合性

- 社内文書の閲覧制限
- 部門別の編集権限
- 特定ユーザーの明示的な拒否

#### 5.3.2 デバッグのしやすさ

`AccessDecision`の詳細な情報により、なぜアクセスが許可/拒否されたかが明確。

## 6. 結果と影響

### 6.1 利点

#### 6.1.1 ACLと認可ライブラリの本質的な仕組みの理解

- エントリーリストによる柔軟な権限制御
- Deny優先型のセキュリティ原則
- Allow/Denyの明示的な制御
- 実際の認可ライブラリと同じ動作原理

#### 6.1.2 型安全なコード

- コンパイル時のエラー検出
- 網羅的なパターンマッチング
- IDEによる補完支援

#### 6.1.3 明確なエラーハンドリング

3つのシンプルな結果パターンにより、適切なエラーメッセージの提供が可能。

### 6.2 トレードオフ

#### 6.2.1 実装のシンプルさ vs 実システムの忠実性

学習効果を優先し、以下を簡略化：
- 1インスタンス1リソース
- 権限の継承なし
- デフォルト権限なし

#### 6.2.2 学習曲線の考慮

Tagged Unionは初学者には複雑かもしれないが、型安全性の利点が上回ると判断。

### 6.3 将来の拡張性

#### 6.3.1 他の権限管理方式（RBAC、ABAC）への発展

- 同様の設計原則（型安全性、シンプルさ）を適用可能
- インターフェースの一貫性を保ちつつ、各方式の特徴を表現

## 7. 実装例

### 7.1 型定義の完全なコード

```typescript
// 権限ビット（Unix実装と同一）
export type PermissionBits = {
  read: boolean
  write: boolean
}

// Branded Typesで許可用と拒否用を区別
export type AllowPermissionBits = PermissionBits & { readonly _brand: 'allow' }
export type DenyPermissionBits = PermissionBits & { readonly _brand: 'deny' }

// 権限アクション
export type PermissionAction = keyof PermissionBits  // 'read' | 'write'

// ACLエントリーの主体
export type Subject = {
  type: 'user' | 'group'
  name: string
}

// ACLエントリー（Tagged Union + Branded Types）
export type Entry = 
  | {
      type: 'allow'
      subject: Subject
      permissions: AllowPermissionBits  // 許可用パターンのみ許可
    }
  | {
      type: 'deny'
      subject: Subject
      permissions: DenyPermissionBits   // 拒否用パターンのみ許可
    }

// ACLで保護されるリソース
export type Resource = {
  name: string      // ドキュメント名
  entries: Entry[]  // Deny優先型では順序は重要でない
}

// アクセス要求
export type AccessRequest = {
  subject: {
    user: string      // 要求者のユーザー名
    groups: string[]  // 要求者が所属する全グループ
  }
  action: PermissionAction  // 'read' | 'write'
}

// アクセス決定（Tagged Union - Deny優先型）
export type AccessDecision = 
  | { type: 'granted'; allowEntries: Entry[] }  // マッチしたAllowエントリー
  | { type: 'denied'; denyEntry: Entry; allowEntries: Entry[] }  // Denyが優先
  | { type: 'no-match' }  // マッチするエントリーなし
```

### 7.2 クラスとヘルパー関数

```typescript
// クラス定義（最小限のAPI）
export class AccessControlList {
  private resource: Resource

  constructor(resource: Resource): void

  // アクセス可否を解決（Deny優先型評価）
  resolveAccess(request: AccessRequest): AccessDecision

  // エントリーを追加
  addEntry(entry: Entry): void
  
  // エントリーを削除
  removeEntry(subject: Subject): void
}

// 必須のヘルパー関数のみ
export function createPermissionBits(
  read: boolean,
  write: boolean
): PermissionBits

// 許可用パターン（Allowエントリーで使用）
export const ALLOW_PATTERNS = {
  READ_ONLY: { read: true, write: false, _brand: 'allow' } as AllowPermissionBits,
  WRITE_ONLY: { read: false, write: true, _brand: 'allow' } as AllowPermissionBits,
  READ_WRITE: { read: true, write: true, _brand: 'allow' } as AllowPermissionBits,
  NONE: { read: false, write: false, _brand: 'allow' } as AllowPermissionBits
} as const

// 拒否用パターン（Denyエントリーで使用）
export const DENY_PATTERNS = {
  ALL: { read: true, write: true, _brand: 'deny' } as DenyPermissionBits,
  READ: { read: true, write: false, _brand: 'deny' } as DenyPermissionBits,
  WRITE: { read: false, write: true, _brand: 'deny' } as DenyPermissionBits
} as const
```

### 7.3 Branded Typesの実行時の影響

Branded Typesの`_brand`プロパティは型情報のみで、実行時には存在しません：

```typescript
// コンパイル時の型
const pattern = ALLOW_PATTERNS.READ_ONLY
// { read: true, write: false, _brand: 'allow' }

// 実行時の値（console.log出力）
console.log(pattern)
// { read: true, write: false }
// _brandプロパティは実行時には存在しない
```

これにより：
- 実行時のパフォーマンスへの影響なし
- 既存のコードとの互換性維持
- 型安全性のメリットのみを享受

### 7.4 使用例（最小限）

```typescript
// ACLの作成（Branded Typesによる型安全性）
const acl = new AccessControlList({
  name: 'report.doc',
  entries: [
    {
      type: 'allow',
      subject: { type: 'group', name: 'managers' },
      permissions: ALLOW_PATTERNS.READ_WRITE  // 正しい使用
    },
    {
      type: 'deny',
      subject: { type: 'user', name: 'intern' },
      permissions: DENY_PATTERNS.ALL  // 正しい使用
    }
  ]
})

// コンパイルエラーの例
// const badEntry: Entry = {
//   type: 'allow',
//   subject: { type: 'user', name: 'alice' },
//   permissions: DENY_PATTERNS.ALL  // Error: Type 'DenyPermissionBits' is not assignable to type 'AllowPermissionBits'
// }

// アクセスチェック
const decision = acl.resolveAccess({
  subject: { user: 'bob', groups: ['managers'] },
  action: 'write'
})

// 結果の処理
switch (decision.type) {
  case 'granted':
    console.log('アクセス許可')
    break
  case 'denied':
    console.log('アクセス拒否')
    break
  case 'no-match':
    console.log('権限設定なし')
    break
}
```

### 7.5 AccessDecisionの各ケースの例

**granted（許可）**
```typescript
{
  type: 'granted',
  allowEntries: [
    {
      type: 'allow',
      subject: { type: 'group', name: 'managers' },
      permissions: { read: true, write: false, _brand: 'allow' } as AllowPermissionBits
    },
    {
      type: 'allow',
      subject: { type: 'user', name: 'alice' },
      permissions: { read: true, write: true, _brand: 'allow' } as AllowPermissionBits
    }
  ]
}
```

**denied（拒否）**
```typescript
{
  type: 'denied',
  denyEntry: {
    type: 'deny',
    subject: { type: 'user', name: 'intern' },
    permissions: { read: true, write: true, _brand: 'deny' } as DenyPermissionBits  // 両方を拒否
  },
  allowEntries: [
    {
      type: 'allow',
      subject: { type: 'group', name: 'employees' },
      permissions: { read: true, write: false, _brand: 'allow' } as AllowPermissionBits
    }
  ]
}
```

**no-match（エントリーなし）**
```typescript
{
  type: 'no-match'
}
```

## 8. 参考情報

### 8.1 ACL関連の文献

- POSIX ACL仕様
- Windows ACLドキュメント
- 各種ファイルシステムのACL実装

### 8.2 既存実装の参考例

**Deny優先型の実装:**
- Spring Security (Java)
- Casbin (Go/多言語)
- AWS IAM
- CanCanCan (Ruby)

**順序依存型の実装:**
- Linux `getfacl`/`setfacl`コマンド
- Windows NTFS ACL
- ファイアウォールルール

### 8.3 関連するADR

- Unix権限実装のADR（本プロジェクト内）
- RBAC実装のADR（今後作成予定）
- ABAC実装のADR（今後作成予定）