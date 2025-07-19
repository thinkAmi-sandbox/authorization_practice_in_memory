// types
export type PermissionBits = {
  read: boolean
  write: boolean
}

export type Mode = {
  owner: PermissionBits
  group: PermissionBits
  others: PermissionBits
}

export type UnixResource = {
  name: string
  owner: string
  group: string
  permissions: Mode
}

// class
export class UnixPermission {
  private resource: UnixResource

  constructor(resource: UnixResource) {
    this.resource = resource
  }

  // 権限設定
  chmod(mode: Mode): Mode {
    this.resource.permissions = mode
    return mode
  }

  chown(newOwner: string): string {
    this.resource.owner = newOwner
    return newOwner
  }

  chgrp(newGroupName: string): string {
    this.resource.group = newGroupName
    return newGroupName
  }

  // 権限チェック（メイン）
  // 注: rootユーザーやsetuid等の特殊ケースは考慮しない
  hasPermission(
    userName: string,
    userGroupNames: string[],
    action: 'read' | 'write'
  ): boolean {
    return true
  }
}