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

    describe('findPathWithRelation', () => {
      describe('基本的な探索', () => {
        it('直接関係（指定関係タイプ）のパスを返すこと', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation]
          });
        })
        it('直接関係（異なる関係タイプ）では見つからないこと', () => {
          const graph = new RelationGraph();
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'viewer',
            object: 'doc1'
          };
          graph.addRelation(relation);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
          expect(result).toEqual({
            type: 'not-found'
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
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
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
          const result = explorer.findPathWithRelation('user1', 'doc1', 'owns');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation1, relation2, relation3]
          });
        })
        it('関係が存在しない場合not-foundを返すこと', () => {
          const graph = new RelationGraph();
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
          expect(result).toEqual({
            type: 'not-found'
          });
        })
      })
      
      describe('同一エンティティの探索', () => {
        it('subjectとtargetObjectが同じ場合、not-foundを返すこと', () => {
          const graph = new RelationGraph();
          const explorer = new RelationshipExplorer(graph);
          
          const result = explorer.findPathWithRelation('user1', 'user1', 'editor');
          
          expect(result).toEqual({
            type: 'not-found'
          });
        })
        
        it('自己参照の関係がある場合、その関係をパスとして返すこと', () => {
          const graph = new RelationGraph();
          // 自己参照の関係を追加
          const selfRelation: RelationTuple = {
            subject: 'group1',
            relation: 'manages',
            object: 'group1'
          };
          graph.addRelation(selfRelation);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('group1', 'group1', 'manages');
          
          expect(result).toEqual({
            type: 'found',
            path: [selfRelation]
          });
        })
      })
      
      describe('最短パス保証', () => {
        it('指定関係タイプの直接関係を優先すること', () => {
          const graph = new RelationGraph();
          // 短いパス（1ホップ）: 指定関係タイプの直接関係
          const directRelation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          };
          // 長いパス（2ホップ）: 他の関係を経由
          const indirectRelation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const indirectRelation2: RelationTuple = {
            subject: 'team1',
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(directRelation);
          graph.addRelation(indirectRelation1);
          graph.addRelation(indirectRelation2);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
          expect(result).toEqual({
            type: 'found',
            path: [directRelation]
          });
        })
        
        it('複数の間接パスが存在する場合、最短パスを返すこと', () => {
          const graph = new RelationGraph();
          // 短いパス（2ホップ）
          const shortPath1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const shortPath2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          // 長いパス（3ホップ）
          const longPath1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'org1'
          };
          const longPath2: RelationTuple = {
            subject: 'org1',
            relation: 'memberOf',
            object: 'team2'
          };
          const longPath3: RelationTuple = {
            subject: 'team2',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(shortPath1);
          graph.addRelation(shortPath2);
          graph.addRelation(longPath1);
          graph.addRelation(longPath2);
          graph.addRelation(longPath3);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'owns');
          
          expect(result).toEqual({
            type: 'found',
            path: [shortPath1, shortPath2]
          });
        })
      })
      
      describe('深度制限', () => {
        it('maxDepth内で指定関係タイプのパスが見つかればパスを返すこと', () => {
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
          
          const explorer = new RelationshipExplorer(graph, { maxDepth: 3 });
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
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
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const explorer = new RelationshipExplorer(graph, { maxDepth: 2 });
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
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
            relation: 'editor',
            object: 'doc1'
          };
          
          graph.addRelation(relation1);
          graph.addRelation(relation2);
          graph.addRelation(relation3);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'editor');
          
          expect(result).toEqual({
            type: 'found',
            path: [relation3]
          });
        })
        
        it('循環参照がある場合でも間接的なパスを正しく見つけること', () => {
          const graph = new RelationGraph();
          // 循環参照を作成
          const cycleRelation1: RelationTuple = {
            subject: 'team1',
            relation: 'memberOf',
            object: 'org1'
          };
          const cycleRelation2: RelationTuple = {
            subject: 'org1',
            relation: 'memberOf',
            object: 'team1'
          };
          // 有効なパス
          const validRelation1: RelationTuple = {
            subject: 'user1',
            relation: 'memberOf',
            object: 'team1'
          };
          const validRelation2: RelationTuple = {
            subject: 'team1',
            relation: 'owns',
            object: 'doc1'
          };
          
          graph.addRelation(cycleRelation1);
          graph.addRelation(cycleRelation2);
          graph.addRelation(validRelation1);
          graph.addRelation(validRelation2);
          
          const explorer = new RelationshipExplorer(graph);
          const result = explorer.findPathWithRelation('user1', 'doc1', 'owns');
          
          expect(result).toEqual({
            type: 'found',
            path: [validRelation1, validRelation2]
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
            relation: 'has',
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

    describe('checkRelation（write権限）', () => {
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
            relation: 'has',
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

          // パスにowns関係が含まれているため、ownsが権限を付与した必要関係性となる
          expect(result).toEqual({
            type: 'granted',
            relation: 'owns', // パスに含まれる必要関係性（ownsがwrite権限を持つため）
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

      describe('viewerの最短パスが存在するが、write権限が必要な場合', () => {
        it('権限があると判定されること', () => {
          const graph = new RelationGraph();

          // alice → document への最短パス（距離1）: viewer関係
          graph.addRelation({
            subject: 'alice',
            relation: 'viewer',  // 読み取り専用
            object: 'document'
          });

          // alice → team → document の長いパス（距離2）: editor関係
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team'
          });
          graph.addRelation({
            subject: 'team',
            relation: 'editor',  // 読み書き可能
            object: 'document'
          });

          // リソースを作成
          const resource = new ReBACProtectedResource(
            'document',
            graph,
            DEFAULT_PERMISSION_RULES
          );

          const result = resource.checkRelation('alice', 'write');
          expect(result.type).toBe('granted');
        })
      });

      describe('複数の関係パスがある場合の優先順位', () => {
        it('権限があると判定されること', () => {
          const graph = new RelationGraph();

          // パス1: alice → document (直接viewer - 距離1)
          graph.addRelation({
            subject: 'alice',
            relation: 'viewer',
            object: 'important-doc'
          });

          // パス2: alice → project → important-doc (manages経由 - 距離2)
          graph.addRelation({
            subject: 'alice',
            relation: 'manages',
            object: 'project'
          });
          graph.addRelation({
            subject: 'project',
            relation: 'owns',
            object: 'important-doc'
          });

          const resource = new ReBACProtectedResource(
            'important-doc',
            graph,
            DEFAULT_PERMISSION_RULES
          );

          const writeResult = resource.checkRelation('alice', 'write');
          expect(writeResult.type).toBe('granted');

          const readResult = resource.checkRelation('alice', 'read');
          expect(readResult.type).toBe('granted');
        })

        it('viewerの権限しかないのでwriteの権限がないと判定されること', () => {
          const graph = new RelationGraph();

          // パス1: alice → document (直接viewer - 距離1)
          graph.addRelation({
            subject: 'alice',
            relation: 'viewer',
            object: 'important-doc'
          });

          // パス2: alice → project → important-doc (manages経由 - 距離2)
          graph.addRelation({
            subject: 'alice',
            relation: 'manages',
            object: 'project'
          });
          graph.addRelation({
            subject: 'project',
            relation: 'viewer',
            object: 'important-doc'
          });

          // パス3: alice → team → project → important-doc (manages経由 - 距離3)
          graph.addRelation({
            subject: 'alice',
            relation: 'manages',
            object: 'bob'
          });
          graph.addRelation({
            subject: 'bob',
            relation: 'manages',
            object: 'team'
          });

          graph.addRelation({
            subject: 'team',
            relation: 'viewer',
            object: 'important-doc'
          });

          const resource = new ReBACProtectedResource(
            'important-doc',
            graph,
            DEFAULT_PERMISSION_RULES
          );

          const writeResult = resource.checkRelation('alice', 'write');
          expect(writeResult.type).toBe('denied');

          const readResult = resource.checkRelation('alice', 'read');
          expect(readResult.type).toBe('granted');
        })
      });

      describe('複数の有効な権限関係が同時に存在する場合', () => {
        it('直接editor関係とチーム経由のowns関係が両方ある場合、最初に見つかった関係を返すこと', () => {
          const graph = new RelationGraph();
          
          // パス1: alice → document (直接editor - 距離1)
          graph.addRelation({
            subject: 'alice',
            relation: 'editor',  // write権限あり
            object: 'document'
          });
          
          // パス2: alice → team → document (チーム経由owns - 距離2)
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team'
          });
          graph.addRelation({
            subject: 'team',
            relation: 'owns',  // write権限あり
            object: 'document'
          });
          
          const resource = new ReBACProtectedResource('document', graph);
          const result = resource.checkRelation('alice', 'write');
          
          // 両方の関係がwrite権限を持つが、最短パス（editor）が優先される
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',  // 直接関係が優先
            path: [{
              subject: 'alice',
              relation: 'editor',
              object: 'document'
            }]
          });
        });

        it('同じ深さで複数の有効な関係がある場合、最初にチェックされた関係を返すこと', () => {
          const graph = new RelationGraph();
          
          // 両方とも距離2、ただし、それぞれ異なる有効なパス
          // パス1: alice → team1 → document (editor経由)
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team1'
          });
          graph.addRelation({
            subject: 'team1',
            relation: 'editor',
            object: 'document'
          });
          
          // パス2: alice → team2 → document (owns経由)
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team2'
          });
          graph.addRelation({
            subject: 'team2',
            relation: 'owns',
            object: 'document'
          });
          
          const resource = new ReBACProtectedResource('document', graph);
          const result = resource.checkRelation('alice', 'write');

          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [
              { subject: 'alice', relation: 'memberOf', object: 'team1' },
              { subject: 'team1', relation: 'editor', object: 'document' }
            ]
          });
        });
      });

      describe('複雑なグラフ構造での探索', () => {
        it('中間ノードから複数のパスが分岐する場合でも正しく探索すること', () => {
          const graph = new RelationGraph();
          
          // alice → team → 複数のドキュメントへ分岐
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team'
          });
          
          // teamから複数のドキュメントへの異なる関係
          graph.addRelation({
            subject: 'team',
            relation: 'viewer',
            object: 'doc1'
          });
          graph.addRelation({
            subject: 'team',
            relation: 'editor',
            object: 'doc2'
          });
          graph.addRelation({
            subject: 'team',
            relation: 'owns',
            object: 'doc3'
          });
          
          // 追加の複雑さ: teamからorgへの関係もある
          graph.addRelation({
            subject: 'team',
            relation: 'memberOf',
            object: 'org'
          });
          graph.addRelation({
            subject: 'org',
            relation: 'owns',
            object: 'doc4'
          });
          
          const resource2 = new ReBACProtectedResource('doc2', graph);
          const resource3 = new ReBACProtectedResource('doc3', graph);
          const resource4 = new ReBACProtectedResource('doc4', graph);
          
          // doc2へのwrite権限（editor経由）
          const result2 = resource2.checkRelation('alice', 'write');
          expect(result2).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [
              { subject: 'alice', relation: 'memberOf', object: 'team' },
              { subject: 'team', relation: 'editor', object: 'doc2' }
            ]
          });
          
          // doc3へのwrite権限（owns経由）
          const result3 = resource3.checkRelation('alice', 'write');
          expect(result3).toEqual({
            type: 'granted',
            relation: 'owns',
            path: [
              { subject: 'alice', relation: 'memberOf', object: 'team' },
              { subject: 'team', relation: 'owns', object: 'doc3' }
            ]
          });
          
          // doc4への3ホップのパス
          const result4 = resource4.checkRelation('alice', 'write');
          expect(result4).toEqual({
            type: 'granted',
            relation: 'owns',
            path: [
              { subject: 'alice', relation: 'memberOf', object: 'team' },
              { subject: 'team', relation: 'memberOf', object: 'org' },
              { subject: 'org', relation: 'owns', object: 'doc4' }
            ]
          });
        });

        it('異なる深さで同じ権限タイプが見つかる場合、最短のものを選択すること', () => {
          const graph = new RelationGraph();
          
          // 深さ1: viewer権限のみ
          graph.addRelation({
            subject: 'alice',
            relation: 'viewer',
            object: 'document'
          });
          
          // 深さ2: viewer権限（別経路）
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team1'
          });
          graph.addRelation({
            subject: 'team1',
            relation: 'viewer',
            object: 'document'
          });
          
          // 深さ3: editor権限（write可能）
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'org'
          });
          graph.addRelation({
            subject: 'org',
            relation: 'memberOf',
            object: 'team2'
          });
          graph.addRelation({
            subject: 'team2',
            relation: 'editor',
            object: 'document'
          });
          
          const resource = new ReBACProtectedResource('document', graph);
          
          // read権限: 最短のviewer（深さ1）が使われる
          const readResult = resource.checkRelation('alice', 'read');
          expect(readResult).toEqual({
            type: 'granted',
            relation: 'viewer',
            path: [{
              subject: 'alice',
              relation: 'viewer',
              object: 'document'
            }]
          });
          
          // write権限: viewerでは不十分なので、深さ3のeditorが見つかる
          const writeResult = resource.checkRelation('alice', 'write');
          expect(writeResult).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [
              { subject: 'alice', relation: 'memberOf', object: 'org' },
              { subject: 'org', relation: 'memberOf', object: 'team2' },
              { subject: 'team2', relation: 'editor', object: 'document' }
            ]
          });
        });

        it('ダイヤモンド型のグラフ構造でも正しく最短パスを見つけること', () => {
          const graph = new RelationGraph();
          
          /*
           * ダイヤモンド構造:
           *     alice
           *     /    \
           *  team1  team2
           *     \    /
           *    document
           */
          
          // 左側のパス: alice → team1 → document (viewer)
          graph.addRelation({
            subject: 'alice',
            relation: 'memberOf',
            object: 'team1'
          });
          graph.addRelation({
            subject: 'team1',
            relation: 'viewer',
            object: 'document'
          });
          
          // 右側のパス: alice → team2 → document (editor)
          graph.addRelation({
            subject: 'alice',
            relation: 'manages',
            object: 'team2'
          });
          graph.addRelation({
            subject: 'team2',
            relation: 'editor',
            object: 'document'
          });
          
          const resource = new ReBACProtectedResource('document', graph);
          
          // write権限をチェック - editor関係を持つパスが選ばれる
          const result = resource.checkRelation('alice', 'write');
          expect(result).toEqual({
            type: 'granted',
            relation: 'editor',
            path: [
              { subject: 'alice', relation: 'manages', object: 'team2' },
              { subject: 'team2', relation: 'editor', object: 'document' }
            ]
          });
        });
      });
    })
    
    describe('getRequiredRelations', () => {
      it('writeアクションに必要な関係タイプを返すこと', () => {
        const graph = new RelationGraph();
        const resource = new ReBACProtectedResource('doc1', graph);
        
        const requiredRelations = resource.getRequiredRelations('write');
        
        expect(requiredRelations.has('owns')).toBe(true);
        expect(requiredRelations.has('editor')).toBe(true);
        expect(requiredRelations.has('viewer')).toBe(false);
      })
      it('readアクションに必要な関係タイプを返すこと', () => {
        const graph = new RelationGraph();
        const resource = new ReBACProtectedResource('doc1', graph);
        
        const requiredRelations = resource.getRequiredRelations('read');
        
        expect(requiredRelations.has('owns')).toBe(true);
        expect(requiredRelations.has('editor')).toBe(true);
        expect(requiredRelations.has('viewer')).toBe(true);
      })
    })
  })
})