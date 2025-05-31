import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import type { InferModel } from 'drizzle-orm';

type User = InferModel<typeof users>;

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
}): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const [user] = await db.insert(users)
    .values({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, id));
  return user;
} 