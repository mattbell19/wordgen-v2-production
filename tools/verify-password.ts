import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const crypto = {
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    if (!hashedPassword || !salt) {
      console.error("Invalid password format");
      return false;
    }
    console.log(`Comparing with hash length: ${hashedPassword.length}, salt: ${salt.substring(0, 5)}...`);
    
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    
    console.log("Generated hash for comparison:", suppliedPasswordBuf.toString("hex").substring(0, 20) + "...");
    
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};

async function verifyPassword() {
  const email = process.argv[2] || "matt1@airteam.co";
  const passwordToTest = process.argv[3] || "password123";
  
  try {
    console.log(`Verifying password for user: ${email}`);
    console.log(`Testing password: ${passwordToTest}`);
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
      
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }
    
    console.log(`Found user: ID=${user.id}, Email=${user.email}`);
    console.log(`Stored password hash: ${user.password.substring(0, 20)}...`);
    
    // Test the password
    const isMatch = await crypto.compare(passwordToTest, user.password);
    
    if (isMatch) {
      console.log(`✅ Password "${passwordToTest}" is CORRECT for user ${email}`);
    } else {
      console.log(`❌ Password "${passwordToTest}" is INCORRECT for user ${email}`);
    }
    
  } catch (error) {
    console.error("Error verifying password:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the function
verifyPassword(); 