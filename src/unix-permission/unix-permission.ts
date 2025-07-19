// types
type PermissionBits = {
  read: boolean
  write: boolean
}

type Mode = {
  owner: PermissionBits
  group: PermissionBits
  others: PermissionBits
}

type UnixResource = {
  name: string
  owner: string
  group: string
  permissions: Mode
}

// class
class UnixPermission {
  private resource: UnixResource

  constructor(resource: UnixResource) {
    this.resource = resource
  }

  // 権限設定
  chmod(mode: Mode): boolean
  chown(newOwner: string): boolean
  chgrp(newGroupName: string): boolean

  // 権限チェック（メイン）
  // 注: rootユーザーやsetuid等の特殊ケースは考慮しない
  hasPermission(
    userName: string,
    userGroupNames: string[],
    action: 'read' | 'write'
  ): boolean
}