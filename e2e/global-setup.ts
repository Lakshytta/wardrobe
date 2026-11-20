import fs from 'node:fs';
import { COV_DIR } from './helpers.ts';
export default function () { fs.rmSync(COV_DIR, { recursive: true, force: true }); fs.mkdirSync(COV_DIR, { recursive: true }); }
