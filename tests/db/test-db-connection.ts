import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

async function testDatabaseConnection() {
  try {
    // Test user credentials
    const email = 'test@example.com'
    const password = 'test123'

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Delete test user if exists
    await db.delete(users).where(eq(users.email, email))

    // Create test user
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name: 'Test User',
      isAdmin: false,
      subscriptionTier: 'free',
      articleCreditsRemaining: 5
    }).returning()

    console.log('Successfully created test user:', newUser)

    // Verify we can read the user back
    const foundUser = await db.select().from(users).where(eq(users.email, email))
    console.log('Successfully retrieved user:', foundUser)

    console.log('Database connection and operations successful!')
  } catch (error) {
    console.error('Database test failed:', error)
    process.exit(1)
  }
}

testDatabaseConnection().then(() => process.exit(0)) 