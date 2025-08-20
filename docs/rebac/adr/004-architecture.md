# ADR-004: アーキテクチャ - クラス責任の分離

## ステータス
- **日付**: 2025-08-19
- **状態**: 承認
- **決定者**: プロジェクトチーム

## コンテキスト

ReBACシステムにおいて、グラフ探索ロジックと権限判定ロジックをどのように構成するかは重要な設計決定である。単一のクラスにすべての責任を持たせるか、責任を分離するかを決める必要がある。

## 検討したオプション

### オプション1: 単一クラス設計
```typescript
class ReBACProtectedResource {
  // グラフ管理、探索、権限判定をすべて含む
  private graph: RelationGraph
  
  private findPath(subject: EntityId, object: EntityId): RelationPath | null {
    // BFS実装をここに直接記述
  }
  
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision {
    // 探索と権限判定を同じクラスで実行
  }
}
```
- 利点：シンプルな構造、クラス間の依存が少ない
- 欠点：単一責任の原則違反、テストが困難、再利用性が低い

### オプション2: 探索ロジックの分離
```typescript
class RelationshipExplorer {
  // グラフ探索に特化
  findRelationPath(subject: EntityId, object: EntityId): ExplorationResult
}

class ReBACProtectedResource {
  // リソース保護と権限判定に特化
  constructor(private explorer: RelationshipExplorer)
  checkRelation(subject: EntityId, action: PermissionAction): ReBACDecision
}
```
- 利点：単一責任の原則、高い再利用性、独立したテスト、アルゴリズムの差し替え可能
- 欠点：クラス数の増加、若干の複雑性

## 決定

**オプション2: 探索ロジックの分離**を採用

### 責任の分担
- **RelationshipExplorer**: グラフ探索アルゴリズム（BFS）、循環検出、深度制限
- **ReBACProtectedResource**: 特定リソースの権限管理、権限ルールの適用、結果の構築
- **RelationGraph**: グラフデータの管理、関係の追加・削除

### 採用理由

1. **単一責任の原則（SRP）**: 各クラスが明確な責任を持つ
2. **テスタビリティ**: 探索と権限判定を独立してテスト可能
3. **再利用性**: 複数のリソースで同じExplorerを共有
4. **拡張性**: 異なる探索戦略への差し替えが容易
5. **業界標準との整合性**: Google Zanzibar、SpiceDB等も同様の分離

## 結果

### 利点
- モックを使用した効率的な単体テスト
- アルゴリズムの改善が容易
- 責任が明確で理解しやすい設計
- 将来的な最適化（キャッシュ、並列探索）への対応が容易

### トレードオフ
- クラス数の増加
- 初期実装がやや複雑

### 今後の課題
- インターフェースの定義による抽象化
- 依存性注入パターンの完全な実装
- 探索戦略のプラガブルな設計