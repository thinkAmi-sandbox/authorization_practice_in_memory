import { describe, it, expect } from 'bun:test'
import { UnixPermission } from './unix-permission'
import type { UnixResource, Mode } from './unix-permission'

describe('UnixPermission', () => {
  describe('hasPermission', () => {
    describe('読み込み権限について', () => {
      describe('ownerのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: true, write: false },
            group: { read: false, write: false },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: true
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: true
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'read')).toBe(expected)
        })
      })

      describe('groupのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: true, write: false },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: true
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: true
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属(ownerの権限が優先されるか確認)',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'read')).toBe(expected)
        })
      })

      describe('othersのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: false, write: false },
            others: { read: true, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: true
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'read')).toBe(expected)
        })
      })

      describe('誰も権限がない', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: false, write: false },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'read')).toBe(expected)
        })
      })
    })

    describe('書き込み権限について', () => {
      describe('ownerのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: true },
            group: { read: false, write: false },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: true
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: true
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'write')).toBe(expected)
        })
      })

      describe('groupのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: false, write: true },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: true
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: true
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属(ownerの権限が優先されるか確認)',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'write')).toBe(expected)
        })
      })

      describe('othersのみ権限がある', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: false, write: false },
            others: { read: false, write: true }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: true
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'write')).toBe(expected)
        })
      })

      describe('誰も権限がない', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'my_user',
          group: 'my_group',
          permissions: {
            owner: { read: false, write: false },
            group: { read: false, write: false },
            others: { read: false, write: false }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'ユーザーがowner',
            userName: 'my_user',
            groupNames: ['another_group'],
            expected: false
          },
          {
            title: 'ユーザーが単一groupに所属',
            userName: 'another_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが複数groupに所属',
            userName: 'another_user',
            groupNames: ['my_group', 'another_group'],
            expected: false
          },
          {
            title: 'ユーザーがowner、かつ、groupに所属',
            userName: 'my_user',
            groupNames: ['my_group'],
            expected: false
          },
          {
            title: 'ユーザーが何も所属していない',
            userName: 'another_user',
            groupNames: ['another_group'],
            expected: false
          }
        ])('$title 時の結果が $expected であること', ({ userName, groupNames, expected }) => {
          expect(permission.hasPermission(userName, groupNames, 'write')).toBe(expected)
        })
      })
    })

    describe('権限の優先順位の確認', () => {
      describe('owner権限が最優先される', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'alice',
          group: 'developers',
          permissions: {
            owner: { read: false, write: false },
            group: { read: true, write: true },
            others: { read: true, write: true }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: '所有者は、groupとothersに権限があってもowner権限が適用される',
            userName: 'alice',
            groupNames: ['developers'],
            action: 'read' as const,
            expected: false
          },
          {
            title: '所有者は、groupとothersに権限があってもowner権限が適用される',
            userName: 'alice',
            groupNames: ['developers'],
            action: 'write' as const,
            expected: false
          }
        ])('$title（$action）', ({ userName, groupNames, action, expected }) => {
          expect(permission.hasPermission(userName, groupNames, action)).toBe(expected)
        })
      })

      describe('group権限がothersより優先される', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'alice',
          group: 'developers',
          permissions: {
            owner: { read: true, write: true },
            group: { read: false, write: false },
            others: { read: true, write: true }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: 'グループメンバーは、othersに権限があってもgroup権限が適用される',
            userName: 'bob',
            groupNames: ['developers'],
            action: 'read' as const,
            expected: false
          },
          {
            title: 'グループメンバーは、othersに権限があってもgroup権限が適用される',
            userName: 'bob',
            groupNames: ['developers'],
            action: 'write' as const,
            expected: false
          }
        ])('$title（$action）', ({ userName, groupNames, action, expected }) => {
          expect(permission.hasPermission(userName, groupNames, action)).toBe(expected)
        })
      })

      describe('優先順位のまとめ: owner > group > others', () => {
        const resource: UnixResource = {
          name: 'test.txt',
          owner: 'alice',
          group: 'developers',
          permissions: {
            owner: { read: true, write: false },
            group: { read: false, write: true },
            others: { read: true, write: true }
          }
        }

        const permission = new UnixPermission(resource)

        it.each([
          {
            title: '所有者aliceは、owner権限のみが適用される',
            userName: 'alice',
            groupNames: ['developers'],
            action: 'read' as const,
            expected: true
          },
          {
            title: '所有者aliceは、owner権限のみが適用される',
            userName: 'alice',
            groupNames: ['developers'],
            action: 'write' as const,
            expected: false
          },
          {
            title: 'グループメンバーbobは、group権限のみが適用される',
            userName: 'bob',
            groupNames: ['developers'],
            action: 'read' as const,
            expected: false
          },
          {
            title: 'グループメンバーbobは、group権限のみが適用される',
            userName: 'bob',
            groupNames: ['developers'],
            action: 'write' as const,
            expected: true
          },
          {
            title: 'どちらでもないcharlieは、others権限が適用される',
            userName: 'charlie',
            groupNames: ['admin'],
            action: 'read' as const,
            expected: true
          },
          {
            title: 'どちらでもないcharlieは、others権限が適用される',
            userName: 'charlie',
            groupNames: ['admin'],
            action: 'write' as const,
            expected: true
          }
        ])(
          '$title（$action）時の結果が $expected であること',
          ({ userName, groupNames, action, expected }) => {
            expect(permission.hasPermission(userName, groupNames, action)).toBe(expected)
          }
        )
      })
    })
  })

  describe('chmod', () => {
    it('権限を変更し、変更後の権限を返す', () => {
      // Arrange
      const initialResource: UnixResource = {
        name: '/home/user/document.txt',
        owner: 'alice',
        group: 'staff',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(initialResource)

      const newMode: Mode = {
        owner: { read: true, write: false },
        group: { read: false, write: false },
        others: { read: true, write: false }
      }

      // Act
      const resultMode = unixPermission.chmod(newMode)

      // Assert
      expect(resultMode).toEqual(newMode)
      expect(resultMode).toEqual({
        owner: { read: true, write: false },
        group: { read: false, write: false },
        others: { read: true, write: false }
      })
    })

    it('すべての権限を削除できる', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/tmp/test.txt',
        owner: 'user',
        group: 'users',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: true },
          others: { read: true, write: true }
        }
      }
      const unixPermission = new UnixPermission(resource)

      const noPermissions: Mode = {
        owner: { read: false, write: false },
        group: { read: false, write: false },
        others: { read: false, write: false }
      }

      // Act
      const resultMode = unixPermission.chmod(noPermissions)

      // Assert
      expect(resultMode).toEqual(noPermissions)
    })

    it('部分的な権限変更を正確に反映する', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/var/log/app.log',
        owner: 'app',
        group: 'admin',
        permissions: {
          owner: { read: false, write: false },
          group: { read: false, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act & Assert: 段階的に権限を変更

      // Step 1: オーナーに読み書き権限を付与
      const mode1 = unixPermission.chmod({
        owner: { read: true, write: true },
        group: { read: false, write: false },
        others: { read: false, write: false }
      })
      expect(mode1.owner).toEqual({ read: true, write: true })
      expect(mode1.group).toEqual({ read: false, write: false })

      // Step 2: グループに読み取り権限を付与
      const mode2 = unixPermission.chmod({
        owner: { read: true, write: true },
        group: { read: true, write: false },
        others: { read: false, write: false }
      })
      expect(mode2.group.read).toBe(true)
      expect(mode2.group.write).toBe(false)

      // Step 3: その他に読み取り権限を付与（典型的なログファイルの権限）
      const mode3 = unixPermission.chmod({
        owner: { read: true, write: true },
        group: { read: true, write: false },
        others: { read: true, write: false }
      })
      expect(mode3).toEqual({
        owner: { read: true, write: true },
        group: { read: true, write: false },
        others: { read: true, write: false }
      })
    })

    it('連続したchmodで権限が正しく上書きされる', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/etc/config',
        owner: 'root',
        group: 'wheel',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: true, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act: 複数回chmodを実行
      const firstMode = unixPermission.chmod({
        owner: { read: false, write: false },
        group: { read: false, write: false },
        others: { read: false, write: false }
      })

      const secondMode = unixPermission.chmod({
        owner: { read: true, write: true },
        group: { read: true, write: true },
        others: { read: true, write: true }
      })

      // Assert: 最後の変更が反映されている
      expect(firstMode).toEqual({
        owner: { read: false, write: false },
        group: { read: false, write: false },
        others: { read: false, write: false }
      })

      expect(secondMode).toEqual({
        owner: { read: true, write: true },
        group: { read: true, write: true },
        others: { read: true, write: true }
      })
    })

    it('実際のUnixコマンドのような権限設定パターンをテスト', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/home/user/script.sh',
        owner: 'user',
        group: 'staff',
        permissions: {
          owner: { read: false, write: false },
          group: { read: false, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act: chmod 644 相当の設定（実行権限がないので読み書きのみ）
      const mode644 = unixPermission.chmod({
        owner: { read: true, write: true }, // 6
        group: { read: true, write: false }, // 4
        others: { read: true, write: false } // 4
      })

      // Assert
      expect(mode644).toEqual({
        owner: { read: true, write: true },
        group: { read: true, write: false },
        others: { read: true, write: false }
      })
    })
  })

  describe('chown', () => {
    it('所有者を変更し、変更後の所有者名を返す', () => {
      // Arrange
      const initialResource: UnixResource = {
        name: '/home/alice/document.txt',
        owner: 'alice',
        group: 'staff',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(initialResource)

      // Act
      const newOwner = unixPermission.chown('bob')

      // Assert
      expect(newOwner).toBe('bob')
    })

    it('rootユーザーに所有権を変更できる', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/etc/config',
        owner: 'user',
        group: 'staff',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: true, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act
      const newOwner = unixPermission.chown('root')

      // Assert
      expect(newOwner).toBe('root')
    })

    it('連続したchownで所有者が正しく更新される', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/tmp/shared.txt',
        owner: 'alice',
        group: 'users',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act & Assert
      const owner1 = unixPermission.chown('bob')
      expect(owner1).toBe('bob')

      const owner2 = unixPermission.chown('charlie')
      expect(owner2).toBe('charlie')

      const owner3 = unixPermission.chown('alice')
      expect(owner3).toBe('alice')
    })

    it('同じ所有者に変更しても正常に動作する', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/home/user/file.txt',
        owner: 'user',
        group: 'users',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act
      const sameOwner = unixPermission.chown('user')

      // Assert
      expect(sameOwner).toBe('user')
    })
  })

  describe('chgrp', () => {
    it('グループを変更し、変更後のグループ名を返す', () => {
      // Arrange
      const initialResource: UnixResource = {
        name: '/home/alice/document.txt',
        owner: 'alice',
        group: 'staff',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(initialResource)

      // Act
      const newGroup = unixPermission.chgrp('developers')

      // Assert
      expect(newGroup).toBe('developers')
    })

    it('wheelグループに変更できる', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/etc/config',
        owner: 'root',
        group: 'staff',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act
      const newGroup = unixPermission.chgrp('wheel')

      // Assert
      expect(newGroup).toBe('wheel')
    })

    it('連続したchgrpでグループが正しく更新される', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/var/log/app.log',
        owner: 'app',
        group: 'logs',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act & Assert
      const group1 = unixPermission.chgrp('admin')
      expect(group1).toBe('admin')

      const group2 = unixPermission.chgrp('operators')
      expect(group2).toBe('operators')

      const group3 = unixPermission.chgrp('logs')
      expect(group3).toBe('logs')
    })

    it('同じグループに変更しても正常に動作する', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/home/user/file.txt',
        owner: 'user',
        group: 'users',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act
      const sameGroup = unixPermission.chgrp('users')

      // Assert
      expect(sameGroup).toBe('users')
    })

    it('chownとchgrpを組み合わせて使用できる', () => {
      // Arrange
      const resource: UnixResource = {
        name: '/project/code.js',
        owner: 'alice',
        group: 'developers',
        permissions: {
          owner: { read: true, write: true },
          group: { read: true, write: false },
          others: { read: false, write: false }
        }
      }
      const unixPermission = new UnixPermission(resource)

      // Act & Assert
      const newOwner = unixPermission.chown('bob')
      expect(newOwner).toBe('bob')

      const newGroup = unixPermission.chgrp('managers')
      expect(newGroup).toBe('managers')

      // 再度変更
      const finalOwner = unixPermission.chown('charlie')
      expect(finalOwner).toBe('charlie')

      const finalGroup = unixPermission.chgrp('admins')
      expect(finalGroup).toBe('admins')
    })
  })
})
