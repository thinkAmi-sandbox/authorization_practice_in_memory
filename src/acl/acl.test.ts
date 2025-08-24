import { describe, expect, it } from 'bun:test'
import {
  AccessControlList,
  type AccessRequest,
  ALLOW_PATTERNS,
  DENY_PATTERNS,
  type Entry,
  type Resource,
  type Subject
} from './acl'

describe('ACL (Access Control List)', () => {
  describe('resolveAccess', () => {
    const myUserSubject: Subject = { type: 'user', name: 'my_user' }
    const anotherUserSubject: Subject = { type: 'user', name: 'another_user' }
    const myGroupSubject1: Subject = { type: 'group', name: 'my_group_1' }
    const myGroupSubject2: Subject = { type: 'group', name: 'my_group_2' }

    describe('読み込み権限', () => {
      describe('ユーザーやユーザーが所属するグループに対して、許可や拒否が未設定', () => {
        it('マッチしないこと', () => {
          const anotherEntry: Entry = {
            type: 'allow',
            subject: anotherUserSubject,
            permissions: ALLOW_PATTERNS.READ_ONLY
          }
          const resource: Resource = { name: 'test.txt', entries: [anotherEntry] }
          const acl = new AccessControlList(resource)
          const request: AccessRequest = {
            subject: { user: 'my_user', groups: ['my_group_1'] },
            action: 'read'
          }

          const actual = acl.resolveAccess(request)

          expect(actual).toEqual({ type: 'no-match' })
        })
      })

      describe('許可のみ設定', () => {
        describe('ユーザーのみ許可', () => {
          it('許可されること', () => {
            const userEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = { name: 'test.txt', entries: [userEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'granted', allowEntries: [userEntry] })
          })
        })

        describe('ユーザーが所属するグループの1つで許可', () => {
          it('許可されること', () => {
            const groupEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = { name: 'test.txt', entries: [groupEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'granted', allowEntries: [groupEntry] })
          })
        })

        describe('ユーザーが所属するグループのいずれかで許可', () => {
          it('許可されること', () => {
            const groupEntry1: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = { name: 'test.txt', entries: [groupEntry1] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'granted', allowEntries: [groupEntry1] })
          })
        })

        describe('ユーザーとユーザーが所属するグループで許可', () => {
          it('許可されること', () => {
            const userEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const groupEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = { name: 'test.txt', entries: [userEntry, groupEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'granted', allowEntries: [userEntry, groupEntry] })
          })
        })
      })

      describe('拒否のみ設定', () => {
        describe('ユーザーのみ拒否', () => {
          it('拒否されること', () => {
            const userEntry: Entry = {
              type: 'deny',
              subject: myUserSubject,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [userEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'denied', allowEntries: [], denyEntry: userEntry })
          })
        })

        describe('ユーザーが所属するグループのいずれかで拒否', () => {
          it('拒否されること', () => {
            const groupEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [groupEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'denied', allowEntries: [], denyEntry: groupEntry })
          })
        })

        describe('ユーザーが所属する全グループで拒否', () => {
          it('拒否されること', () => {
            const groupEntry1: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const groupEntry2: Entry = {
              type: 'deny',
              subject: myGroupSubject2,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [groupEntry1, groupEntry2] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'denied', allowEntries: [], denyEntry: groupEntry1 })
          })
        })

        describe('ユーザーとユーザーが所属するグループで拒否', () => {
          it('拒否されること', () => {
            const userEntry: Entry = {
              type: 'deny',
              subject: myUserSubject,
              permissions: DENY_PATTERNS.READ
            }
            const groupEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [userEntry, groupEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'denied', allowEntries: [], denyEntry: userEntry })
          })
        })
      })

      describe('許可と拒否が混在', () => {
        describe('同一ユーザーで許可と拒否', () => {
          it('拒否が優先されること', () => {
            const allowEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const denyEntry: Entry = {
              type: 'deny',
              subject: myUserSubject,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [allowEntry, denyEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [allowEntry],
              denyEntry: denyEntry
            })
          })
        })

        describe('ユーザーの所属する同一グループで許可と拒否', () => {
          it('拒否が優先されること', () => {
            const allowEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const denyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = { name: 'test.txt', entries: [allowEntry, denyEntry] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [allowEntry],
              denyEntry: denyEntry
            })
          })
        })

        describe('ユーザーに許可、ユーザーが所属する複数グループのいずれかで拒否', () => {
          it('拒否が優先されること', () => {
            const userAllowEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const groupDenyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userAllowEntry, groupDenyEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [userAllowEntry],
              denyEntry: groupDenyEntry
            })
          })
        })

        describe('ユーザーに許可、ユーザーが所属する複数グループで許可と拒否が混在', () => {
          it('拒否が優先されること', () => {
            const userAllowEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const group1AllowEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const group2DenyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject2,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userAllowEntry, group1AllowEntry, group2DenyEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [userAllowEntry, group1AllowEntry],
              denyEntry: group2DenyEntry
            })
          })
        })

        describe('ユーザーに許可、ユーザーが所属する全グループで拒否', () => {
          it('拒否が優先されること', () => {
            const userAllowEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const group1DenyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const group2DenyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject2,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userAllowEntry, group1DenyEntry, group2DenyEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [userAllowEntry],
              denyEntry: group1DenyEntry
            })
          })
        })

        describe('ユーザーに拒否、ユーザーが所属する複数グループのいずれかで許可', () => {
          it('拒否が優先されること', () => {
            const userDenyEntry: Entry = {
              type: 'deny',
              subject: myUserSubject,
              permissions: DENY_PATTERNS.READ
            }
            const groupAllowEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userDenyEntry, groupAllowEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [groupAllowEntry],
              denyEntry: userDenyEntry
            })
          })
        })

        describe('ユーザーに拒否、ユーザーが所属する全グループで許可', () => {
          it('拒否が優先されること', () => {
            const userDenyEntry: Entry = {
              type: 'deny',
              subject: myUserSubject,
              permissions: DENY_PATTERNS.READ
            }
            const group1AllowEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject1,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const group2AllowEntry: Entry = {
              type: 'allow',
              subject: myGroupSubject2,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userDenyEntry, group1AllowEntry, group2AllowEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1', 'my_group_2'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({
              type: 'denied',
              allowEntries: [group1AllowEntry, group2AllowEntry],
              denyEntry: userDenyEntry
            })
          })
        })
      })

      describe('エッジケース', () => {
        describe('ユーザーが所属グループを持たない', () => {
          it('ユーザーエントリーのみで判定されること', () => {
            const userAllowEntry: Entry = {
              type: 'allow',
              subject: myUserSubject,
              permissions: ALLOW_PATTERNS.READ_ONLY
            }
            const groupDenyEntry: Entry = {
              type: 'deny',
              subject: myGroupSubject1,
              permissions: DENY_PATTERNS.READ
            }
            const resource: Resource = {
              name: 'test.txt',
              entries: [userAllowEntry, groupDenyEntry]
            }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: [] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'granted', allowEntries: [userAllowEntry] })
          })
        })

        describe('リソースにエントリーが存在しない', () => {
          it('マッチしないこと', () => {
            const resource: Resource = { name: 'test.txt', entries: [] }
            const acl = new AccessControlList(resource)
            const request: AccessRequest = {
              subject: { user: 'my_user', groups: ['my_group_1'] },
              action: 'read'
            }

            const actual = acl.resolveAccess(request)

            expect(actual).toEqual({ type: 'no-match' })
          })
        })
      })
    })
  })
})
