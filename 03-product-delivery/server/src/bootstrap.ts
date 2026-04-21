/**
 * Bootstrap file — loaded first by server.ts to ensure .env is read before any
 * module (like shared/config/secrets.ts) evaluates process.env.
 *
 * ESM hoists all `import` statements before top-level code runs, so if we put
 * the dotenv.config calls next to other imports, the secrets module is
 * evaluated before dotenv has loaded — every required var reads as undefined
 * and the server crashes at boot.
 */

import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '..', '.env') });
