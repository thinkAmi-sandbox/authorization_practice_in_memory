import {describe, it} from "bun:test";

describe('ABAC (Attribute-Based Access Control)', () => {
  describe('ポリシーが存在しない', () => {
    it('not-applicableと評価され、reasonに「ポリシーが1つも登録されていない」が設定されていること', () => {

    })
  })

  describe('単一ポリシー', () => {
    describe('単純な条件評価', () => {
      describe('Permitポリシーの条件を満たす', () => {
        it('Permitと評価され、appliedRuleに決定を下したポリシーが設定されること', () => {

        })
      })

      describe('Permitポリシーの条件を満たさない', () => {
        it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定され、contextにも値が設定されていること', () => {

        })
      })

      describe('Denyポリシーの条件を満たす', () => {
        it('Denyと評価され、appliedRuleに決定を下したポリシーが設定されること', () => {

        })
      })

      describe('Denyポリシーの条件を満たさない', () => {
        it('not-applicableと評価され、reasonに「Denyポリシーのみ存在し、条件にマッチしない」が設定され、contextにも値が設定されていること', () => {

        })
      })
    })

    describe('属性を使った評価', () => {
      describe('単一カテゴリーのポリシー', () => {
        describe('Subject属性のみ(文字列の確認)', () => {
          describe('departmentで特定の部門を許可', () => {
            describe('許可された部門のユーザー', () => {
              it('Permitと評価されること', () => {

              })
            })

            describe('許可されていない部門のユーザー', () => {
              it('not-applicableと評価されること', () => {

              })
            })
          })
        })

        describe('Resource属性のみ(数値の確認)', () => {
          describe('classificationLevelが3', () => {
            describe('ドキュメントのclassificationLevelが2', () => {
              it('not-applicableと評価されること', () => {

              })
            })

            describe('ドキュメントのclassificationLevelが3', () => {
              it('Permitと評価されること', () => {

              })
            })
          })
        })

        describe('Environment属性のみ(日時の確認)', () => {
          describe('営業時間(09:00:00-17:00:00)以外はアクセスを拒否', () => {
            describe('アクセス時間が08:59:59', () => {
              it('not-applicableと評価されること', () => {

              })
            })

            describe('アクセス時間が09:00:00', () => {
              it('Permitと評価されること', () => {

              })
            })

            describe('アクセス時間が17:00:00', () => {
              it('Permitと評価されること', () => {

              })
            })

            describe('アクセス時間が17:00:01', () => {
              it('not-applicableと評価されること', () => {

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

                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                it('Permitと評価されること', () => {

                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                it('not-applicableと評価されること', () => {

                })
              })
            })

            describe('別部門', () => {
              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも上', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelと同じ', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('SubjectのclearanceLevelがResourceのclassificationLevelよりも下', () => {
                it('not-applicableと評価されること', () => {

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
        it('Permitと評価され、appliedRuleには決定を下した最初のポリシーが設定されること', () => {

        })
      })

      describe('すべての評価がDeny', () => {
        it('Denyと評価され、appliedRuleには決定を下した最初のポリシーが設定されること', () => {

        })
      })

      describe('すべての評価がnot-applicable', () => {
        describe('ポリシーがすべてPermit', () => {
          it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定されていること', () => {

          })
        })

        describe('ポリシーがすべてDeny', () => {
          it('not-applicableと評価され、reasonに「Denyポリシーのみ存在し、条件にマッチしない」が設定されていること', () => {

          })
        })

        describe('ポリシーがPermitとDenyの混在', () => {
          it('not-applicableと評価され、reasonに「Permitポリシーを含む構成で、どの条件にもマッチしない」が設定されていること', () => {

          })
        })
      })
    })

    describe('評価の競合（Deny-Override）', () => {
      describe('評価がPermitとDenyで競合', () => {
        it('Denyと評価され、appliedRuleには決定を下した最初のポリシーが設定されること', () => {

        })
      })

      describe('評価がPermitとnot-applicableで競合', () => {
        it('Permitと評価され、appliedRuleには決定を下した最初のポリシーが設定されること', () => {

        })
      })

      describe('評価がDenyとnot-applicableで競合', () => {
        it('Denyと評価され、appliedRuleには決定を下した最初のポリシーが設定されること', () => {

        })
      })
    })
  })
})