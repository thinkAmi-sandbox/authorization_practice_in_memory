# 初期実装案

権限管理の学習のうち、ACL (Access Control List) を学ぶためのTypeScript実装です。ただし、初期実装案であるため、これから変更していくことを考えています。

```typescript
type Decision = 'allow' | 'deny'

type ACLEntry = {
  subject: string      // user:alice, group:sales, *
  resource: string     // doc1, folder:*, /documents/*
  action: string       // read, write, delete, custom-action
  decision: Decision
}

// class
class AccessControlList {
  // エントリー管理
  addEntry(entry: ACLEntry): void
  removeEntry(entry: ACLEntry): void
  
  // 一括権限設定
  grant(subject: string, resource: string, actions: string[]): void
  revoke(subject: string, resource: string, actions: string[]): void
  
  // 権限チェック（メイン）
  checkPermission(
    subject: string, 
    resource: string, 
    action: string
  ): boolean
  
  // グループ展開
  addUserToGroup(userId: string, groupId: string): void
  getUserGroups(userId: string): string[]
  
  // クエリ機能
  getEntriesForSubject(subject: string): ACLEntry[]
  getEntriesForResource(resource: string): ACLEntry[]
}
```