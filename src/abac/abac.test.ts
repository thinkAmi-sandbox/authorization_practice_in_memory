import {describe, it} from "bun:test";

describe('ABAC (Attribute-Based Access Control)', () => {
  describe('単純な条件評価', () => {
    describe('条件を満たすPermitポリシー', () => {
      it('Permitと評価されること', () => {

      })
    })

    describe('条件を満たさないPermitポリシー', () => {
      it('not-applicableと評価されること', () => {

      })
    })

    describe('条件を満たすDenyポリシー', () => {
      it('Denyと評価されること', () => {

      })
    })

    describe('条件を満たさないPermitポリシー', () => {
      it('not-applicableと評価されること', () => {

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
        describe('同一部門、もしくは、locationがofficeでアクセスした人がclearanceLevelが5の場合は許可と定義したポリシー', () => {
          describe('同一部門', () => {
            describe('locationがoffice', () => {
              describe('clearanceLevelが4', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('clearanceLevelが5', () => {
                it('Permitと評価されること', () => {

                })
              })
            })

            describe('locationがhome', () => {
              describe('clearanceLevelが4', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('clearanceLevelが5', () => {
                it('not-applicableと評価されること', () => {

                })
              })
            })
          })

          describe('別部門', () => {
            describe('locationがoffice', () => {
              describe('clearanceLevelが4', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('clearanceLevelが5', () => {
                it('not-applicableと評価されること', () => {

                })
              })
            })

            describe('locationがhome', () => {
              describe('clearanceLevelが4', () => {
                it('not-applicableと評価されること', () => {

                })
              })

              describe('clearanceLevelが5', () => {
                it('not-applicableと評価されること', () => {

                })
              })
            })
          })
        })
      })
    })
  })

  describe('評価の競合（Deny-Override）', () => {
    describe('評価がPermitとDenyで競合', () => {
      it('Denyと評価されること', () => {

      })
    })

    describe('評価がPermitとnot-applicableで競合', () => {
      it('Permitと評価されること', () => {

      })
    })

    describe('評価がDenyとnot-applicableで競合', () => {
      it('Denyと評価されること', () => {

      })
    })
  })
})