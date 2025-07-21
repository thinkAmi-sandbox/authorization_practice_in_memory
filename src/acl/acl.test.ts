import { describe, test, expect } from "bun:test"
import {
  AccessControlList,
  createPermissionBits,
  PERMISSION_PATTERNS,
  type Entry,
  type Subject,
  type AccessRequest,
  type AccessDecision,
} from "./acl"

describe("ACL (Access Control List)", () => {
  describe("checkAccess", () => {
    describe('読み込み権限', () => {
      describe('ユーザーやユーザーが所属するグループに対して、許可や拒否が未設定', () => {

      })

      describe('許可のみ設定', () => {
        describe('ユーザーのみ許可', () => {

        })

        describe('ユーザーが所属するグループの1つで許可', () => {

        })

        describe('ユーザーが所属するグループのいずれかで許可', () => {

        })

        describe('ユーザーとユーザーが所属するグループで許可', () => {

        })
      })

      describe('拒否のみ設定', () => {
        describe('ユーザーのみ拒否', () => {

        })

        describe('ユーザーが所属するグループのいずれかで拒否', () => {

        })

        describe('ユーザーが所属する全グループで拒否', () => {

        })

        describe('ユーザーとユーザーが所属するグループで拒否', () => {

        })
      })

      describe('許可と拒否が混在', () => {
        describe('同一ユーザーで許可と拒否', () => {

        })

        describe('ユーザーの所属する同一グループで許可と拒否', () => {

        })

        describe('ユーザーに許可、ユーザーが所属する複数グループのいずれかで拒否', () => {

        })

        describe('ユーザーに許可、ユーザーが所属する複数グループで許可と拒否が混在', () => {

        })

        describe('ユーザーに許可、ユーザーが所属する全グループで拒否', () => {

        })

        describe('ユーザーに拒否、ユーザーが所属する複数グループのいずれかで許可', () => {

        })

        describe('ユーザーに拒否、ユーザーが所属する全グループで許可', () => {

        })
      })

      describe('エッジケース', () => {
        describe('ユーザーが所属グループを持たない', () => {

        })

        describe('リソースにエントリーが存在しない', () => {

        })
      })
    })
  })
})