import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AssetsController } from './assets.controller';

export function createAssetsRoutes() {
  const assets = new Hono();
  const controller = new AssetsController();

  assets.use('*', authMiddleware);
  assets.post('/upload-policy', (c) => controller.createUploadPolicy(c));

  return assets;
}
