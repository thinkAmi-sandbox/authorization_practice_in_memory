import { describe, test, expect, it } from 'bun:test'
import {
  AccessControlList,
  createPermissionBits,
  PERMISSION_PATTERNS,
  type Entry,
  type Subject,
  type AccessRequest,
  type AccessDecision,
  Resource
} from './acl'

describe('ACL (Access Control List)', () => {
  describe('checkAccess', () => {
    const myUserSubject: Subject = { type: 'user', name: 'my_user' }
    const anotherUserSubject: Subject = { type: 'user', name: 'another_user' }
    const myGroupSubject1: Subject = { type: 'group', name: 'my_group_1' }
    const myGroupSubject2: Subject = { type: 'group', name: 'my_group_2' }
    const anotherGroupSubject: Subject = { type: 'group', name: 'another_user' }

    describe('読み込み権限', () => {
      describe('ユーザーやユーザーが所属するグループに対して、許可や拒否が未設定', () => {
        const anotherEntry: Entry = {
          subject: anotherUserSubject,
          permissions: PERMISSION_PATTERNS.READ_ONLY
        }
        const resource: Resource = { name: 'test.txt', entries: [anotherEntry] }
        const acl = new AccessControlList(resource)

        it('マッチしない', () => {
          const actual = acl.checkAccess({
            subject: { user: 'my_user', groups: ['my_group_1'] },
            action: 'read'
          })
          expect(actual).toEqual({ type: 'no-match' })
        })
      })

      describe('許可のみ設定', () => {
        describe('ユーザーのみ許可', () => {
          const userEntry: Entry = {
            subject: myUserSubject,
            permissions: PERMISSION_PATTERNS.READ_ONLY
          }
          const resource: Resource = { name: 'test.txt', entries: [userEntry] }
          const acl = new AccessControlList(resource)

          it('許可された', () => {
            const actual = acl.checkAccess({
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            })
            expect(actual).toEqual({ type: 'granted', allowEntries: [userEntry] })
          })
        })

        describe('ユーザーが所属するグループの1つで許可', () => {})

        describe('ユーザーが所属するグループのいずれかで許可', () => {})

        describe('ユーザーとユーザーが所属するグループで許可', () => {})
      })

      describe('拒否のみ設定', () => {
        describe('ユーザーのみ拒否', () => {})

        describe('ユーザーが所属するグループのいずれかで拒否', () => {})

        describe('ユーザーが所属する全グループで拒否', () => {})

        describe('ユーザーとユーザーが所属するグループで拒否', () => {})
      })

      describe('許可と拒否が混在', () => {
        describe('同一ユーザーで許可と拒否', () => {})

        describe('ユーザーの所属する同一グループで許可と拒否', () => {})

        describe('ユーザーに許可、ユーザーが所属する複数グループのいずれかで拒否', () => {})

        describe('ユーザーに許可、ユーザーが所属する複数グループで許可と拒否が混在', () => {})

        describe('ユーザーに許可、ユーザーが所属する全グループで拒否', () => {})

        describe('ユーザーに拒否、ユーザーが所属する複数グループのいずれかで許可', () => {})

        describe('ユーザーに拒否、ユーザーが所属する全グループで許可', () => {})
      })

      describe('エッジケース', () => {
        describe('ユーザーが所属グループを持たない', () => {})

        describe('リソースにエントリーが存在しない', () => {})
      })
    })
  })
})
