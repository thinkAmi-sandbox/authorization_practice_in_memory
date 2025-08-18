import {describe, it, expect, beforeEach} from "bun:test";
import {
  RelationGraph,
  RelationshipExplorer,
  ReBACProtectedResource,
  RelationType,
  RelationTuple,
  DEFAULT_CONFIG,
  DEFAULT_PERMISSION_RULES
} from "./rebac";

describe('ReBAC (Relationship-Based Access Control)', () => {
  // 1. RelationGraphクラス（約150行）
  describe('RelationGraph', () => {
    describe('addRelation', () => {
      it('関係を追加できること', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        
        graph.addRelation(relation);
        
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true);
        // 逆方向インデックスも更新されることを確認
        expect(graph.getReverseRelations('doc1', 'owns')).toContainEqual(relation);
      })

      it('同じ関係を重複追加しても1つとして扱われること', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        
        graph.addRelation(relation);
        graph.addRelation(relation);
        
        const relations = graph.getRelations('user1');
        expect(relations.length).toBe(1);
        // 逆方向インデックスも重複しないことを確認
        const reverseRelations = graph.getReverseRelations('doc1');
        expect(reverseRelations.length).toBe(1);
      })
      it('同じsubjectとrelationでも異なるobjectは別の関係として扱われること', () => {
        const graph = new RelationGraph();
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        const relation2: RelationTuple = {
          subject: 'user1',
          relation: 'owns', 
          object: 'doc2'
        };
        
        graph.addRelation(relation1);
        graph.addRelation(relation2);
        
        const relations = graph.getRelations('user1', 'owns');
        expect(relations.length).toBe(2);
        expect(relations).toContainEqual(relation1);
        expect(relations).toContainEqual(relation2);
        
        // 逆方向インデックスにも正しく追加されることを確認
        expect(graph.getReverseRelations('doc1', 'owns')).toContainEqual(relation1);
        expect(graph.getReverseRelations('doc2', 'owns')).toContainEqual(relation2);
      })
    })
    
    describe('removeRelation', () => {
      it('存在する関係を削除できること', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        
        graph.addRelation(relation);
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true);
        expect(graph.getReverseRelations('doc1', 'owns')).toContainEqual(relation);
        
        graph.removeRelation(relation);
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false);
        // 逆方向インデックスからも削除されることを確認
        expect(graph.getReverseRelations('doc1', 'owns')).not.toContainEqual(relation);
      })
    })
    
    describe('hasDirectRelation', () => {
      it('存在する直接関係に対してtrueを返すこと', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'editor',
          object: 'doc1'
        };
        
        graph.addRelation(relation);
        
        expect(graph.hasDirectRelation('user1', 'editor', 'doc1')).toBe(true);
      })
      it('存在しない関係に対してfalseを返すこと', () => {
        const graph = new RelationGraph();
        
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false);
      })
    })
    
    describe('getRelations', () => {
      it('指定したsubjectの全関係を取得できること', () => {
        const graph = new RelationGraph();
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        const relation2: RelationTuple = {
          subject: 'user1',
          relation: 'editor',
          object: 'doc2'
        };
        
        graph.addRelation(relation1);
        graph.addRelation(relation2);
        
        const relations = graph.getRelations('user1');
        expect(relations.length).toBe(2);
        expect(relations).toContainEqual(relation1);
        expect(relations).toContainEqual(relation2);
      })
      it('関係タイプで絞り込めること', () => {
        const graph = new RelationGraph();
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        const relation2: RelationTuple = {
          subject: 'user1',
          relation: 'editor',
          object: 'doc2'
        };
        
        graph.addRelation(relation1);
        graph.addRelation(relation2);
        
        const ownsRelations = graph.getRelations('user1', 'owns');
        expect(ownsRelations.length).toBe(1);
        expect(ownsRelations[0]).toEqual(relation1);
      })
    })
    
    describe('getReverseRelations', () => {
      it('指定したobjectへの全関係を取得できること', () => {
        const graph = new RelationGraph();
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        const relation2: RelationTuple = {
          subject: 'user2',
          relation: 'editor',
          object: 'doc1'
        };
        
        graph.addRelation(relation1);
        graph.addRelation(relation2);
        
        const reverseRelations = graph.getReverseRelations('doc1');
        expect(reverseRelations.length).toBe(2);
        expect(reverseRelations).toContainEqual(relation1);
        expect(reverseRelations).toContainEqual(relation2);
      })
      it('関係タイプで絞り込めること', () => {
        const graph = new RelationGraph();
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        const relation2: RelationTuple = {
          subject: 'user2',
          relation: 'editor',
          object: 'doc1'
        };
        
        graph.addRelation(relation1);
        graph.addRelation(relation2);
        
        const ownsRelations = graph.getReverseRelations('doc1', 'owns');
        expect(ownsRelations.length).toBe(1);
        expect(ownsRelations[0]).toEqual(relation1);
      })
    })
    
    describe('clear', () => {
      it('全ての関係を削除できること', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        
        graph.addRelation(relation);
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true);
        expect(graph.getReverseRelations('doc1').length).toBe(1);
        
        graph.clear();
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false);
        expect(graph.getRelations('user1').length).toBe(0);
        // 逆方向インデックスもクリアされることを確認
        expect(graph.getReverseRelations('doc1').length).toBe(0);
      })
    })
  })

  // 2. RelationshipExplorerクラス（約300行）
  describe('RelationshipExplorer', () => {
    describe('findRelationPath', () => {
      describe('基本的な探索', () => {
        it('直接関係（1ホップ）のパスを返すこと', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation]
          });
        })
        it('間接関係（2ホップ）のパスを返すこと', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation1, relation2]
          });
        })
        it('間接関係（3ホップ）のパスを返すこと', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'org1'
          };
          const relation3: RelationTuple = {
            subject: 'org1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation1, relation2, relation3]
          });
        })
        it('関係が存在しない場合not-foundを返すこと', () => {
          const graph = new RelationGraph();
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'not-found'
          });
        })
      })
      
      describe('同一エンティティの探索', () => {
        it('subjectとtargetObjectが同じ場合、空のパスを返すこと', () => {
          const graph = new RelationGraph();
          const explorer = new RelationshipExplorer(graph);
          
          const result = explorer.findRelationPath('user1', 'user1');
          
          expect(result).toEqual({
            type: 'found',
            path: []
          });
        })
        
        it('自己参照の関係がある場合でも空のパスを返すこと', () => {
          const graph = new RelationGraph();
          // 自己参照の関係を追加
          graph.addRelation({
            subject: 'group1',
            relation: 'manages',
            object: 'group1'
          });
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('group1', 'group1');
          
          expect(result).toEqual({
            type: 'found',
            path: []
          });
        })
      })
      
      describe('最短パス保証', () => {
        it('複数パスが存在する場合、最短パスを返すこと', () => {
          const graph = new RelationGraph();
          // 短いパス（1ホップ）
          const directRelation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          // 長いパス（2ホップ）
          const indirectRelation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const indirectRelation2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(directRelation);
          graph.addRelation(indirectRelation1);
          graph.addRelation(indirectRelation2);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [directRelation]
          });
        })
      })
      
      describe('深度制限', () => {
        it('maxDepth内で見つかればパスを返すこと', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const explorer = new RelationshipExplorer(graph, { maxDepth: 3 });
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation1, relation2]
          });
        })
        it('maxDepthを超える場合max-depth-exceededを返すこと', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'org1'
          };
          const relation3: RelationTuple = {
            subject: 'org1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const explorer = new RelationshipExplorer(graph, { maxDepth: 2 });
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'max-depth-exceeded',
            maxDepth: 2
          });
        })
      })
      
      describe('循環参照', () => {
        it('循環があっても無限ループしないこと', () => {
          const graph = new RelationGraph();
          // 循環参照を作成
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'user1'
          };
          const relation3: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findRelationPath('user1', 'doc1');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation3]
          });
        })
      })
    })
  })

  // 3. ReBACProtectedResourceクラス（約400行）
  describe('ReBACProtectedResource', () => {
    describe('checkRelation (read権限)', () => {
      describe('関係性なし', () => {
        it('deniedを返し、reasonがno-relationであること', () => {
          const graph = new RelationGraph();
          const resource = new ReBACProtectedResource('doc1', graph);
          
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toMatchObject({
            type: 'denied',
            reason: 'no-relation',
            searchedRelations: expect.arrayContaining(['owns', 'editor', 'viewer'])
          });
        })
      })
      
      describe('直接関係', () => {
        it('owns関係で読み取り可能', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'owns',
            path: [relation]
          });
        })
        it('editor関係で読み取り可能', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [relation]
          });
        })
        it('viewer関係で読み取り可能', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'viewer',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'viewer',
            path: [relation]
          });
        })
      })
      
      describe('推移的な権限導出', () => {
        it('ユーザー→チーム→ドキュメントで読み取り可能', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [relation1, relation2]
          });
        })
        it('マネージャー→チーム→メンバー→ドキュメントで読み取り可能', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'manager1',
            relation: 'manages',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'user1'
          };
          const relation3: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('manager1', 'read');
          
          expect(result).toMatchObject({
            type: 'granted',
            relation: 'owns',
            path: expect.arrayContaining([relation1, relation2, relation3])
          });
        })
      })
      
      describe('深度制限の影響', () => {
        it('深度制限を超える場合、max-depth-exceededで拒否', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'org1'
          };
          const relation3: RelationTuple = {
            subject: 'org1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const resource = new ReBACProtectedResource('doc1', graph, DEFAULT_PERMISSION_RULES, { maxDepth: 2 });
          const result = resource.checkRelation('user1', 'read');
          
          expect(result).toEqual({
            type: 'denied',
            reason: 'max-depth-exceeded',
            maxDepth: 2
          });
        })
      })
    })
    
    describe('checkRelation (write権限)', () => {
      describe('関係性なし', () => {
        it('deniedを返し、reasonがno-relationであること', () => {
          const graph = new RelationGraph();
          const resource = new ReBACProtectedResource('doc1', graph);
          
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toMatchObject({
            type: 'denied',
            reason: 'no-relation',
            searchedRelations: expect.arrayContaining(['owns', 'editor'])
          });
        })
      })
      
      describe('直接関係', () => {
        it('owns関係で書き込み可能', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'owns',
            path: [relation]
          });
        })
        it('editor関係で書き込み可能', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [relation]
          });
        })
        it('viewer関係で書き込み不可（権限の違いを学習）', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'viewer',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toMatchObject({
            type: 'denied',
            reason: 'no-relation',
            searchedRelations: expect.arrayContaining(['owns', 'editor'])
          });
        })
      })
      
      describe('推移的な権限導出', () => {
        it('ユーザー→チーム→ドキュメントで書き込み可能', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [relation1, relation2]
          });
        })
        it('マネージャー→チーム→メンバー→ドキュメントで書き込み可能', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'manager1',
            relation: 'manages',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'user1'
          };
          const relation3: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('manager1', 'write');
          
          expect(result).toMatchObject({
            type: 'granted',
            relation: 'owns',
            path: expect.arrayContaining([relation1, relation2, relation3])
          });
        })
        it('パスの各ステップが正しく記録されること', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const resource = new ReBACProtectedResource('doc1', graph);
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toEqual({
            type: 'granted',
            relation: 'owns',
            path: [relation1, relation2]
          });
        })
      })
      
      describe('深度制限の影響', () => {
        it('深度制限を超える場合、max-depth-exceededで拒否', () => {
          const graph = new RelationGraph();
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const relation2: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'org1'
          };
          const relation3: RelationTuple = {
            subject: 'org1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const resource = new ReBACProtectedResource('doc1', graph, DEFAULT_PERMISSION_RULES, { maxDepth: 2 });
          const result = resource.checkRelation('user1', 'write');
          
          expect(result).toEqual({
            type: 'denied',
            reason: 'max-depth-exceeded',
            maxDepth: 2
          });
        })
      })
    })
    
    describe('getRequiredRelations', () => {
      it('writeアクションに必要な関係タイプを返すこと', () => {
        const graph = new RelationGraph();
        const resource = new ReBACProtectedResource('doc1', graph);
        
        const requiredRelations = resource.getRequiredRelations('write');
        
        expect(requiredRelations).toContain('owns');
        expect(requiredRelations).toContain('editor');
        expect(requiredRelations).not.toContain('viewer');
      })
      it('readアクションに必要な関係タイプを返すこと', () => {
        const graph = new RelationGraph();
        const resource = new ReBACProtectedResource('doc1', graph);
        
        const requiredRelations = resource.getRequiredRelations('read');
        
        expect(requiredRelations).toContain('owns');
        expect(requiredRelations).toContain('editor');
        expect(requiredRelations).toContain('viewer');
      })
    })
    
    describe('explainAccess', () => {
      it('各アクションに対する権限判定のマップを返すこと', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        };
        graph.addRelation(relation);
        
        const resource = new ReBACProtectedResource('doc1', graph);
        const accessMap = resource.explainAccess('user1');
        
        expect(accessMap.has('read')).toBe(true);
        expect(accessMap.has('write')).toBe(true);
        
        expect(accessMap.get('read')).toMatchObject({
          type: 'granted'
        });
        expect(accessMap.get('write')).toMatchObject({
          type: 'granted'
        });
      })
      it('複数のアクションで異なる判定結果を返すこと', () => {
        const graph = new RelationGraph();
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'viewer',
          object: 'doc1'
        };
        graph.addRelation(relation);
        
        const resource = new ReBACProtectedResource('doc1', graph);
        const accessMap = resource.explainAccess('user1');
        
        expect(accessMap.get('read')).toMatchObject({
          type: 'granted'
        });
        expect(accessMap.get('write')).toMatchObject({
          type: 'denied'
        });
      })
    })
  })
})