# ReBAC (Relationship-Based Access Control) ドキュメント

## 概要

ReBAC（Relationship-Based Access Control）は、エンティティ間の関係性をグラフ構造で表現し、その関係性から権限を導出する最新の権限管理パターンです。このディレクトリには、学習用ReBAC実装に関する設計ドキュメントとArchitecture Decision Records（ADR）が含まれています。

## ドキュメント構成

### 📋 [design-doc.md](./design-doc.md)
ReBACの詳細な技術設計書です。以下の内容を含みます：
- ReBACの核心概念と用語定義
- 他の権限モデル（ACL、RBAC、ABAC）との比較
- 業界標準（Google Zanzibar、SpiceDB等）の調査結果
- 実装の詳細（型定義、グラフ構造、探索アルゴリズム）
- 権限判定の処理フロー

### 📁 [adr/](./adr/)
設計における重要な決定事項を記録したADRディレクトリです：
- **[ADR-001](./adr/001-core-model.md)**: コアモデル（タプルとグラフ構造）
- **[ADR-002](./adr/002-traversal-algorithm.md)**: 探索アルゴリズム（BFSと深度制限）
- **[ADR-003](./adr/003-type-system.md)**: 型システム（関係タイプの分離）
- **[ADR-004](./adr/004-architecture.md)**: アーキテクチャ（クラス責任分離）
- **[ADR-005](./adr/005-permission-evaluation.md)**: 権限評価（ルールベース設計）
- **[ADR-006](./adr/006-feature-scope.md)**: 機能範囲（Deny機能なし）

### 💡 [examples.md](./examples.md)
ReBACの実装例とコードサンプル集です：
- 基本的な使用例
- 型安全な実装パターン
- 推移的権限の例
- グループベースの権限管理
- 他の権限モデルとの比較例
- 段階的学習のシナリオ

### 📝 [learning-notes.md](./learning-notes.md)
ReBACの学習過程で得られた知見とメモ（移動予定）

## 学習パス

### 初級者向け
1. **概念理解**: [design-doc.md](./design-doc.md) のセクション1-3を読む
2. **基本実装**: [examples.md](./examples.md) の基本的な使用例を試す
3. **設計理解**: [ADR-001](./adr/001-core-model.md) と [ADR-002](./adr/002-traversal-algorithm.md) を読む

### 中級者向け
1. **型安全性**: [ADR-003](./adr/003-type-system.md) と型安全な実装例を学ぶ
2. **アーキテクチャ**: [ADR-004](./adr/004-architecture.md) でクラス設計を理解
3. **推移的権限**: 間接関係の例を実装してみる

### 上級者向け
1. **業界標準**: design-doc.mdの業界調査セクションを詳読
2. **比較分析**: 他の権限モデルとの違いを実装で確認
3. **拡張性**: 将来の拡張（Deny機能、キャッシュ等）を検討

## ReBACの特徴

### 利点
- 🔗 **自然な関係性表現**: 組織構造をそのままモデル化
- 🔄 **推移的権限**: 関係の連鎖から権限を自動導出
- 📊 **スケーラブル**: グラフ構造による効率的な管理
- 🔍 **監査性**: 権限の根拠（パス）が明確

### トレードオフ
- ⚡ **探索コスト**: グラフ探索に計算リソースが必要
- 🔧 **初期設計**: 適切な関係性の定義が重要
- 📚 **学習曲線**: グラフ理論の基本理解が必要

## 実装状況

### ✅ 実装済み
- 関係性タプルによるモデル化
- BFSによるグラフ探索
- 型安全な関係タイプ
- クラス責任の分離
- ルールベースの権限評価

### 🚧 今後の拡張
- 否定的関係（Deny）のサポート
- キャッシュ戦略の実装
- 並列探索の最適化
- 条件付き関係
- ABAC的な属性評価との統合

## 関連リソース

### 外部参考資料
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [SpiceDB Documentation](https://authzed.com/docs)
- [OpenFGA Documentation](https://openfga.dev)

### プロジェクト内の関連ドキュメント
- [ACL設計](../adr-acl-design.md)
- [RBAC設計](../adr-rbac-design.md)
- [ABAC設計](../adr-abac-design.md)

## コントリビューション

このドキュメントは学習用プロジェクトの一部です。改善提案や質問がある場合は、Issueを作成してください。

---

*最終更新: 2025-08-20*