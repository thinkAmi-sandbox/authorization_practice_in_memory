# ADR-003: 型システム - 関係タイプの分離

## ステータス
- **日付**: 2025-08-19
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ReBACシステムでは、エンティティ間の関係（manages、memberOf）とリソースへのアクセス関係（owns、editor）が混在している。これらを単一の型で扱うと、意味的に不適切な関係（例：`document manages user`）を型レベルで防げない。

## 検討したオプション

### オプション1: 単一Union型
```typescript
type RelationType = 'owns' | 'manages' | 'memberOf' | 'delegatedBy' | 'viewer' | 'editor'
```
- 利点：シンプル、学習初期には理解しやすい
- 欠点：型安全性が低い、意味的な誤用を防げない

### オプション2: 関係カテゴリの分離
```typescript
export type IndirectRelationType = 'manages' | 'memberOf' | 'has' | 'delegatedBy'
export type DirectRelationType = 'owns' | 'viewer' | 'editor'
export type RelationType = IndirectRelationType | DirectRelationType
```
- 利点：型安全性の向上、権限伝播の仕組みが明確
- 欠点：若干複雑

### オプション3: Branded Types
```typescript
declare const EntityRelationBrand: unique symbol
export type EntityRelationType = 
  | 'manages' & { [EntityRelationBrand]: true }
```
- 利点：最高レベルの型安全性
- 欠点：学習者には理解が困難

### オプション4: オブジェクト指向アプローチ
```typescript
abstract class RelationType {
  abstract canConnectToResource(): boolean
  abstract canConnectToEntity(): boolean
}
```
- 利点：実行時の検証が可能
- 欠点：学習用としては過度に複雑

## 決定

**オプション2: 関係カテゴリの分離**を採用

### 型定義
```typescript
// 権限伝播の経路を形成する間接的関係
export type IndirectRelationType = 'manages' | 'memberOf' | 'has' | 'delegatedBy'

// エンティティとリソース間の直接的な権限関係
export type DirectRelationType = 'owns' | 'viewer' | 'editor'

// 統合型（互換性維持）
export type RelationType = IndirectRelationType | DirectRelationType

// 間接的関係タプル（権限伝播の経路）
// 例: Alice -> memberOf -> Team -> has -> Bob
export interface IndirectRelationTuple {
  subject: EntityId
  relation: IndirectRelationType
  object: EntityId  // グループまたはユーザー
}

// 直接的関係タプル（リソースへの直接的な権限）
// 例: Alice -> viewer -> Document
export interface DirectRelationTuple {
  subject: EntityId
  relation: DirectRelationType
  object: EntityId  // リソース（ドキュメント）
}

// 関係性の連鎖（探索結果）
export type RelationshipChain = RelationTuple[];
```

### 採用理由
1. **型安全性**: コンパイル時に不適切な関係を検出
2. **ReBACの本質的理解**: 直接/間接の関係性により権限伝播の仕組みを明確化
3. **実用性**: IDEの補完機能が効果的に動作、BFS探索の意図（最短経路優先）と整合
4. **互換性**: 既存コードを壊さずに導入可能

## 結果

### 利点
- 意味的に正しい関係のみを許可
- テストコードの安全性向上
- 開発時のミスを早期発見

### トレードオフ
- 型定義がやや複雑に
- 型ガード関数が必要

### 今後の課題
- ビルダーパターンによる使いやすさの向上
- 実行時検証の追加

## 学習の発展段階

### 段階的な理解
1. **初級**: IndirectとDirectの関係を区別して理解
   - 間接的関係: 権限伝播の経路（Alice -> Team -> Document）
   - 直接的関係: リソースへの直接権限（Alice -> Document）

2. **中級**: 関係の推移性による権限伝播を理解
   - BFS探索により最短経路を発見
   - RelationshipChainで権限の根拠を追跡

3. **上級**: 実際のReBACシステム（Zanzibar、SpiceDB等）では統一的に扱うことを理解
   - すべての関係を単一のTuple型で表現
   - グラフ理論に基づく統一モデルの利点を理解

本実装は初級〜中級の理解を重視し、学習効果を高めるため意図的に型を分離している。

### 命名の根拠
- **Indirect/Direct**: ReBACの「最短経路優先」という特性を型名で表現
- **RelationshipChain**: 関係性の連鎖を明確に表す標準的な用語