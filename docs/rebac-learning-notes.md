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

#### タプル命名の業界標準

**現在の標準**: `(subject, relation, object)`

**歴史的変遷:**
```typescript
// Google Zanzibar (2016年)
(user, relation, object)

// 現在の業界標準 (2018年以降)
(subject, relation, object)
```

**なぜ`user`から`subject`へ変化したのか:**

| 命名 | 対象範囲 | 例 |
|------|---------|---|
| `user` | 人間のユーザーのみ | alice, bob |
| `subject` | 任意の主体 | alice, team, service-account, role |

```typescript
// subjectの汎用性
alice --owns--> document        // ユーザー
team --owns--> document         // チーム
service-account --owns--> api   // サービス
role --grants--> permission     // ロール
```

**主要ReBACシステムの命名:**

| システム | 命名パターン | 特徴 |
|---------|-------------|------|
| **Google Zanzibar** | `(user, relation, object)` | 初期実装、現在は内部で`subject`化 |
| **SpiceDB** | `(subject, relation, resource)` | Zanzibar準拠、`object`→`resource` |
| **OpenFGA** | `(user, relation, object)` | APIレベルでは`user`、内部は`subject` |
| **Ory Keto** | `(subject_id, relation, object)` | 明示的に`subject_id` |

**`relation`は全システムで共通** - 関係の種類を表す概念に違いはない

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

#### 4. 関係性のカテゴリ化と設計

**一般的な関係性の分類（実装依存）:**

今回の学習用実装では、関係性を2つのカテゴリに分類：

##### (a) リソース直接関係
リソースに対する直接的な権限：
```typescript
alice --owns--> document1      // 所有者
bob --editor--> document1      // 編集者
charlie --viewer--> document1  // 閲覧者
```

##### (b) エンティティ間関係
組織構造や協力関係：
```typescript
alice --manages--> dev-team     // 管理関係
bob --memberOf--> dev-team      // 所属関係
charlie --delegatedBy--> alice  // 委譲関係
```

**推移的権限の仕組み:**
```typescript
// エンティティ間関係 → リソース直接関係 → 具体的権限
alice --manages--> dev-team     // (b) エンティティ間関係
bob --memberOf--> dev-team      // (b) エンティティ間関係  
bob --owns--> document1         // (a) リソース直接関係
                                // → aliceはmanages関係により権限取得
```

**重要な注意点:**

1. **カテゴリ分けは必須ではない** - ReBACの本質的要件ではなく、実装の設計選択
2. **複数関係の共存** - 1つのリソースに対して複数の関係が存在可能
3. **権限の合流** - 異なる関係パスが同じリソースへの権限を提供

```typescript
// 複数関係の例：Aliceとdocument1
alice --owns--> document1           // 直接所有
alice --memberOf--> editors         // エディターグループ経由
editors --editor--> document1       // グループ権限

// どちらの関係からでもアクセス可能（最強の権限が適用）
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

**例**: 「Aliceがdocument1にアクセスできるか？」（簡略版）
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

### BFS探索の詳細メカニズム

#### 双方向探索とグラフの種類

ReBACで双方向探索が必要なのは、**ReBACの関係性グラフの特性**によるものです。一般的なBFSでは必ずしも双方向探索は必要ありません。

##### 一般的なBFSと双方向探索の違い

**通常のBFS（単方向）**:
```typescript
// 通常の有向グラフでのBFS
class Graph {
  adjacencyList: Map<Node, Node[]>  // A → [B, C]の形式
  
  bfs(start: Node, target: Node) {
    // 順方向のエッジのみを辿る
    for (const neighbor of this.adjacencyList.get(current)) {
      // current → neighbor の方向のみ
    }
  }
}
```

**ReBACで双方向が必要な理由**:

ReBACでは、関係性が**意味的に双方向**の情報を持つため：

```typescript
// 関係タプル
{ subject: 'bob', relation: 'memberOf', object: 'dev-team' }

