# ADR-005: 権限評価 - ルールベース設計

## ステータス
- **日付**: 2025-08-14
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ReBACでは関係性から権限を導出する必要がある。どの関係がどの権限（read/write）を付与するかを定義し、評価する仕組みが必要。

## 検討したオプション

### オプション1: ハードコードされたマッピング
```typescript
const RELATION_TO_PERMISSION = {
  'owns': ['read', 'write'],
  'editor': ['read', 'write'],
  'viewer': ['read']
}
```
- 利点：シンプル、高速
- 欠点：柔軟性に欠ける、拡張が困難

### オプション2: ルールベース設計
```typescript
interface PermissionRule {
  relation: RelationType
  permissions: PermissionBits
  description: string
}

const PERMISSION_RULES: PermissionRule[] = [
  { relation: 'owns', permissions: { read: true, write: true }, description: '所有者は全権限' },
  { relation: 'manages', permissions: { read: true, write: true }, description: '管理者は全権限' },
  { relation: 'editor', permissions: { read: true, write: true }, description: '編集者は読み書き可能' },
  { relation: 'viewer', permissions: { read: true, write: false }, description: '閲覧者は読み取りのみ' }
]
```
- 利点：拡張性、自己文書化、学習時に理解しやすい
- 欠点：若干の複雑さ

## 決定

**オプション2: ルールベース設計**を採用

### 権限判定の処理フロー

1. **必要関係性の特定**: アクション（read/write）に対して必要な関係性リストを取得
2. **関係性ごとの探索**: 各関係性についてグラフ探索を実行
3. **結果の構築**: 
   - パス発見時：`type: 'granted'`、パスと関係性を記録
   - パス未発見時：`type: 'denied'`、探索した関係性を記録

### 結果の表現

```typescript
export type ReBACDecision = 
  | { 
      type: 'granted'
      path: RelationPath       // 権限の根拠となる関係性パス
      relation: RelationType   // マッチした関係
    }
  | { 
      type: 'denied'
      reason: 'no-relation'
      searchedRelations: RelationType[]
    }
  | {
      type: 'denied'
      reason: 'max-depth-exceeded'
      maxDepth: number
    }
```

## 結果

### 利点
- 新しい関係タイプの追加が容易
- 権限ルールの変更が柔軟
- デバッグ情報が豊富（パス、理由）
- 自己文書化されたルール

### トレードオフ
- ルール管理の複雑さ
- 実行時のルール評価コスト

### 今後の課題
- 動的なルール変更への対応
- ルールの優先順位設定
- コンテキスト依存の権限評価