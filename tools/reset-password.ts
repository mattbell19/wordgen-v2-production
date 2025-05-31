import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

async function resetPassword() {
  const email = process.argv[2] || "matt1@airteam.co";
  const newPassword = process.argv[3] || "password123";
  
  try {
    console.log(`Attempting to reset password for user: ${email}`);
    
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
    
    // Print the user info to verify
    console.log(`Found user: ID=${user.id}, Email=${user.email}`);
    console.log(`Current password hash: ${user.password.substring(0, 20)}...`);
    
    // Split the stored password to verify format
    const parts = user.password.split('.');
    console.log(`Password parts: ${parts.length}, hash length: ${parts[0]?.length || 0}`);
    
    // Hash the new password
    const hashedPassword = await crypto.hash(newPassword);
    console.log(`New password hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update user's password
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
      
    console.log(`Password successfully reset for ${email}`);
    console.log(`New credentials: ${email} / ${newPassword}`);
    
    // Verify the update
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    
    console.log(`Updated password hash: ${updatedUser.password.substring(0, 20)}...`);
    
    // Split the updated password to verify format
    const newParts = updatedUser.password.split('.');
    console.log(`Updated password parts: ${newParts.length}, hash length: ${newParts[0]?.length || 0}`);
    
    console.log(`Updated user: ID=${updatedUser.id}, Updated at=${updatedUser.updatedAt}`);
    
  } catch (error) {
    console.error("Error resetting password:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the function
resetPassword(); 