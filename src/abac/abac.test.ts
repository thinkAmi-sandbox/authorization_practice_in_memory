import {describe, expect, it} from "bun:test";
import {EvaluationContext, Rule, RuleEvaluationEngine} from "./abac";

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

function createPermitRule(id: string, condition?: (ctx: EvaluationContext) => boolean): Rule {
  return {
    id,
    effect: 'permit',
    condition: condition || (() => true)
  };
}

function createDenyRule(id: string, condition?: (ctx: EvaluationContext) => boolean): Rule {
  return {
    id,
    effect: 'deny',
    condition: condition || (() => true)
  };
}

describe('ABAC (Attribute-Based Access Control)', () => {
  describe('ルールが存在しない', () => {
    it('not-applicableと判定され、reasonに「ルールが1つも登録されていない」が設定されていること', () => {
      const engine = new RuleEvaluationEngine();
      const context = createDefaultContext();

      const result = engine.evaluate(context);

      expect(result).toEqual({
        type: 'not-applicable',
        reason: 'ルールが1つも登録されていない'
      });
    })
  })

  describe('単一ルール', () => {
    describe('単純な条件評価', () => {
      describe('Permitルールの条件を満たす', () => {
        it('Permitと判定され、appliedRuleにPermitルールが設定されること', () => {
          const engine = new RuleEvaluationEngine();
          const rule = createPermitRule('permit-1', () => true);
          engine.addRule(rule);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'permit',
            appliedRule: rule,
            context: context
          });
        })
      })

      describe('Permitルールの条件を満たさない', () => {
        it('not-applicableと判定され、reasonに「Permitルールを含む構成で、どの条件にもマッチしない」が設定され、contextにも値が設定されていること', () => {
          const engine = new RuleEvaluationEngine();
          const rule = createPermitRule('permit-1', () => false);
          engine.addRule(rule);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'not-applicable',
            reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
          });
        })
      })

      describe('Denyルールの条件を満たす', () => {
        it('Denyと判定され、appliedRuleにDenyルールが設定されること', () => {
          const engine = new RuleEvaluationEngine();
          const rule = createDenyRule('deny-1', () => true);
          engine.addRule(rule);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: rule,
            context: context
          });
        })
      })

      describe('Denyルールの条件を満たさない', () => {
        it('not-applicableと判定され、reasonに「Denyルールのみ存在し、条件にマッチしない」が設定され、contextにも値が設定されていること', () => {
          const engine = new RuleEvaluationEngine();
          const rule = createDenyRule('deny-1', () => false);
          engine.addRule(rule);
          const context = createDefaultContext();

          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'not-applicable',
            reason: 'Denyルールのみ存在し、条件にマッチしない'
          });
        })
      })
    })

    describe('属性を使った評価', () => {
      describe('単一カテゴリーのルール', () => {
        describe('Subject属性のみ(文字列の確認)', () => {
          describe('departmentで特定の部門を許可', () => {
            const engine = new RuleEvaluationEngine();
            const rule = createPermitRule('subject-dept-1', (ctx) =>
              ctx.subject.department === 'engineering'
            );
            engine.addRule(rule);

            describe('許可された部門のユーザー', () => {
              const context = createDefaultContext();
              context.subject.department = context.resource.department;

              it('Permitと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: rule,
                  context: context
                });
              })
            })

            describe('許可されていない部門のユーザー', () => {
              const context = createDefaultContext();
              context.subject.department = 'finance';

              it('not-applicableと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                });
              })
            })
          })
        })

        describe('Resource属性のみ(数値の確認)', () => {
          describe('classificationLevelが3', () => {
            const engine = new RuleEvaluationEngine();
            const rule = createPermitRule('resource-level-1', (ctx) =>
              ctx.resource.classificationLevel === 3
            );
            engine.addRule(rule);

            describe('ドキュメントのclassificationLevelが2', () => {
              const context = createDefaultContext();
              context.resource.classificationLevel = 2;

              it('not-applicableと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                });
              })
            })

            describe('ドキュメントのclassificationLevelが3', () => {
              const context = createDefaultContext();
              context.resource.classificationLevel = 3;

              it('Permitと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: rule,
                  context: context
                });
              })
            })
          })
        })

        describe('Environment属性のみ(日時の確認)', () => {
          describe('営業時間内(09:00:00-17:00:00)のみアクセスを許可', () => {
            const engine = new RuleEvaluationEngine();
            const rule = createPermitRule('business-hours-1', (ctx) => {
              const currentTime = ctx.environment.currentTime;
              const currentSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
              const startSeconds = 9 * 3600;   // 09:00:00
              const endSeconds = 17 * 3600;    // 17:00:00
              return startSeconds <= currentSeconds && currentSeconds <= endSeconds;
            });
            engine.addRule(rule);

            describe('アクセス時間が08:59:59', () => {
              const context = createDefaultContext();
              context.environment.currentTime = new Date('2025-01-01T08:59:59');

              it('not-applicableと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                });
              })
            })

            describe('アクセス時間が09:00:00', () => {
              const context = createDefaultContext();
              context.environment.currentTime = new Date('2025-01-01T09:00:00');

              it('Permitと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: rule,
                  context: context
                });
              })
            })

            describe('アクセス時間が17:00:00', () => {
              const context = createDefaultContext();
              context.environment.currentTime = new Date('2025-01-01T17:00:00');

              it('Permitと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'permit',
                  appliedRule: rule,
                  context: context
                });
              })
            })

            describe('アクセス時間が17:00:01', () => {
              const context = createDefaultContext();
              context.environment.currentTime = new Date('2025-01-01T17:00:01');

              it('not-applicableと判定されること', () => {
                const result = engine.evaluate(context);

                expect(result).toEqual({
                  type: 'not-applicable',
                  reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                });
              })
            })
          })
        })
      })

      describe('複数カテゴリーを組み合わせたルール', () => {
        describe('SubjectとResourceの組み合わせ', () => {
          describe('同一部門かつ、SubjectのclearanceLevelがResourceのclassificationLevel以上で許可と定義したルール', () => {
            const engine = new RuleEvaluationEngine();
            const rule = createPermitRule('dept-clearance-1', (ctx) =>
              ctx.subject.department === ctx.resource.department &&
              ctx.subject.clearanceLevel >= ctx.resource.classificationLevel
            );
            engine.addRule(rule);

            describe('同一部門', () => {
              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも上', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'engineering';
                context.subject.clearanceLevel = 4;
                context.resource.classificationLevel = 3;

                it('Permitと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'permit',
                    appliedRule: rule,
                    context: context
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'engineering';
                context.subject.clearanceLevel = 3;
                context.resource.classificationLevel = 3;

                it('Permitと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'permit',
                    appliedRule: rule,
                    context: context
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'engineering';
                context.subject.clearanceLevel = 2;
                context.resource.classificationLevel = 3;

                it('not-applicableと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                  });
                })
              })
            })

            describe('別部門', () => {
              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも上', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'finance';
                context.subject.clearanceLevel = 4;
                context.resource.classificationLevel = 3;

                it('not-applicableと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'finance';
                context.subject.clearanceLevel = 3;
                context.resource.classificationLevel = 3;

                it('not-applicableと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                  });
                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                const context = createDefaultContext();
                context.subject.department = 'engineering';
                context.resource.department = 'finance';
                context.subject.clearanceLevel = 2;
                context.resource.classificationLevel = 3;

                it('not-applicableと判定されること', () => {
                  const result = engine.evaluate(context);

                  expect(result).toEqual({
                    type: 'not-applicable',
                    reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                  });
                })
              })
            })
          })
        })

        describe('SubjectとResourceとEnvironmentの組み合わせ', () => {
          describe('「同一部門」、もしくは、「locationがofficeでアクセスした人がclearanceLevelが5、actionがread」の場合は許可と定義したルール', () => {
            const engine = new RuleEvaluationEngine();
            const rule = createPermitRule('complex-rule-1', (ctx) => 
              // 同一部門の場合は許可
              (ctx.subject.department === ctx.resource.department) ||
              // もしくは、オフィスからのアクセスで、クリアランスレベル5、読み取り操作の場合は許可
              (ctx.environment.location === 'office' && 
               ctx.subject.clearanceLevel === 5 && 
               ctx.action === 'read')
            );
            engine.addRule(rule);

            describe('同一部門', () => {
              describe('locationがoffice', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 4;
                    context.action = 'read';
                    context.environment.location = 'office';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 4;
                    context.action = 'write';
                    context.environment.location = 'office';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 5;
                    context.action = 'read';
                    context.environment.location = 'office';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 5;
                    context.action = 'write';
                    context.environment.location = 'office';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })
                })
              })

              describe('locationがhome', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 4;
                    context.action = 'read';
                    context.environment.location = 'home';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 4;
                    context.action = 'write';
                    context.environment.location = 'home';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 5;
                    context.action = 'read';
                    context.environment.location = 'home';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'engineering';
                    context.subject.clearanceLevel = 5;
                    context.action = 'write';
                    context.environment.location = 'home';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })
                })
              })
            })

            describe('別部門', () => {
              describe('locationがoffice', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 4;
                    context.action = 'read';
                    context.environment.location = 'office';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 4;
                    context.action = 'write';
                    context.environment.location = 'office';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 5;
                    context.action = 'read';
                    context.environment.location = 'office';

                    it('Permitと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'permit',
                        appliedRule: rule,
                        context: context
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 5;
                    context.action = 'write';
                    context.environment.location = 'office';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })
                })
              })

              describe('locationがhome', () => {
                describe('clearanceLevelが4', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 4;
                    context.action = 'read';
                    context.environment.location = 'home';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 4;
                    context.action = 'write';
                    context.environment.location = 'home';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })
                })

                describe('clearanceLevelが5', () => {
                  describe('actionがread', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 5;
                    context.action = 'read';
                    context.environment.location = 'home';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
                    })
                  })

                  describe('actionがwrite', () => {
                    const context = createDefaultContext();
                    context.subject.department = 'engineering';
                    context.resource.department = 'finance';
                    context.subject.clearanceLevel = 5;
                    context.action = 'write';
                    context.environment.location = 'home';

                    it('not-applicableと判定されること', () => {
                      const result = engine.evaluate(context);

                      expect(result).toEqual({
                        type: 'not-applicable',
                        reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
                      });
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

  describe('複数ルール', () => {
    describe('同一の評価', () => {
      describe('すべての評価がPermit', () => {
        const engine = new RuleEvaluationEngine();
        const rule1 = createPermitRule('permit-1', () => true);
        const rule2 = createPermitRule('permit-2', () => true);
        engine.addRule(rule1);
        engine.addRule(rule2);
        const context = createDefaultContext();

        it('Permitと判定され、appliedRuleには最初のPermitルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'permit',
            appliedRule: rule1,
            context: context
          });
        })
      })

      describe('すべての評価がDeny', () => {
        const engine = new RuleEvaluationEngine();
        const rule1 = createDenyRule('deny-1', () => true);
        const rule2 = createDenyRule('deny-2', () => true);
        engine.addRule(rule1);
        engine.addRule(rule2);
        const context = createDefaultContext();

        it('Denyと判定され、appliedRuleには最初のDenyルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: rule1,
            context: context
          });
        })
      })

      describe('すべての評価がnot-applicable', () => {
        describe('ルールがすべてPermit', () => {
          const engine = new RuleEvaluationEngine();
          const rule1 = createPermitRule('permit-1', () => false);
          const rule2 = createPermitRule('permit-2', () => false);
          engine.addRule(rule1);
          engine.addRule(rule2);
          const context = createDefaultContext();

          it('not-applicableと判定され、reasonに「Permitルールを含む構成で、どの条件にもマッチしない」が設定されていること', () => {
            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
            });
          })
        })

        describe('ルールがすべてDeny', () => {
          const engine = new RuleEvaluationEngine();
          const rule1 = createDenyRule('deny-1', () => false);
          const rule2 = createDenyRule('deny-2', () => false);
          engine.addRule(rule1);
          engine.addRule(rule2);
          const context = createDefaultContext();

          it('not-applicableと判定され、reasonに「Denyルールのみ存在し、条件にマッチしない」が設定されていること', () => {
            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Denyルールのみ存在し、条件にマッチしない'
            });
          })
        })

        describe('ルールがPermitとDenyの混在', () => {
          const engine = new RuleEvaluationEngine();
          const rule1 = createPermitRule('permit-1', () => false);
          const rule2 = createDenyRule('deny-1', () => false);
          engine.addRule(rule1);
          engine.addRule(rule2);
          const context = createDefaultContext();

          it('not-applicableと判定され、reasonに「Permitルールを含む構成で、どの条件にもマッチしない」が設定されていること', () => {
            const result = engine.evaluate(context);

            expect(result).toEqual({
              type: 'not-applicable',
              reason: 'Permitルールを含む構成で、どの条件にもマッチしない'
            });
          })
        })
      })
    })

    describe('評価の競合（Deny-Override）', () => {
      describe('評価がPermitとDenyで競合', () => {
        const engine = new RuleEvaluationEngine();
        const permitRule = createPermitRule('permit-1', () => true);
        const denyRule = createDenyRule('deny-1', () => true);
        engine.addRule(permitRule);
        engine.addRule(denyRule);
        const context = createDefaultContext();

        it('Denyと判定され、appliedRuleにはDenyルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: denyRule,
            context: context
          });
        })
      })

      describe('評価がPermitとnot-applicableで競合', () => {
        const engine = new RuleEvaluationEngine();
        const permitRule = createPermitRule('permit-1', () => true);
        const notApplicablerule = createPermitRule('permit-2', () => false);
        engine.addRule(permitRule);
        engine.addRule(notApplicablerule);
        const context = createDefaultContext();

        it('Permitと判定され、appliedRuleにはPermitルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'permit',
            appliedRule: permitRule,
            context: context
          });
        })
      })

      describe('評価がDenyとnot-applicableで競合', () => {
        const engine = new RuleEvaluationEngine();
        const denyRule = createDenyRule('deny-1', () => true);
        const notApplicablerule = createDenyRule('deny-2', () => false);
        engine.addRule(denyRule);
        engine.addRule(notApplicablerule);
        const context = createDefaultContext();

        it('Denyと判定され、appliedRuleにはDenyルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: denyRule,
            context: context
          });
        })
      })

      describe('評価がPermit、Deny、not-applicableで競合', () => {
        const engine = new RuleEvaluationEngine();
        const permitRule = createPermitRule('permit-1', () => true);
        const denyRule = createDenyRule('deny-1', () => true);
        const notApplicablerule = createPermitRule('permit-2', () => false);
        engine.addRule(permitRule);
        engine.addRule(denyRule);
        engine.addRule(notApplicablerule);
        const context = createDefaultContext();

        it('Denyと判定され、appliedRuleにはDenyルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: denyRule,
            context: context
          });
        })
      })

      describe('評価順がPermit、Deny、Permitで競合', () => {
        const engine = new RuleEvaluationEngine();
        const permitRule1 = createPermitRule('permit-1', () => true);
        const denyRule = createDenyRule('deny-1', () => true);
        const permitRule2 = createPermitRule('permit-2', () => true);
        engine.addRule(permitRule1);
        engine.addRule(denyRule);
        engine.addRule(permitRule2);
        const context = createDefaultContext();

        it('Denyと判定され、appliedRuleにはDenyルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'deny',
            appliedRule: denyRule,
            context: context
          });
        })
      })

      describe('評価順がPermit、not-applicable、Permitで競合', () => {
        const engine = new RuleEvaluationEngine();
        const permitRule1 = createPermitRule('permit-1', () => true);
        const notApplicablerule = createPermitRule('permit-2', () => false);
        const permitRule2 = createPermitRule('permit-3', () => true);
        engine.addRule(permitRule1);
        engine.addRule(notApplicablerule);
        engine.addRule(permitRule2);
        const context = createDefaultContext();

        it('Permitと判定され、appliedRuleには最初のPermitルールが設定されること', () => {
          const result = engine.evaluate(context);

          expect(result).toEqual({
            type: 'permit',
            appliedRule: permitRule1,
            context: context
          });
        })
      })
    })
  })
})