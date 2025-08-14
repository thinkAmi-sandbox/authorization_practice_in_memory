import {describe, expect, it} from "bun:test";
import {
  PolicyEvaluationEngine,
  PolicyRule,
  EvaluationContext,
  PolicyDecision,
  PermissionAction,
  Department,
  SecurityLevel,
  Location,
  SubjectAttributes,
  ResourceAttributes,
  EnvironmentAttributes
} from "./abac";

// テストヘルパー関数
function createDefaultContext(): EvaluationContext {
  return {
    subject: {
      userName: 'defaultUser',
      department: 'engineering',
      clearanceLevel: 3
    },
    resource: {
      documentName: 'defaultDoc',
      department: 'engineering',
      classificationLevel: 2
    },
    action: 'read',
    environment: {
      currentTime: new Date('2025-01-01T10:00:00'),
      location: 'office'
    }
  };
}

function createPermitPolicy(id: string, condition?: (ctx: EvaluationContext) => boolean): PolicyRule {
  return {
    id,
    effect: 'permit',
    condition: condition || (() => true)
  };
}

function createDenyPolicy(id: string, condition?: (ctx: EvaluationContext) => boolean): PolicyRule {
  return {
    id,
    effect: 'deny',
    condition: condition || (() => true)
  };
}

describe('ABAC (Attribute-Based Access Control)', () => {
  describe('ポリシーが存在しない', () => {
    it('not-applicableと評価され、reasonに「ポリシーが1つも登録されていない」が設定されていること', () => {
      const engine = new PolicyEvaluationEngine();
      const context = createDefaultContext();

      const result = engine.evaluate(context);

      expect(result).toEqual({
        type: 'not-applicable',
        reason: 'ポリシーが1つも登録されていない'
      });
    })
  })

  describe('単一ポリシー', () => {
    describe('単純な条件評価', () => {
      describe('Permitポリシーの条件を満たす', () => {
        it('Permitと評価され、appliedRuleにPermitポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy = createPermitPolicy('permit-1', () => true);
          engine.addPolicy(policy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'permit',
            appliedRule: policy,
            context: context
          });
        })
      })

      describe('Permitポリシーの条件を満たさない', () => {
        it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定され、contextにも値が設定されていること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy = createPermitPolicy('permit-1', () => false);
          engine.addPolicy(policy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'not-applicable',
            reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
          });
        })
      })

      describe('Denyポリシーの条件を満たす', () => {
        it('Denyと評価され、appliedRuleにDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy = createDenyPolicy('deny-1', () => true);
          engine.addPolicy(policy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: policy,
            context: context
          });
        })
      })

      describe('Denyポリシーの条件を満たさない', () => {
        it('not-applicableと評価され、reasonに「Denyポリシーのみ存在し、条件にマッチしない」が設定され、contextにも値が設定されていること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy = createDenyPolicy('deny-1', () => false);
          engine.addPolicy(policy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'not-applicable',
            reason: 'Denyポリシーのみ存在し、条件にマッチしない'
          });
        })
      })
    })

    describe('属性を使った評価', () => {
      describe('単一カテゴリーのポリシー', () => {
        describe('Subject属性のみ(文字列の確認)', () => {
          describe('departmentで特定の部門を許可', () => {
            describe('許可された部門のユーザー', () => {
              it('Permitと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('subject-dept-1', (ctx) =>
                  ctx.subject.department === 'engineering'
                );
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.subject.department = 'engineering';

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: policy,
                  context: context
                });
              })
            })

            describe('許可されていない部門のユーザー', () => {
              it('not-applicableと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('subject-dept-1', (ctx) =>
                  ctx.subject.department === 'engineering'
                );
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.subject.department = 'finance';

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                });
              })
            })
          })
        })

        describe('Resource属性のみ(数値の確認)', () => {
          describe('classificationLevelが3', () => {
            describe('ドキュメントのclassificationLevelが2', () => {
              it('not-applicableと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('resource-level-1', (ctx) => 
                  ctx.resource.classificationLevel === 3
                );
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.resource.classificationLevel = 2;

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                });
              })
            })

            describe('ドキュメントのclassificationLevelが3', () => {
              it('Permitと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('resource-level-1', (ctx) => 
                  ctx.resource.classificationLevel === 3
                );
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.resource.classificationLevel = 3;

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: policy,
                  context: context
                });
              })
            })
          })
        })

        describe('Environment属性のみ(日時の確認)', () => {
          describe('営業時間(09:00:00-17:00:00)以外はアクセスを拒否', () => {
            describe('アクセス時間が08:59:59', () => {
              it('not-applicableと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('business-hours-1', (ctx) => {
                  const hour = ctx.environment.currentTime.getHours();
                  return hour >= 9 && hour <= 17;
                });
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.environment.currentTime = new Date('2025-01-01T08:59:59');

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                });
              })
            })

            describe('アクセス時間が09:00:00', () => {
              it('Permitと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('business-hours-1', (ctx) => {
                  const hour = ctx.environment.currentTime.getHours();
                  return hour >= 9 && hour <= 17;
                });
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.environment.currentTime = new Date('2025-01-01T09:00:00');

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: policy,
                  context: context
                });
              })
            })

            describe('アクセス時間が17:00:00', () => {
              it('Permitと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('business-hours-1', (ctx) => {
                  const hour = ctx.environment.currentTime.getHours();
                  return hour >= 9 && hour <= 17;
                });
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.environment.currentTime = new Date('2025-01-01T17:00:00');

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: policy,
                  context: context
                });
              })
            })

            describe('アクセス時間が17:00:01', () => {
              it('not-applicableと評価されること', () => {
                const engine = new PolicyEvaluationEngine();
                const policy = createPermitPolicy('business-hours-1', (ctx) => {
                  const hour = ctx.environment.currentTime.getHours();
                  return hour >= 9 && hour <= 17;
                });
                engine.addPolicy(policy);
                const context = createDefaultContext();
                context.environment.currentTime = new Date('2025-01-01T17:00:01');

                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                });
              })
            })
          })
        })
      })

      describe('複数カテゴリーを組み合わせたポリシー', () => {
        describe('SubjectとResourceの組み合わせ', () => {
          describe('同一部門かつ、SubjectのclearanceLevelがResourceのclassificationLevel以上で許可と定義したポリシー', () => {
            describe('同一部門', () => {
              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも上', () => {
                it('Permitと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'engineering';
                  context.subject.clearanceLevel = 4;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'permit',
                    appliedRule: policy,
                    context: context
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                it('Permitと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'engineering';
                  context.subject.clearanceLevel = 3;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'permit',
                    appliedRule: policy,
                    context: context
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                it('not-applicableと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'engineering';
                  context.subject.clearanceLevel = 2;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                  });
                })
              })
            })

            describe('別部門', () => {
              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも上', () => {
                it('not-applicableと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'finance';
                  context.subject.clearanceLevel = 4;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                it('not-applicableと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'finance';
                  context.subject.clearanceLevel = 3;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                it('not-applicableと評価されること', () => {
                  const engine = new PolicyEvaluationEngine();
                  const policy = createPermitPolicy('dept-clearance-1', (ctx) => 
                    ctx.subject.department === ctx.resource.department &&
                    ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
                  );
                  engine.addPolicy(policy);
                  const context = createDefaultContext();
                  context.subject.department = 'engineering';
                  context.resource.department = 'finance';
                  context.subject.clearanceLevel = 2;
                  context.resource.classificationLevel = 3;

                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
                  });
                })
              })
            })
          })
        })

        describe('SubjectとResourceとEnvironmentの組み合わせ', () => {
          describe('「同一部門」、もしくは、「locationがofficeでアクセスした人がclearanceLevelが5、actionがread」の場合は許可と定義したポリシー', () => {
            describe('同一部門', () => {
              describe('locationがoffice', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    it('Permitと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('Permitと評価されること', () => {

                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    it('Permitと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('Permitと評価されること', () => {

                    })
                  })
                })
              })

              describe('locationがhome', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    it('Permitと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('Permitと評価されること', () => {

                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    it('Permitと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('Permitと評価されること', () => {

                    })
                  })
                })
              })
            })

            describe('別部門', () => {
              describe('locationがoffice', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    it('Permitと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })
                })
              })

              describe('locationがhome', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })

                  describe('actionがwrite', () => {
                    it('not-applicableと評価されること', () => {

                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  describe('複数ポリシー', () => {
    describe('同一の評価', () => {
      describe('すべての評価がPermit', () => {
        it('Permitと評価され、appliedRuleにはPermitポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy1 = createPermitPolicy('permit-1', () => true);
          const policy2 = createPermitPolicy('permit-2', () => true);
          engine.addPolicy(policy1);
          engine.addPolicy(policy2);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('permit');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('すべての評価がDeny', () => {
        it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const policy1 = createDenyPolicy('deny-1', () => true);
          const policy2 = createDenyPolicy('deny-2', () => true);
          engine.addPolicy(policy1);
          engine.addPolicy(policy2);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('deny');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('すべての評価がnot-applicable', () => {
        describe('ポリシーがすべてPermit', () => {
          it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定されていること', () => {
            const engine = new PolicyEvaluationEngine();
            const policy1 = createPermitPolicy('permit-1', () => false);
            const policy2 = createPermitPolicy('permit-2', () => false);
            engine.addPolicy(policy1);
            engine.addPolicy(policy2);
            const context = createDefaultContext();

            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
            });
          })
        })

        describe('ポリシーがすべてDeny', () => {
          it('not-applicableと評価され、reasonに「Denyポリシーのみ存在し、条件にマッチしない」が設定されていること', () => {
            const engine = new PolicyEvaluationEngine();
            const policy1 = createDenyPolicy('deny-1', () => false);
            const policy2 = createDenyPolicy('deny-2', () => false);
            engine.addPolicy(policy1);
            engine.addPolicy(policy2);
            const context = createDefaultContext();

            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Denyポリシーのみ存在し、条件にマッチしない'
            });
          })
        })

        describe('ポリシーがPermitとDenyの混在', () => {
          it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定されていること', () => {
            const engine = new PolicyEvaluationEngine();
            const policy1 = createPermitPolicy('permit-1', () => false);
            const policy2 = createDenyPolicy('deny-1', () => false);
            engine.addPolicy(policy1);
            engine.addPolicy(policy2);
            const context = createDefaultContext();

            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Permitポリシーを含む構成で、どの条件にもマッチしない'
            });
          })
        })
      })
    })

    describe('評価の競合（Deny-Override）', () => {
      describe('評価がPermitとDenyで競合', () => {
        it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const permitPolicy = createPermitPolicy('permit-1', () => true);
          const denyPolicy = createDenyPolicy('deny-1', () => true);
          engine.addPolicy(permitPolicy);
          engine.addPolicy(denyPolicy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('deny');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('評価がPermitとnot-applicableで競合', () => {
        it('Permitと評価され、appliedRuleにはPermitポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const permitPolicy = createPermitPolicy('permit-1', () => true);
          const notApplicablePolicy = createPermitPolicy('permit-2', () => false);
          engine.addPolicy(permitPolicy);
          engine.addPolicy(notApplicablePolicy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('permit');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('評価がDenyとnot-applicableで競合', () => {
        it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const denyPolicy = createDenyPolicy('deny-1', () => true);
          const notApplicablePolicy = createDenyPolicy('deny-2', () => false);
          engine.addPolicy(denyPolicy);
          engine.addPolicy(notApplicablePolicy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('deny');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('評価がPermit、Deny、not-applicableで競合', () => {
        it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const permitPolicy = createPermitPolicy('permit-1', () => true);
          const denyPolicy = createDenyPolicy('deny-1', () => true);
          const notApplicablePolicy = createPermitPolicy('permit-2', () => false);
          engine.addPolicy(permitPolicy);
          engine.addPolicy(denyPolicy);
          engine.addPolicy(notApplicablePolicy);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('deny');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('評価順がPermit、Deny、Permitで競合', () => {
        it('Denyと評価され、appliedRuleにはDenyポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const permitPolicy1 = createPermitPolicy('permit-1', () => true);
          const denyPolicy = createDenyPolicy('deny-1', () => true);
          const permitPolicy2 = createPermitPolicy('permit-2', () => true);
          engine.addPolicy(permitPolicy1);
          engine.addPolicy(denyPolicy);
          engine.addPolicy(permitPolicy2);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('deny');
          expect(result).toHaveProperty('appliedRule');
          expect(result).toHaveProperty('context');
        })
      })

      describe('評価順がPermit、not-applicable、Permitで競合', () => {
        it('Permitと評価され、appliedRuleには最初のPermitポリシーが設定されること', () => {
          const engine = new PolicyEvaluationEngine();
          const permitPolicy1 = createPermitPolicy('permit-1', () => true);
          const notApplicablePolicy = createPermitPolicy('permit-2', () => false);
          const permitPolicy2 = createPermitPolicy('permit-3', () => true);
          engine.addPolicy(permitPolicy1);
          engine.addPolicy(notApplicablePolicy);
          engine.addPolicy(permitPolicy2);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result.type).toBe('permit');
          if (result.type === 'permit') {
            expect(result.appliedRule.id).toBe('permit-1');
          }
          expect(result).toHaveProperty('context');
        })
      })
    })
  })
})