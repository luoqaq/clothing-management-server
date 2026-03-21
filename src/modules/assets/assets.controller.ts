import type { Context } from 'hono';
import { uploadPolicySchema } from './assets.schema';
import { AssetsService } from './assets.service';
import { error, success } from '../../utils/response';
import { logger } from '../../utils/logger';

export class AssetsController {
  private service = new AssetsService();

  async createUploadPolicy(c: Context) {
    try {
      const payload = uploadPolicySchema.parse(await c.req.json());
      const user = c.get('user');

      if (!user?.userId) {
        return c.json(error('用户信息不存在'), 401);
      }

      const result = await this.service.createUploadPolicy(payload, Number(user.userId));
      return c.json(success(result));
    } catch (err: any) {
      logger.error('Create upload policy error:', err);
      return c.json(error(err.message || '获取上传凭证失败'), 400);
    }
  }
}
