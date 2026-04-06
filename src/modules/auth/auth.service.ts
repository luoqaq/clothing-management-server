import { eq, ne } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import type { User } from '../../types';
import { isAdminRole, normalizeRole } from '../../utils/role';
import { formatDateTime } from '../../utils/date';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export interface UserListItem {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'sales';
  createdAt: string;
}

export interface CreateSalesUserPayload {
  username: string;
  password: string;
  name?: string;
}

export interface UpdateSalesUserPayload {
  username?: string;
  password?: string;
  name?: string;
}

export class AuthService {
  constructor(private db: any) {}

  private sanitizeUser(user: any): User {
    const { passwordHash, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      role: normalizeRole(user.role),
    } as User;
  }

  private toUserListItem(user: any): UserListItem {
    return {
      id: Number(user.id),
      username: user.username,
      name: user.name,
      role: normalizeRole(user.role),
      createdAt: formatDateTime(user.createdAt) ?? '',
    };
  }

  private async findUserByUsername(username: string) {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username));

    return users[0] ?? null;
  }

  private async findUserById(userId: number) {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    return users[0] ?? null;
  }

  private async ensureUsernameAvailable(username: string, excludeUserId?: number) {
    const users = excludeUserId
      ? await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.username, username))
      : await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.username, username));

    const existingUser = users[0] ?? null;

    if (!existingUser) {
      return;
    }

    if (excludeUserId && Number(existingUser.id) === excludeUserId) {
      return;
    }

    throw new Error('用户名已存在');
  }

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { username, password } = credentials;

    const user = await this.findUserByUsername(username);

    if (!user) {
      throw new Error('输入的用户名或密码有误，请检查后重试');
    }

    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      throw new Error('输入的用户名或密码有误，请检查后重试');
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async getCurrentUser(userId: number): Promise<User> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    const passwordValid = await comparePassword(oldPassword, user.passwordHash);

    if (!passwordValid) {
      throw new Error('旧密码错误');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await this.db
      .update(schema.users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(schema.users.id, userId));
  }

  async listSalesUsers(): Promise<UserListItem[]> {
    const users = await this.db.select().from(schema.users).where(ne(schema.users.role, 'admin'));
    return users.map((user: any) => this.toUserListItem(user));
  }

  async createSalesUser(payload: CreateSalesUserPayload): Promise<UserListItem> {
    await this.ensureUsernameAvailable(payload.username);

    const passwordHash = await hashPassword(payload.password);
    const insertResult = await this.db
      .insert(schema.users)
      .values({
        username: payload.username,
        passwordHash,
        name: payload.name?.trim() || payload.username,
        role: 'sales',
      })
      .$returningId();

    const insertedId = insertResult[0]?.id;
    if (!insertedId) {
      throw new Error('创建销售账号失败');
    }

    const created = await this.findUserById(Number(insertedId));
    if (!created) {
      throw new Error('创建销售账号失败');
    }

    return this.toUserListItem(created);
  }

  async updateSalesUser(userId: number, payload: UpdateSalesUserPayload): Promise<UserListItem> {
    const user = await this.findUserById(userId);

    if (!user) {
      throw new Error('用户不存在');
    }

    if (isAdminRole(user.role)) {
      throw new Error('管理员账号不允许在此处修改');
    }

    if (payload.username) {
      await this.ensureUsernameAvailable(payload.username, userId);
    }

    const updates: Record<string, unknown> = {};

    if (payload.username) updates.username = payload.username;
    if (payload.name !== undefined) updates.name = payload.name.trim() || (payload.username ?? user.username);
    if (payload.password) updates.passwordHash = await hashPassword(payload.password);

    await this.db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId));

    const updated = await this.findUserById(userId);
    if (!updated) {
      throw new Error('用户不存在');
    }

    return this.toUserListItem(updated);
  }
}