// この1つのタプルが表現する2つの事実：
// 1. bob → dev-team (bobはdev-teamのメンバー)
// 2. dev-team ← bob (dev-teamはbobを含む)
```

**権限の推移には両方向が必要**：
```
alice --manages--> dev-team  // 順方向：aliceの管理対象
dev-team <--memberOf-- bob   // 逆方向：チームのメンバー
bob --owns--> document1       // 順方向：bobの所有物

// aliceがdocument1にアクセスするには、
// dev-teamで「逆方向」の探索が必須
```

##### グラフの種類と探索パターンの基本法則

| グラフの種類 | エッジの性質 | 典型的な探索 | 理由 |
|------------|------------|------------|------|
| **無向グラフ** | 双方向 | 双方向 | エッジ自体が双方向 |
| **通常の有向グラフ** | 単方向 | 単方向 | エッジの方向に従う |
| **双方向グラフ** | 双方向の有向 | 双方向 | 両方向のエッジが存在 |
| **ReBAC（特殊）** | 単方向だが意味は双方向 | 双方向 | 関係の意味論による |

##### 他のグラフ探索との比較

| グラフの種類 | 探索方向 | 理由 |
|------------|---------|------|
| **道路ネットワーク** | 単方向 | 一方通行は一方向のみ |
| **SNSのフォロー** | 単方向 | フォロー関係は非対称 |
| **家系図** | 双方向 | 親子関係は双方向の意味を持つ |
| **ReBAC** | **双方向** | **関係が双方向の意味を持つ** |

##### 具体例での違い

**通常の有向グラフ（Webページのリンク）**:
```
PageA --link--> PageB
// PageAからPageBは辿れるが、逆は辿れない
// BFSは順方向のみ
```

**ReBACの有向グラフ（組織構造）**:
```
alice --manages--> dev-team
// 意味的に2つの事実：
// 1. aliceはdev-teamを管理する（順方向）
// 2. dev-teamはaliceに管理される（逆方向）
// BFSは両方向を探索
```

#### なぜ双方向探索が必要なのか

BFSでは、**任意のノードに到達した際、そのノードに接続されているすべてのエッジを探索**します：

```typescript
// dev-teamに到達した時の完全な探索
function exploreFromDevTeam() {
  // 1. 順方向（dev-teamから出ている関係）
  dev-team --owns--> team-repository
  dev-team --manages--> project-docs  
  dev-team --reports-to--> engineering-dept
  
  // 2. 逆方向（dev-teamへ入ってくる関係）
  alice --manages--> dev-team      // 既に訪問済み（スキップ）
  bob --memberOf--> dev-team       // 新規発見
  charlie --memberOf--> dev-team   // 新規発見
  david --memberOf--> dev-team     // 新規発見
}
```

#### 「Bobが選ばれた」のではなく「発見された」

**重要な誤解の解消**: Bobは特別に選ばれたのではありません。

```typescript
// 実際の発見プロセス
dev-teamのすべてのメンバーを発見:
- bob --memberOf--> dev-team ✅ 発見
- charlie --memberOf--> dev-team ✅ 発見  
- david --memberOf--> dev-team ✅ 発見

すべてがキューに追加される:
queue = [team-repository, project-docs, engineering-dept, bob, charlie, david]

各ノードから順番に探索:
- team-repository → document1なし
- project-docs → document1なし
- engineering-dept → document1なし
- bob → bob --owns--> document1 ✅ 最初に発見！
```

#### 双方向探索の必然性

**組織構造を考えると自然**:

```
alice（マネージャー）
  ↓ manages
dev-team（チーム）
  ↑ memberOf
bob, charlie, david（メンバー）
  ↓ owns
各自のドキュメント
```

**マネージャーはチームメンバーの成果物に権限を持つべき**という組織の自然な構造を、双方向探索が実現しています。

#### グラフ探索の基本ルール

```typescript
class RelationGraph {
  // 双方向のインデックスを保持
  private forwardIndex: Map<EntityId, Set<Relation>>   // A → B
  private reverseIndex: Map<EntityId, Set<Relation>>   // B ← A
  
