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
  // テストケースは学習者が実装
  test.todo("should create an ACL instance with a resource")
  
  test.todo("should add an entry to the ACL")
  
  test.todo("should remove an entry from the ACL")
  
  test.todo("should grant access when user has allow entry")
  
  test.todo("should deny access when user has deny entry (Deny優先)")
  
  test.todo("should return no-match when no entries match")
  
  test.todo("should evaluate group permissions")
  
  test.todo("should prioritize deny over allow entries")
})