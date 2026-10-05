import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { autenticar } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';

export const uploadsRouter = Router();

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB (§14.2)

/**
 * Pasta física das fotos. O endereço público continua sendo `/uploads/<arquivo>`,
 * independentemente de onde a pasta esteja — é esse caminho que vai para o banco.
 */
export const PASTA_UPLOADS = resolve(env.UPLOAD_DIR);
mkdirSync(PASTA_UPLOADS, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: PASTA_UPLOADS,
    filename: (_req, arquivo, callback) => {
      callback(null, `${randomUUID()}${extname(arquivo.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: TAMANHO_MAX },
  fileFilter: (_req, arquivo, callback) => {
    if (!TIPOS_ACEITOS.includes(arquivo.mimetype)) {
      callback(new AppError(422, 'Envie uma imagem JPEG, PNG ou WebP.'));
      return;
    }
    callback(null, true);
  },
});

/** POST /uploads/photo — uma foto principal por equipamento (§14.2). */
uploadsRouter.post(
  '/photo',
  autenticar,
  upload.single('foto'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(422, 'Selecione uma imagem para enviar.');
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }),
);

/**
 * Foto que não está mais no disco (ex.: disco temporário do Render Free apagado
 * num reinício). Responde 404 claro em vez de cair na autenticação.
 */
uploadsRouter.get('/:arquivo', (_req, res) => {
  res.status(404).json({ mensagem: 'Arquivo não encontrado.' });
});