  getRelatedNodes(node: EntityId): EntityId[] {
    const related = []
    
    // 1. 順方向の関係
    const forward = this.forwardIndex.get(node) || []
    for (const rel of forward) {
      related.push(rel.object)  // node → object
    }
    
    // 2. 逆方向の関係（重要！）
    const reverse = this.reverseIndex.get(node) || []
    for (const rel of reverse) {
      related.push(rel.subject)  // subject → node
    }
    
    return related  // 両方向のノードを返す
  }
}
```

**ポイント**: dev-teamで逆引きする「判断」は実は判断ではなく、**BFSの基本ルール**です。

##### まとめ：双方向探索の本質

**基本パターン**：
- **無向グラフ** → 双方向探索（エッジが双方向だから）
- **有向グラフ** → 単方向探索（エッジが単方向だから）

**例外**：
- **ReBAC** → 有向グラフだが双方向探索（関係の意味論的要求）
- **双方向グラフ** → 各方向に別々のエッジがある場合

つまり、探索方向は「**グラフの構造**」と「**問題の意味論**」の両方で決まります。ReBACでは組織の階層構造や協力関係という意味論上、双方向探索が必須となります。

#### 完全な探索フローの例

より現実的なグラフ構造での探索プロセス：

```typescript
// グラフ構造（より複雑な例）
alice --manages--> dev-team
alice --collaborates--> charlie
dev-team --owns--> team-repository
dev-team --manages--> project-docs
bob --memberOf--> dev-team
charlie --memberOf--> dev-team
david --memberOf--> dev-team
bob --owns--> document1
charlie --owns--> document2

// BFSキューの状態遷移
初期: queue = [alice], visited = [alice]

Level 1:
- aliceを処理
- 順方向：alice --manages--> dev-team, alice --collaborates--> charlie
- 逆方向：なし
- queue = [dev-team, charlie], visited = [alice, dev-team, charlie]

Level 2:
- dev-teamを処理
  - 順方向：dev-team --owns--> team-repository, dev-team --manages--> project-docs
  - 逆方向：bob --memberOf--> dev-team, david --memberOf--> dev-team（charlieは既にvisited）
  - queue = [charlie, team-repository, project-docs, bob, david]
  
- charlieを処理
  - 順方向：charlie --owns--> document2
  - 逆方向：alice --collaborates--> charlie（既にvisited）
  - queue = [team-repository, project-docs, bob, david, document2]

Level 3:
- team-repositoryを処理 → document1なし
- project-docsを処理 → document1なし  
- bobを処理 → bob --owns--> document1 ✅ 発見！

