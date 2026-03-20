import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import type { User } from '../../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export class AuthService {
  constructor(private db: any) {}

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { username, password } = credentials;

    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);

    if (users.length === 0) {
      throw new Error('用户名或密码错误');
    }

    const user = users[0];
    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      throw new Error('用户名或密码错误');
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as unknown as User,
      token,
    };
  }

  async getCurrentUser(userId: number): Promise<User> {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new Error('用户不存在');
    }

    const { passwordHash, ...userWithoutPassword } = users[0];
    return userWithoutPassword as unknown as User;
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (users.length === 0) {
      throw new Error('用户不存在');
    }

    const user = users[0];
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
}
