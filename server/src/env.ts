// Nem o Express nem o tsx carregam o .env sozinhos — só o CLI do Prisma.
import 'dotenv/config';
import { z } from 'zod';

/** Falha cedo e com mensagem clara se o ambiente estiver incompleto. */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'Defina DATABASE_URL em server/.env'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET precisa ter ao menos 8 caracteres'),
  PORT: z.coerce.number().default(3333),
  /**
   * Endereço em que o servidor escuta. 0.0.0.0 = todas as interfaces, para
   * outros aparelhos da mesma rede acessarem pelo IP da máquina.
   * Use 127.0.0.1 para atender só a própria máquina.
   */
  HOST: z.string().min(1).default('0.0.0.0'),
  /**
   * Origens de OUTROS endereços autorizadas a chamar a API pelo navegador,
   * separadas por vírgula. Só é necessário quando o frontend roda separado
   * (npm run dev, ou site estático em outro domínio). No servidor local o
   * frontend é servido pelo próprio backend — mesma origem, nada a liberar.
   */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /**
   * Pasta do frontend já compilado (a `dist` gerada por `npm run build` na
   * raiz). Quando definida, este servidor entrega também as telas, e o
   * sistema inteiro fica em um endereço só: http://IP:PORTA.
   * Relativa à pasta server/ ou absoluta. Vazio = só API (frontend separado).
   */
  FRONTEND_DIR: z.string().optional().transform((v) => v?.trim() || undefined),
  /**
   * Pasta onde as fotos enviadas ficam. Relativa à pasta server/ ou absoluta.
   * No servidor local, use uma pasta FORA do código (ex.: C:\\PATRI-dados\\uploads),
   * para que atualizar o sistema nunca toque nas fotos.
   */
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});

const resultado = schema.safeParse(process.env);

if (!resultado.success) {
  console.error('\nConfiguração inválida em server/.env:\n');
  for (const problema of resultado.error.issues) {
    console.error(`  · ${problema.path.join('.')}: ${problema.message}`);
  }
  console.error('\nCopie server/.env.example para server/.env e ajuste.\n');
  process.exit(1);
}

export const env = resultado.data;
