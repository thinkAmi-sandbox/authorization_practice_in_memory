import {describe, it, expect} from "bun:test";
import {RoleManager, RbacProtectedResource, ROLES, ErrorMessages} from "./rbac";

describe('RBAC (Role-Based Access Control)', () => {
  describe('authorize', () => {
    describe('読み込み権限', () => {
      it.skip('読み込み権限はどのロールでも保有しているため、今回はテストを省略する', () => {
      })
    })

    describe('書き込み権限', () => {
      describe('リソースにロールが割り当てられていない', () => {
        describe('ユーザーにロールが割り当てられていない', () => {
          it('リソースにロールがないため、拒否されること', () => {
            const resource = new RbacProtectedResource('doc1');

            const result = resource.authorize('user1', 'write');

            expect(result).toEqual({
              type: 'denied',
              reason: 'no-roles'
            });
          })
        })

        describe('ユーザーにロールが割り当てられている', () => {
          it('リソースにロールがないため、拒否されること', () => {
            const roleManager = new RoleManager(ROLES);
            roleManager.assignRole('user1', 'editor');
            const resource = new RbacProtectedResource('doc1');

            const result = resource.authorize('user1', 'write');

            expect(result).toEqual({
              type: 'denied',
              reason: 'no-roles'
            });
          })
        })
      })

      describe('リソースに書き込み権限のないロールが割り当てられている', () => {
        const roleManager = new RoleManager(ROLES);
        const requirements = {type: 'any' as const, roles: ['viewer' as const]};

        describe('リソースではいずれかのロールにマッチする必要がある', () => {
          describe('ユーザーはリソースが求めるロールを持っていない', () => {
            it('ユーザーのロールがないため、拒否されること', () => {
              // const roleManager = new RoleManager(ROLES);
              // const requirements = { type: 'any' as const, roles: ['viewer' as const] };
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'no-roles'
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを1つ持っている', () => {
            it('ロールの権限不足のため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'viewer');
              const requirements = {type: 'any' as const, roles: ['viewer' as const, 'auditor' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'insufficient-permissions',
                userRoles: ['viewer']
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを複数持っている', () => {
            it('ロールの権限不足のため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'viewer');
              roleManager.assignRole('user1', 'auditor');
              const requirements = {type: 'any' as const, roles: ['viewer' as const, 'auditor' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'insufficient-permissions',
                userRoles: ['viewer', 'auditor']
              });
            })
          })
        })

        describe('リソースではすべてのロールにマッチする必要がある', () => {
          describe('ユーザーはリソースが求めるロールを持っていない', () => {
            it('ユーザーのロールがないため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              const requirements = {type: 'all' as const, roles: ['viewer' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'no-roles'
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを1つ持っている', () => {
            it('ロールの権限不足のため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'viewer');
              roleManager.assignRole('user1', 'auditor');
              const requirements = {type: 'all' as const, roles: ['viewer' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'insufficient-permissions',
                userRoles: ['viewer']
              });
            })
          })

          describe('ユーザーはリソースが求めるロールをすべて持っている', () => {
            it('ロールの権限不足のため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'viewer');
              roleManager.assignRole('user1', 'auditor');
              const requirements = {type: 'all' as const, roles: ['viewer' as const, 'auditor' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'insufficient-permissions',
                userRoles: ['viewer', 'auditor']
              });
            })
          })
        })
      })

      describe('リソースに書き込み権限があるロールが割り当てられている', () => {
        describe('リソースではいずれかのロールにマッチする必要がある', () => {
          describe('ユーザーはリソースが求めるロールを持っていない', () => {
            it('ユーザーのロールがないため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              const requirements = {type: 'any' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'no-roles'
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを1つ持っている', () => {
            it('許可されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'editor');
              const requirements = {type: 'any' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'granted',
                matchedRoles: ['editor'],
                effectivePermissions: {read: true, write: true}
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを複数持っている', () => {
            it('許可されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'editor');
              roleManager.assignRole('user1', 'admin');
              const requirements = {type: 'any' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'granted',
                matchedRoles: ['editor', 'admin'],
                effectivePermissions: {read: true, write: true}
              });
            })
          })
        })

        describe('リソースではすべてのロールにマッチする必要がある', () => {
          describe('ユーザーはリソースが求めるロールを持っていない', () => {
            it('ユーザーのロールがないため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              const requirements = {type: 'all' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'no-roles'
              });
            })
          })

          describe('ユーザーはリソースが求めるロールを1つ持っている', () => {
            it('ユーザーのロールがないため、拒否されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'editor');
              const requirements = {type: 'all' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'denied',
                reason: 'requirement-not-met',
                details: ErrorMessages.NEED_ALL_ROLES
              });
            })
          })

          describe('ユーザーはリソースが求めるロールをすべて持っている', () => {
            it('許可されること', () => {
              const roleManager = new RoleManager(ROLES);
              roleManager.assignRole('user1', 'editor');
              roleManager.assignRole('user1', 'admin');
              const requirements = {type: 'all' as const, roles: ['editor' as const, 'admin' as const]};
              const resource = new RbacProtectedResource('doc1', roleManager, requirements);

              const result = resource.authorize('user1', 'write');

              expect(result).toEqual({
                type: 'granted',
                matchedRoles: ['editor', 'admin'],
                effectivePermissions: {read: true, write: true}
              });
            })
          })
        })
      })
    })
  })
})