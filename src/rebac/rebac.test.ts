import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_RELATION_PERMISSIONS,
  ReBACProtectedResource,
  RelationGraph,
  RelationshipExplorer,
  type RelationTuple
} from './rebac'

describe('ReBAC (Relationship-Based Access Control)', () => {
  // 1. RelationGraphクラス
  describe('RelationGraph', () => {
    describe('addRelation', () => {
      describe('1つの関係を追加', () => {
        it('隣接リストに追加できること', () => {
          const graph = new RelationGraph()
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          }

          graph.addRelation(relation)

          expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true)
        })
      })

      describe('同一の関係を追加', () => {
        it('隣接リストでは、関係は1つとして扱われること', () => {
          const graph = new RelationGraph()
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          }

          graph.addRelation(relation)
          graph.addRelation(relation)

          const relations = graph.getRelations('user1')
          expect(relations.length).toBe(1)
        })
      })

      describe('同じsubjectとrelationでも異なるobjectを追加', () => {
        it('隣接リストでは、別の関係として扱われること', () => {
          const graph = new RelationGraph()
          const relation1: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc1'
          }
          const relation2: RelationTuple = {
            subject: 'user1',
            relation: 'owns',
            object: 'doc2'
          }

          graph.addRelation(relation1)
          graph.addRelation(relation2)

          const relations = graph.getRelations('user1')
          expect(relations.length).toBe(2)
          expect(relations).toContainEqual(relation1)
          expect(relations).toContainEqual(relation2)
        })
      })
    })

    describe('removeRelation', () => {
      it('存在する関係を削除できること', () => {
        const graph = new RelationGraph()
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        }

        graph.addRelation(relation)
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true)

        graph.removeRelation(relation)
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false)
      })
    })

    describe('hasDirectRelation', () => {
      describe('関係が存在する', () => {
        it('trueを返すこと', () => {
          const graph = new RelationGraph()
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          }

          graph.addRelation(relation)

          expect(graph.hasDirectRelation('user1', 'editor', 'doc1')).toBe(true)
        })
      })

      describe('関係が存在しない', () => {
        it('falseを返すこと', () => {
          const graph = new RelationGraph()

          expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false)
        })
      })
    })

    describe('getRelations', () => {
      it('指定したsubjectの全関係を取得できること', () => {
        const graph = new RelationGraph()
        const relation1: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        }
        const relation2: RelationTuple = {
          subject: 'user1',
          relation: 'editor',
          object: 'doc2'
        }

        graph.addRelation(relation1)
        graph.addRelation(relation2)

        const relations = graph.getRelations('user1')
        expect(relations.length).toBe(2)
        expect(relations).toContainEqual(relation1)
        expect(relations).toContainEqual(relation2)
      })
    })

    describe('clear', () => {
      it('全ての関係を削除できること', () => {
        const graph = new RelationGraph()
        const relation: RelationTuple = {
          subject: 'user1',
          relation: 'owns',
          object: 'doc1'
        }

        graph.addRelation(relation)
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(true)

        graph.clear()
        expect(graph.hasDirectRelation('user1', 'owns', 'doc1')).toBe(false)
        expect(graph.getRelations('user1').length).toBe(0)
      })
    })
  })

  // 2. RelationshipExplorerクラス
  describe('RelationshipExplorer', () => {
    describe('findRelation', () => {
      describe('対象の関係を指定しない', () => {
        it('not-foundを返すこと', () => {
          const graph = new RelationGraph()
          const relation: RelationTuple = {
            subject: 'user1',
            relation: 'editor',
            object: 'doc1'
          }
          graph.addRelation(relation)

          const explorer = new RelationshipExplorer(graph)
          const result = explorer.findRelationPath('user1', 'doc1', new Set([]))

          expect(result).toEqual({
            type: 'not-found'
          })
        })
      })
      describe('関係が存在しない', () => {
        it('not-foundを返すこと', () => {
          const graph = new RelationGraph()
          const explorer = new RelationshipExplorer(graph)
          const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

          expect(result).toEqual({
            type: 'not-found'
          })
        })
      })

      describe('直接関係が存在する', () => {
        describe('対象の関係が1つ', () => {
          it('関係が見つかること', () => {
            const graph = new RelationGraph()
            const relation: RelationTuple = {
              subject: 'user1',
              relation: 'editor',
              object: 'doc1'
            }
            graph.addRelation(relation)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor']))

            expect(result).toEqual({
              type: 'found',
              path: [relation],
              matchedRelation: 'editor'
            })
          })
        })

        describe('対象の関係が複数', () => {
          it('関係が見つかること', () => {
            const graph = new RelationGraph()
            const relation: RelationTuple = {
              subject: 'user1',
              relation: 'viewer',
              object: 'doc1'
            }
            graph.addRelation(relation)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath(
              'user1',
              'doc1',
              new Set(['editor', 'viewer', 'owns'])
            )

            expect(result).toEqual({
              type: 'found',
              path: [relation],
              matchedRelation: 'viewer'
            })
          })
        })
      })

      describe('間接関係が存在する', () => {
        describe('2ホップ', () => {
          it('関係が見つかること', () => {
            const graph = new RelationGraph()
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'editor',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'found',
              path: [relation1, relation2],
              matchedRelation: 'editor'
            })
          })
        })

        describe('3ホップ', () => {
          it('関係が見つかること', () => {
            const graph = new RelationGraph()
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'memberOf',
              object: 'org1'
            }
            const relation3: RelationTuple = {
              subject: 'org1',
              relation: 'owns',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)
            graph.addRelation(relation3)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['owns', 'editor']))

            expect(result).toEqual({
              type: 'found',
              path: [relation1, relation2, relation3],
              matchedRelation: 'owns'
            })
          })
        })
      })

      describe('同一エンティティ(subjectとtargetObjectが同じ)', () => {
        it('not-foundを返すこと', () => {
          const graph = new RelationGraph()
          const explorer = new RelationshipExplorer(graph)

          const result = explorer.findRelationPath('user1', 'user1', new Set(['editor', 'owns']))

          expect(result).toEqual({
            type: 'not-found'
          })
        })
      })

      describe('自己参照の関係', () => {
        it('その関係をパスとして返すこと', () => {
          const graph = new RelationGraph()
          const selfRelation: RelationTuple = {
            subject: 'group1',
            relation: 'manages',
            object: 'group1'
          }
          graph.addRelation(selfRelation)

          const explorer = new RelationshipExplorer(graph)
          const result = explorer.findRelationPath('group1', 'group1', new Set(['manages', 'owns']))

          expect(result).toEqual({
            type: 'found',
            path: [selfRelation],
            matchedRelation: 'manages'
          })
        })
      })

      describe('最短パス保証', () => {
        describe('深さが異なる、条件を満たすパスが複数存在', () => {
          it('最短パスを返すこと', () => {
            const graph = new RelationGraph()

            // 深さ2: editor経由のパス
            graph.addRelation({
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            })
            graph.addRelation({
              subject: 'team1',
              relation: 'editor',
              object: 'doc1'
            })

            // 深さ3: owns経由のパス
            graph.addRelation({
              subject: 'user1',
              relation: 'memberOf',
              object: 'org1'
            })
            graph.addRelation({
              subject: 'org1',
              relation: 'memberOf',
              object: 'team2'
            })
            graph.addRelation({
              subject: 'team2',
              relation: 'owns',
              object: 'doc1'
            })

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'found',
              matchedRelation: 'editor',
              path: [
                { subject: 'user1', relation: 'memberOf', object: 'team1' },
                { subject: 'team1', relation: 'editor', object: 'doc1' }
              ]
            })
          })
        })

        describe('同じ深さで、条件を満たすパスが複数存在', () => {
          it('最初に見つかった関係を返すこと', () => {
            const graph = new RelationGraph()

            // 両方とも距離2、ただし、それぞれ異なる有効なパス
            // パス1: alice → team1 → document (editor経由)
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team1'
            })
            graph.addRelation({
              subject: 'team1',
              relation: 'editor',
              object: 'document'
            })

            // パス2: alice → team2 → document (owns経由)
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team2'
            })
            graph.addRelation({
              subject: 'team2',
              relation: 'owns',
              object: 'document'
            })

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath(
              'alice',
              'document',
              new Set(['editor', 'owns'])
            )

            expect(result).toEqual({
              type: 'found',
              matchedRelation: 'editor',
              path: [
                { subject: 'alice', relation: 'memberOf', object: 'team1' },
                { subject: 'team1', relation: 'editor', object: 'document' }
              ]
            })
          })
        })
      })

      describe('深度制限', () => {
        describe('maxDepth以内の深度で条件を満たすパスが存在', () => {
          it('パスを返すこと', () => {
            const graph = new RelationGraph()
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'editor',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)

            const explorer = new RelationshipExplorer(graph, { maxDepth: 3 })
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'found',
              path: [relation1, relation2],
              matchedRelation: 'editor'
            })
          })
        })

        describe('maxDepthを超えた深度に条件を満たすパスが存在', () => {
          it('max-depth-exceededを返すこと', () => {
            const graph = new RelationGraph()
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'memberOf',
              object: 'org1'
            }
            const relation3: RelationTuple = {
              subject: 'org1',
              relation: 'editor',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)
            graph.addRelation(relation3)

            const explorer = new RelationshipExplorer(graph, { maxDepth: 2 })
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'max-depth-exceeded',
              maxDepth: 2
            })
          })
        })

        describe('maxDepth以内と超過の深度に、それぞれ条件を満たすパスが存在', () => {
          it('maxDepth以内のパスを返すこと', () => {
            const graph = new RelationGraph()

            // 深さ3: owns経由のパス（maxDepthを超える）
            graph.addRelation({
              subject: 'user1',
              relation: 'memberOf',
              object: 'org1'
            })
            graph.addRelation({
              subject: 'org1',
              relation: 'memberOf',
              object: 'team2'
            })
            graph.addRelation({
              subject: 'team2',
              relation: 'owns',
              object: 'doc1'
            })

            // 深さ2: editor経由のパス（maxDepth内）
            graph.addRelation({
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            })
            graph.addRelation({
              subject: 'team1',
              relation: 'editor',
              object: 'doc1'
            })

            const explorer = new RelationshipExplorer(graph, { maxDepth: 2 })
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'found',
              matchedRelation: 'editor',
              path: [
                { subject: 'user1', relation: 'memberOf', object: 'team1' },
                { subject: 'team1', relation: 'editor', object: 'doc1' }
              ]
            })
          })
        })
      })

      describe('循環参照', () => {
        describe('循環参照がある中での直接関係', () => {
          it('無限ループせず、直接関係を探せること', () => {
            const graph = new RelationGraph()
            // 循環参照
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'memberOf',
              object: 'user1'
            }

            // 直接関係
            const relation3: RelationTuple = {
              subject: 'user1',
              relation: 'editor',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)
            graph.addRelation(relation3)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['editor', 'owns']))

            expect(result).toEqual({
              type: 'found',
              path: [relation3],
              matchedRelation: 'editor'
            })
          })
        })

        describe('循環参照がある中での間接関係', () => {
          it('無限ループせず、間接関係を探せること', () => {
            const graph = new RelationGraph()
            // 循環参照
            const cycleRelation1: RelationTuple = {
              subject: 'team1',
              relation: 'memberOf',
              object: 'org1'
            }
            const cycleRelation2: RelationTuple = {
              subject: 'org1',
              relation: 'memberOf',
              object: 'team1'
            }

            // 間接関係
            const validRelation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const validRelation2: RelationTuple = {
              subject: 'team1',
              relation: 'owns',
              object: 'doc1'
            }

            graph.addRelation(cycleRelation1)
            graph.addRelation(cycleRelation2)
            graph.addRelation(validRelation1)
            graph.addRelation(validRelation2)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['owns', 'editor']))

            expect(result).toEqual({
              type: 'found',
              path: [validRelation1, validRelation2],
              matchedRelation: 'owns'
            })
          })
        })
      })

      describe('優先順位', () => {
        describe('複数関係が同時に有効', () => {
          it('最初に見つかった関係が返される', () => {
            const graph = new RelationGraph()

            const ownsRelation: RelationTuple = {
              subject: 'user1',
              relation: 'owns',
              object: 'doc1'
            }
            const editorRelation: RelationTuple = {
              subject: 'user1',
              relation: 'editor',
              object: 'doc1'
            }

            graph.addRelation(ownsRelation)
            graph.addRelation(editorRelation)

            const explorer = new RelationshipExplorer(graph)
            const result = explorer.findRelationPath('user1', 'doc1', new Set(['owns', 'editor']))

            expect(result).toEqual({
              type: 'found',
              path: [ownsRelation],
              matchedRelation: 'owns'
            })
          })
        })
      })
    })
  })

  // 3. ReBACProtectedResourceクラス
  describe('ReBACProtectedResource', () => {
    describe('checkRelation (read権限)', () => {
      it.skip('write権限と同じテストケースなので、今回は省略', () => {})
    })

    describe('checkRelation（write権限）', () => {
      describe('関係性', () => {
        describe('関係なし', () => {
          it('deniedを返し、reasonがno-relationであること', () => {
            const graph = new RelationGraph()
            const resource = new ReBACProtectedResource('doc1', graph)

            const result = resource.checkRelation('user1', 'write')

            expect(result).toMatchObject({
              type: 'denied',
              reason: 'no-relation',
              searchedRelations: expect.arrayContaining(['owns', 'editor'])
            })
          })
        })

        describe('単数の関係', () => {
          describe('直接関係あり', () => {
            it('grantedで、関係が返されること', () => {
              const graph = new RelationGraph()
              const relation: RelationTuple = {
                subject: 'user1',
                relation: 'owns',
                object: 'doc1'
              }
              graph.addRelation(relation)

              const resource = new ReBACProtectedResource('doc1', graph)
              const result = resource.checkRelation('user1', 'write')

              expect(result).toEqual({
                type: 'granted',
                relation: 'owns',
                path: [relation]
              })
            })
          })

          describe('間接関係あり', () => {
            it('grantedで、関係のパスがすべて返されること', () => {
              const graph = new RelationGraph()
              const relation1: RelationTuple = {
                subject: 'manager1',
                relation: 'manages',
                object: 'team1'
              }
              const relation2: RelationTuple = {
                subject: 'team1',
                relation: 'has',
                object: 'user1'
              }
              const relation3: RelationTuple = {
                subject: 'user1',
                relation: 'owns',
                object: 'doc1'
              }

              graph.addRelation(relation1)
              graph.addRelation(relation2)
              graph.addRelation(relation3)

              const resource = new ReBACProtectedResource('doc1', graph)
              const result = resource.checkRelation('manager1', 'write')

              expect(result).toMatchObject({
                type: 'granted',
                relation: 'owns',
                path: expect.arrayContaining([relation1, relation2, relation3])
              })
            })
          })
        })

        describe('複数の関係', () => {
          describe('最短パスの権限はないが、他のパスで権限がある', () => {
            it('grantedと判定されること', () => {
              const graph = new RelationGraph()

              // 最短パスは読み取り
              graph.addRelation({
                subject: 'alice',
                relation: 'viewer',
                object: 'document'
              })

              // 他のパスは書き込み可能
              graph.addRelation({
                subject: 'alice',
                relation: 'memberOf',
                object: 'team'
              })
              graph.addRelation({
                subject: 'team',
                relation: 'editor',
                object: 'document'
              })

              const resource = new ReBACProtectedResource(
                'document',
                graph,
                DEFAULT_RELATION_PERMISSIONS
              )

              const result = resource.checkRelation('alice', 'write')
              expect(result.type).toBe('granted')
            })
          })

          describe('権限なしの関係だけがある', () => {
            it('deniedと判定されること', () => {
              const graph = new RelationGraph()

              graph.addRelation({
                subject: 'alice',
                relation: 'viewer',
                object: 'important-doc'
              })

              graph.addRelation({
                subject: 'alice',
                relation: 'manages',
                object: 'project'
              })
              graph.addRelation({
                subject: 'project',
                relation: 'viewer',
                object: 'important-doc'
              })

              graph.addRelation({
                subject: 'alice',
                relation: 'manages',
                object: 'bob'
              })
              graph.addRelation({
                subject: 'bob',
                relation: 'manages',
                object: 'team'
              })

              graph.addRelation({
                subject: 'team',
                relation: 'viewer',
                object: 'important-doc'
              })

              const resource = new ReBACProtectedResource(
                'important-doc',
                graph,
                DEFAULT_RELATION_PERMISSIONS
              )

              const writeResult = resource.checkRelation('alice', 'write')
              expect(writeResult.type).toBe('denied')
            })
          })
        })

        describe('ダイヤモンド関係', () => {
          /*
           * ダイヤモンド構造:
           *     alice
           *     /    \
           *  team1  team2
           *     \    /
           *    document
           */

          it('権限のある最短パスを返すこと', () => {
            const graph = new RelationGraph()

            // 左側のパス：権限なし
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team1'
            })
            graph.addRelation({
              subject: 'team1',
              relation: 'viewer',
              object: 'document'
            })

            // 右側のパス：権限あり
            graph.addRelation({
              subject: 'alice',
              relation: 'manages',
              object: 'team2'
            })
            graph.addRelation({
              subject: 'team2',
              relation: 'editor',
              object: 'document'
            })

            const resource = new ReBACProtectedResource('document', graph)

            // 右側のパスが返される
            const result = resource.checkRelation('alice', 'write')
            expect(result).toEqual({
              type: 'granted',
              relation: 'editor',
              path: [
                { subject: 'alice', relation: 'manages', object: 'team2' },
                { subject: 'team2', relation: 'editor', object: 'document' }
              ]
            })
          })
        })
      })

      describe('優先度', () => {
        describe('深度の異なる、条件を満たす関係が複数存在', () => {
          it('最短パスの関係を返すこと', () => {
            const graph = new RelationGraph()

            // alice → team → document (チーム経由owns - 距離2)
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team'
            })
            graph.addRelation({
              subject: 'team',
              relation: 'owns',
              object: 'document'
            })

            // alice → document (直接editor - 距離1)
            graph.addRelation({
              subject: 'alice',
              relation: 'editor',
              object: 'document'
            })

            const resource = new ReBACProtectedResource('document', graph)
            const result = resource.checkRelation('alice', 'write')

            expect(result).toEqual({
              type: 'granted',
              relation: 'editor',
              path: [
                {
                  subject: 'alice',
                  relation: 'editor',
                  object: 'document'
                }
              ]
            })
          })
        })

        describe('深度が同じ、条件を満たす関係が複数存在', () => {
          it('最初にgrantedと判定された関係を返すこと', () => {
            const graph = new RelationGraph()

            // パス1: alice → team1 → document (editor経由)
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team1'
            })
            graph.addRelation({
              subject: 'team1',
              relation: 'editor',
              object: 'document'
            })

            // パス2: alice → team2 → document (owns経由)
            graph.addRelation({
              subject: 'alice',
              relation: 'memberOf',
              object: 'team2'
            })
            graph.addRelation({
              subject: 'team2',
              relation: 'owns',
              object: 'document'
            })

            const resource = new ReBACProtectedResource('document', graph)
            const result = resource.checkRelation('alice', 'write')

            expect(result).toEqual({
              type: 'granted',
              relation: 'editor',
              path: [
                { subject: 'alice', relation: 'memberOf', object: 'team1' },
                { subject: 'team1', relation: 'editor', object: 'document' }
              ]
            })
          })
        })
      })

      describe('深度制限', () => {
        describe('深度制限を超える', () => {
          it('deniedで、max-depth-exceededが返る', () => {
            const graph = new RelationGraph()
            const relation1: RelationTuple = {
              subject: 'user1',
              relation: 'memberOf',
              object: 'team1'
            }
            const relation2: RelationTuple = {
              subject: 'team1',
              relation: 'memberOf',
              object: 'org1'
            }
            const relation3: RelationTuple = {
              subject: 'org1',
              relation: 'owns',
              object: 'doc1'
            }

            graph.addRelation(relation1)
            graph.addRelation(relation2)
            graph.addRelation(relation3)

            const resource = new ReBACProtectedResource(
              'doc1',
              graph,
              DEFAULT_RELATION_PERMISSIONS,
              { maxDepth: 2 }
            )
            const result = resource.checkRelation('user1', 'write')

            expect(result).toEqual({
              type: 'denied',
              reason: 'max-depth-exceeded',
              maxDepth: 2
            })
          })
        })
      })
    })

    describe('getRequiredRelations', () => {
      describe('readアクションを指定', () => {
        it('readアクションに必要な関係タイプを返すこと', () => {
          const graph = new RelationGraph()
          const resource = new ReBACProtectedResource('doc1', graph)

          const requiredRelations = resource.getRequiredRelations('read')

          expect(requiredRelations.has('owns')).toBe(true)
          expect(requiredRelations.has('editor')).toBe(true)
          expect(requiredRelations.has('viewer')).toBe(true)
        })
      })

      describe('writeアクションを指定', () => {
        it('writeアクションに必要な関係タイプを返すこと', () => {
          const graph = new RelationGraph()
          const resource = new ReBACProtectedResource('doc1', graph)

          const requiredRelations = resource.getRequiredRelations('write')

          expect(requiredRelations.has('owns')).toBe(true)
          expect(requiredRelations.has('editor')).toBe(true)
          expect(requiredRelations.has('viewer')).toBe(false)
        })
      })
    })
  })
})
