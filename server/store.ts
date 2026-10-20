import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { StoredWorkspace } from '../shared/model';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export class FileStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}
  private path(id: string) {
    if (!z.string().uuid().safeParse(id).success) throw new AppError(404, 'Campaign not found.');
    return join(this.directory, `${id}.json`);
  }
  async get(id: string): Promise<StoredWorkspace | null> {
    try {
      return JSON.parse(await readFile(this.path(id), 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
  private async save(w: StoredWorkspace) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temp = join(this.directory, `${w.id}.${randomUUID()}.tmp`);
    try {
      await writeFile(temp, JSON.stringify(w), { mode: 0o600, flag: 'wx' });
      await rename(temp, this.path(w.id));
    } finally {
      await rm(temp, { force: true });
    }
  }
  async create(w: StoredWorkspace) {
    await this.save(w);
  }
  async update(id: string, version: number, change: (w: StoredWorkspace) => void) {
    const result = this.queue.then(async () => {
      const w = await this.get(id);
      if (!w) throw new AppError(404, 'Campaign not found.');
      if (w.version !== version)
        throw new AppError(409, 'This campaign changed. Reload it before saving again.');
      change(w);
      w.version++;
      w.updatedAt = new Date().toISOString();
      await this.save(w);
      return w;
    });
    this.queue = result.catch(() => {});
    return result;
  }
}
