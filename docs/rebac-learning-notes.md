# ReBAC学習ノート

## 目次

1. [基本概念](#基本概念)
2. [権限判定の仕組み](#権限判定の仕組み)
3. [実装のポイント](#実装のポイント)
4. [他モデルとの比較](#他モデルとの比較)
5. [実用的な考慮事項](#実用的な考慮事項)

---

## 基本概念

### ReBACとは

**ReBAC (Relationship-Based Access Control)** は、エンティティ間の関係性をグラフ構造で表現し、その関係性から権限を推移的に導出する権限管理モデルです。

### 核心要素

#### 1. 関係性タプル（Relationship Tuple）
ReBACの基本要素は `(subject, relation, object)` の3つ組：

```typescript
{
  subject: 'alice',     // 主体（ユーザーやグループ）
  relation: 'manages',  // 関係の種類
  object: 'dev-team'    // 客体（リソースやグループ）
}
```

#### 2. グラフ構造
関係性タプルがグラフを形成：
```
alice --manages--> dev-team
bob --memberOf--> dev-team
bob --owns--> document1
```

#### 3. 推移的権限
関係の連鎖から権限を導出：
```
alice manages dev-team AND 
bob memberOf dev-team AND 
bob owns document1
→ alice can access document1 (管理権限による)
```

### 他の権限管理モデルとの位置づけ

```
Unix → ACL → RBAC → ABAC → ReBAC
                     ↑       ↑
                  属性評価  関係性探索
                 (ルール)   (グラフ)
```

| モデル | 権限の源泉 | 評価方法 |
|--------|-----------|----------|
| RBAC | ロール | 静的な割り当て |
| ABAC | 属性 | ポリシールールで評価 |
| **ReBAC** | **関係性** | **グラフを探索して発見** |

---

## 権限判定の仕組み

ReBACの権限判定は **2段階のプロセス** で行われます：

### 1. パス探索（関係性の発見）

**目的**: エンティティ間の関係パスをグラフ上で探索

**手法**: BFS（幅優先探索）を使用

**例**: 「Aliceがdocument1にアクセスできるか？」
```
探索開始: alice
↓
alice --manages--> dev-team (Level 1)
↓
bob --memberOf--> dev-team (Level 2、逆引き)
↓
bob --owns--> document1 (Level 3、目標発見！)

発見されたパス:
[
  { subject: 'alice', relation: 'manages', object: 'dev-team' },
  { subject: 'bob', relation: 'memberOf', object: 'dev-team' },
  { subject: 'bob', relation: 'owns', object: 'document1' }
]
```

### 2. 権限ルールの適用（関係から権限への変換）

**目的**: 発見した関係タイプが要求されたアクションを許可するか確認

**PermissionRules**による定義:
```typescript
const PERMISSION_RULES = [
  { relation: 'owns', permissions: { read: true, write: true } },
  { relation: 'manages', permissions: { read: true, write: true } },
  { relation: 'editor', permissions: { read: true, write: true } },
  { relation: 'viewer', permissions: { read: true, write: false } }
]
```

### 完全な判定フロー

```typescript
// 「AliceがDocument1をwriteできるか？」の判定

1. writeアクションに必要な関係を抽出
   → ['owns', 'manages', 'editor'] (write: trueを持つ関係)

2. 各関係タイプでパス探索を実行
   - alice --owns--> document1? ❌ パスなし
   - alice --manages--> ... --> document1? ✅ パス発見！

3. 結果の構築
   → manages関係のパスが見つかった
   → PermissionRulesでmanagesはwrite: true
   → 権限付与！

返却値:
{
  type: 'granted',
  path: [...], // 権限の根拠となるパス
  relation: 'manages' // マッチした関係
}
```

### 権限導出が「間接的」である理由

**直接的権限**: `bob --owns--> document1` → Bobは直接の所有者

**間接的権限**: 
- `alice --manages--> dev-team` → Aliceはチーム管理者
- チームメンバー（Bob）の所有物も管理権限の範囲内
- これが「間接的」な権限（推移的権限）

---

## 実装のポイント

### なぜBFS（幅優先探索）を使うのか

ReBACでBFSが標準となっている理由：

1. **最短パスの保証**: 権限の根拠として最短の関係パスが望ましい
2. **循環検出の容易さ**: visitedセットで簡単に管理
3. **デバッグの容易さ**: レベルごとの探索で関係の「距離」が明確
4. **予測可能な性能**: 深さ制限との相性が良い

#### キューを使う本質的な理由

**核心**: **データ構造がアルゴリズムの正しさを自動的に保証する**

```typescript
// キューのFIFO特性が、自然にBFSの探索順序を作り出す
class Queue {
  enqueue(item) { /* 末尾に追加 */ }
  dequeue()     { /* 先頭から取得 */ }
}

// この2つの操作だけで、自動的に：
// 1. 同じレベルのノードが連続して処理される
// 2. 次のレベルは全て後回しになる
// → BFSの定義そのもの！
```

#### 探索順序の保証メカニズム

BFSの本質は「**同じ距離のノードを全て探索してから、次の距離に進む**」こと：

```
開始点からの距離:
距離0: A（開始点）
距離1: B, C, D（Aの隣接ノード）
距離2: E, F, G（B,C,Dの隣接ノード）
```

キューの**FIFO（First In, First Out）**特性により：
- 距離1のノード（B,C,D）を全て処理
- その後で距離2のノード（E,F,G）を処理
- この順序が構造的に保証される

#### なぜスタックではダメなのか

もしスタック（LIFO）を使うとDFSになってしまう：

```typescript
// スタックを使った場合（これはDFSになる）
const stack = [startNode]
while (stack.length > 0) {
  const node = stack.pop()  // 最後に入れたものから取り出す
  stack.push(...neighbors)  // 隣接ノードを追加
}

// 結果: A → B → E → ... （Eの先まで深く進む）
// その後でやっとCやDを探索
```

**ReBACでの実用的な問題**：
```typescript
// DFSだと無駄に長いパスを先に探索してしまう
alice --knows--> charlie --knows--> david --knows--> ... --memberOf--> team

// BFSなら最短パスを最初に発見
alice --manages--> team (距離1で発見！)
```

#### アルゴリズムとデータ構造の対応関係

| アルゴリズム | データ構造 | 構造が保証する性質 |
|------------|-----------|------------------|
| **BFS** | **キュー（FIFO）** | **レベル順の探索** |
| DFS | スタック（LIFO） | 深さ優先の探索 |
| ダイクストラ | 優先度付きキュー | 最小コスト順の探索 |

**重要な洞察**: プログラマーが順序を管理する必要がない。キューに入れて取り出すだけで、自動的にBFSの正しい動作が保証される。

```typescript
// 美しいシンプルさ - 順序制御のロジックが不要
while (queue.length > 0) {
  const node = queue.shift()  // これだけでレベル順が保証される
  
  for (const neighbor of getNeighbors(node)) {
    queue.push(neighbor)  // 追加順序を考えなくていい
  }
}
```

### 具体的なBFS実装

```typescript
findRelationPath(subject: EntityId, targetObject: EntityId): RelationPath | null {
  // BFSのためのキュー
  const queue: SearchState[] = [{
    current: subject,
    path: [],
    depth: 0
  }]
  
  const visited = new Set<EntityId>()
  visited.add(subject)
  
  while (queue.length > 0) {
    const { current, path, depth } = queue.shift()!
    
    // 深さ制限チェック
    if (depth >= this.config.maxDepth) continue
    
    // 目的地への直接関係をチェック
    const relations = this.graph.getRelations(current)
    for (const tuple of relations) {
      if (tuple.object === targetObject) {
        return [...path, tuple] // 到達！
      }
      
      // 未訪問ノードをキューに追加
      if (!visited.has(tuple.object)) {
        visited.add(tuple.object)
        queue.push({
          current: tuple.object,
          path: [...path, tuple],
          depth: depth + 1
        })
      }
    }
  }
  
  return null // 関係性が見つからない
}
```

### 循環検出

**問題**: グラフに循環があると無限ループが発生
```
teamA --manages--> teamB
teamB --manages--> teamC  
teamC --manages--> teamA (循環！)
```

**解決**: visitedセットによる訪問済みノード管理
```typescript
const visited = new Set<EntityId>()
if (!visited.has(nextNode)) {
  visited.add(nextNode)
  // 探索続行
}
```

### 深さ制限

**目的**: 性能問題と無限ループの防止

**実装**:
```typescript
interface ReBACConfig {
  maxDepth: number  // デフォルト: 3
}

// 探索時に深さをチェック
if (depth >= this.config.maxDepth) continue
```

---

## 他モデルとの比較

### ABAC vs ReBAC の本質的な違い

| 要素 | ABAC | ReBAC |
|------|------|-------|
| **権限の源泉** | 属性（特性） | 関係性（つながり） |
| **評価方法** | ポリシーで属性を評価 | グラフを探索して関係を発見 |
| **中心概念** | 属性＋ポリシー | 関係性＋グラフ |
| **権限判定** | ルールベース | パス探索ベース |

### 具体例での比較

**同じシナリオ**: 「部長のAliceが部下のBobが作成したドキュメントにアクセス」

#### ABAC のアプローチ
```
IF (user.role == "部長" AND 
    resource.creator.department == user.department AND
    action == "read")
THEN PERMIT
```
→ 属性の組み合わせをルールで評価

#### ReBAC のアプローチ
```
alice --manages--> sales-dept
bob --memberOf--> sales-dept
bob --created--> document
```
→ 関係のパスを探索 (`alice → sales-dept → bob → document`)

### 発展の流れ

```
ABAC → ReBAC の発展
「どんな条件で（What conditions）」
　↓
「どんな関係で（What relationships）」
```

- **ABAC**: 個別属性の評価から
- **ReBAC**: エンティティ間の関係性へ
- **グラフ構造の活用**: 組織や社会の自然な構造をそのままモデル化

### 各モデルのメソッド名

権限管理方式ごとに、その本質を表すメソッド名を使用：

| 権限モデル | メソッド名 | 理由 |
|-----------|-----------|------|
| Unix | `hasPermission` | 権限の有無を確認 |
| ACL | `resolveAccess` | Allow/Denyエントリーの競合を解決 |
| RBAC | `authorize` | 業界標準の認可用語 |
| ABAC | `evaluate` | ルール・属性を評価 |
| **ReBAC** | **`checkRelation`** | **関係性を確認** |

---

## 実用的な考慮事項

### 性能とスケーラビリティ

#### グラフ探索のコスト
- **時間計算量**: O(V + E) （Vはノード数、Eはエッジ数）
- **空間計算量**: O(V) （visitedセットとキュー）

#### 最適化手法
1. **キャッシュ**: 探索結果の保存
2. **インデックス**: 逆方向の関係索引
3. **並列探索**: 前方・後方同時探索（Zanzibar型）
4. **早期終了**: 最初の有効パスで探索停止

### Google Zanzibar との関係

#### Zanzibar の貢献
- **基本概念**: 関係性タプル、グラフベース権限管理
- **分散最適化**: 並列探索、キャッシュ戦略
- **一貫性保証**: スナップショット読み取り

#### 学習用実装での簡略化
本プロジェクトでは以下を除外：
- 分散システムの複雑さ
- レプリケーションとシャーディング
- 複雑なキャッシュ戦略
- 並列探索の実装

#### 業界での採用
| システム/ライブラリ | 特徴 |
|-------------------|------|
| **Google Zanzibar** | 分散システム、YouTube/Drive等で使用 |
| **SpiceDB** | Zanzibarインスパイア、オープンソース |
| **OpenFGA** | Auth0/Okta、CNCF |
| **Ory Keto** | Go実装、シンプル |

### ReBACの利点と課題

#### 利点
1. **自然な権限表現**: 組織構造をそのまま表現
2. **動的な権限伝播**: 関係が変われば自動的に権限も更新
3. **明確な監査証跡**: パス全体が権限の根拠
4. **推移的権限**: 複雑な階層構造を自然に扱える

#### 課題
1. **性能**: グラフ探索のコスト
2. **複雑性**: 大規模グラフでの管理
3. **循環**: 関係の循環参照への対処
4. **学習コスト**: グラフ理論の理解が必要

### 適用場面

#### ReBACが適している場面
- 組織の階層構造が重要
- 権限の委譲や継承が頻繁
- エンティティ間の関係が動的
- 監査要件が厳しい

#### 他モデルが適している場面
- **RBAC**: 固定的な役割分担
- **ABAC**: 複雑な条件判定
- **ACL**: シンプルな個別権限設定

---

## 学習のポイント

### 理解すべき核心概念

1. **関係性グラフ**: エンティティ間のつながりをグラフで表現
2. **推移的権限**: 関係の連鎖から権限を導出
3. **パス探索**: BFSによる効率的な関係発見
4. **権限ルール**: 関係タイプから具体的権限への変換

### 段階的な学習アプローチ

1. **Phase 1**: 直接関係のみ（1ホップ）
2. **Phase 2**: 間接関係（2-3ホップ）
3. **Phase 3**: 複雑な組織構造のモデリング
4. **Phase 4**: 最適化とスケーラビリティ

### 実装時の注意点

- **循環検出**: visitedセットの適切な管理
- **深さ制限**: 無限探索の防止
- **型安全性**: TypeScriptの型システムの活用
- **デバッグ性**: パス情報の保持と可視化

この学習ノートを通じて、ReBACの本質的な仕組みと実装上のポイントを理解し、現代的な権限管理システムの設計思想を習得できます。