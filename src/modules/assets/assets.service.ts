import path from 'node:path';
import { getCredential, getPolicy } from 'qcloud-cos-sts';
import type { CredentialData } from 'qcloud-cos-sts';
import type { UploadPolicyInput } from './assets.schema';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_ACTIONS = [
  'name/cos:PutObject',
  'name/cos:PostObject',
  'name/cos:InitiateMultipartUpload',
  'name/cos:ListMultipartUploads',
  'name/cos:ListParts',
  'name/cos:UploadPart',
  'name/cos:CompleteMultipartUpload',
];

const SCENE_PREFIX: Record<UploadPolicyInput['scene'], string> = {
  main: 'main',
  detail: 'detail',
  logo: 'logo',
  avatar: 'avatar',
};

const BIZ_PREFIX: Record<UploadPolicyInput['biz'], string> = {
  product: 'products',
  brand: 'brands',
  avatar: 'avatars',
};

const SCENE_COMPATIBILITY: Record<UploadPolicyInput['biz'], UploadPolicyInput['scene'][]> = {
  product: ['main', 'detail'],
  brand: ['logo'],
  avatar: ['avatar'],
};

function getRequiredEnv(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getFileExtension(fileName: string, contentType: string) {
  const originalExt = path.extname(fileName).toLowerCase();
  if (originalExt) {
    return originalExt;
  }

  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  return '';
}

function getMaxUploadBytes() {
  const value = Number(Bun.env.COS_UPLOAD_MAX_SIZE_MB || '2');
  return Math.max(value, 1) * 1024 * 1024;
}

function getDurationSeconds() {
  const value = Number(Bun.env.COS_STS_DURATION_SECONDS || '1800');
  return Math.min(Math.max(value, 300), 7200);
}

function buildCosKey(input: UploadPolicyInput, userId: number) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = getFileExtension(input.fileName, input.contentType);
  const uuid = crypto.randomUUID();

  return `${BIZ_PREFIX[input.biz]}/${SCENE_PREFIX[input.scene]}/${year}/${month}/${userId}/${uuid}${ext}`;
}

function assertInput(input: UploadPolicyInput) {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
    throw new Error('仅支持 JPG、PNG、WEBP 图片上传');
  }

  if (!SCENE_COMPATIBILITY[input.biz].includes(input.scene)) {
    throw new Error('上传业务与场景不匹配');
  }

  if (input.size > getMaxUploadBytes()) {
    throw new Error(`图片过大，压缩后单张不能超过 ${Math.round(getMaxUploadBytes() / 1024 / 1024)}MB`);
  }
}

export interface UploadPolicyResult extends CredentialData {
  bucket: string;
  region: string;
  key: string;
  url: string;
}

export class AssetsService {
  async createUploadPolicy(input: UploadPolicyInput, userId: number): Promise<UploadPolicyResult> {
    assertInput(input);

    const secretId = getRequiredEnv('COS_SECRET_ID');
    const secretKey = getRequiredEnv('COS_SECRET_KEY');
    const bucket = getRequiredEnv('COS_BUCKET');
    const region = getRequiredEnv('COS_REGION');
    const publicBaseUrl = trimSlash(getRequiredEnv('COS_PUBLIC_BASE_URL'));
    const key = buildCosKey(input, userId);
    const startTime = Math.round(Date.now() / 1000);
    const policy = getPolicy([
      {
        action: ALLOWED_ACTIONS,
        bucket,
        region,
        prefix: key,
      },
    ]);

    const credential = await getCredential({
      secretId,
      secretKey,
      region,
      durationSeconds: getDurationSeconds(),
      policy,
    });

    return {
      ...credential,
      startTime,
      bucket,
      region,
      key,
      url: `${publicBaseUrl}/${key}`,
    };
  }
}
