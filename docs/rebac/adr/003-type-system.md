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
export type EntityRelationType = 'manages' | 'memberOf' | 'delegatedBy'
export type ResourceRelationType = 'owns' | 'viewer' | 'editor'
export type RelationType = EntityRelationType | ResourceRelationType
```
- 利点：型安全性の向上、意図が明確
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
// エンティティ間の関係
export type EntityRelationType = 'manages' | 'memberOf' | 'delegatedBy'

// リソースへのアクセス関係
export type ResourceRelationType = 'owns' | 'viewer' | 'editor'

// 統合型（互換性維持）
export type RelationType = EntityRelationType | ResourceRelationType

// 対応するタプル型も分離
export interface EntityRelationTuple {
  subject: EntityId
  relation: EntityRelationType
  object: EntityId  // グループまたはユーザー
}

export interface ResourceRelationTuple {
  subject: EntityId
  relation: ResourceRelationType
  object: EntityId  // リソース（ドキュメント）
}
```

### 採用理由
1. **型安全性**: コンパイル時に不適切な関係を検出
2. **学習効果**: ReBACの概念（エンティティ関係 vs リソース権限）を正確に理解
3. **実用性**: IDEの補完機能が効果的に動作
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