最終結果:
path = [
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

### visitedセットの役割と重要性

#### visitedセットの2つの重要な機能

**1. 無限ループの防止**

```typescript
// 循環がある場合
alice --manages--> dev-team
dev-team --partOf--> dept
dept --oversees--> dev-team  // 循環！

// visitedがなければ：
alice → dev-team → dept → dev-team → dept → ... // 無限ループ

// visitedがあれば：
alice → dev-team → dept → (dev-teamはvisited内) → 停止 ✅
```

**2. 探索の効率化**

```typescript
// 複数経路がある複雑なグラフ
     alice
    /  |  \
   v   v   v
team1 team2 team3
   \   |   /
    v  v  v
      bob
      
// visitedなし: bobを3回探索してしまう（無駄）
// visitedあり: bobは1回だけ探索（効率的） ✅
```

#### なぜ再探索が不要なのか

**BFSの重要な性質**: 最初に到達した経路が最短経路

```typescript
// ケース1: 最初にbobに到達
alice → dev-team → bob (2ホップ) ✅ visitedに追加

// ケース2: 後から別経路でbobを発見  
alice → foo → bar → bob (3ホップ) 
// → bobは既にvisited内なのでスキップ
// → より長い経路なので探索する価値がない！
```

#### visitedセットの動作例

```typescript
// グラフ構造
alice --manages--> dev-team
alice --collaborates--> bob
dev-team <--memberOf-- bob
bob --owns--> document1

// 探索の流れ
Step 1: visited = [alice]
- alice処理中...
- dev-team発見 → visited = [alice, dev-team]
- bob発見 → visited = [alice, dev-team, bob]

Step 2: visited = [alice, dev-team, bob]
- dev-team処理中...
- bob発見（memberOf経由）→ すでにvisited内 → スキップ！

Step 3: visited = [alice, dev-team, bob]
- bob処理中...
- document1発見 → 目標達成！
```

#### 実装でのvisitedタイミング

```typescript
// ✅ 正しい実装（発見時点で追加）
if (!visited.has(node)) {
  visited.add(node)  // キューに入れる前に追加
  queue.push(node)
}

// ❌ 間違った実装（処理時点で追加）
queue.push(node)
// ... 後で
if (!visited.has(node)) {
  visited.add(node)  // 遅すぎる！同じノードが複数回キューに入る
}
```

#### visitedの本質

**visitedが表現すること**:
- 「このノードから出る全ての辺は既に探索済み」を保証
- 再訪問は無駄（BFSでは最初の訪問が最短経路）
- 循環の防止と効率化の両方を実現

```typescript
// foo → bobという経路が見つかっても
// bobは探索済なのでスキップ ✅
if (!visited.has('bob')) {  // bobは既にvisitedに存在
  // このブロックは実行されない
  queue.push('bob')
} 
// → bobはスキップされる！
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

### ReBACの設計の柔軟性

#### 関係性の分類は実装の自由度

**ReBACの本質**: 関係性グラフによる権限導出
**分類の目的**: わかりやすく整理するための設計選択

```typescript
// 例1：カテゴリなし（フラット設計）
type RelationType = string  // 任意の関係を許可
// Zanzibarのような大規模システムでよく採用

// 例2：3カテゴリ（時間軸を追加）
type RelationType = 
  | 'owns' | 'editor' | 'viewer'           // リソース権限
  | 'manages' | 'memberOf'                 // 組織構造
  | 'wasOwner' | 'willBeEditor'           // 時間的関係

// 例3：ドメイン特化型
type RelationType =
  | 'patient' | 'doctor' | 'nurse'        // 医療ドメイン
  | 'hasAccessTo' | 'canPrescribe'        // 権限
  | 'supervisedBy' | 'consultsWith'       // 協力関係
```

#### 実世界での多様なアプローチ

**Google Zanzibar**: 統一的な関係表現
```typescript
// すべての関係を同じように扱う
(user:alice, edit, doc:readme)
(group:editors, member, user:alice)
(doc:readme, parent, folder:documents)
```

**SpiceDB**: スキーマベースの関係定義
```typescript
definition document {
  relation owner: user
  relation editor: user | group#member  // 複合的な関係
  permission edit = owner + editor      // 関係の合成
}
```

**OpenFGA**: 型定義による構造化
```typescript
{
  "type_definitions": [{
    "type": "document",
    "relations": {
      "owner": { "this": {} },
      "can_edit": { "computedUserset": { "relation": "owner" } }
    }
  }]
}
```

#### 設計選択の考慮事項

| 観点 | フラット設計 | カテゴリ分類 |
|------|-------------|-------------|
| **柔軟性** | ✅ 任意の関係を追加可能 | ⚠️ カテゴリの制約あり |
| **型安全性** | ⚠️ 文字列ベース | ✅ Union型で制限 |
| **学習しやすさ** | ⚠️ 概念が曖昧 | ✅ 明確な分類 |
| **スケーラビリティ** | ✅ 制限なし | ⚠️ 拡張時に型変更 |
| **デバッグ性** | ⚠️ 関係の意味が不明確 | ✅ カテゴリで推論可能 |

#### まとめ：設計の本質

**変わらない要素**（ReBACの本質）:
- エンティティ間の関係をグラフで表現
- グラフ探索による推移的権限導出
- 関係から具体的権限への変換ルール

**変わる要素**（実装の自由度）:
- 関係性の分類方法
- タプルの命名規則
- 権限ルールの定義方式

学習用実装では理解しやすさを重視したカテゴリ分類を採用しましたが、実際のシステムでは用途に応じて最適な設計を選択することが重要です。

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