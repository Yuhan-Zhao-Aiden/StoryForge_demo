import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";

// Step 1: request password reset
export async function requestPasswordReset(email: string): Promise<string> {
  const db = await getDb();
  const users = db.collection("users");

  const resetCode = crypto.randomBytes(3).toString("hex"); // 6-char code
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

  const user = await users.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  await users.updateOne(
    { email },
    { $set: { resetCode, resetCodeExpiry: expiry } }
  );

  // TODO: Send resetCode by email (via nodemailer or external service)
  return resetCode;
}

// Step 2: verify code + reset password
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne({ email, resetCode: code });
  if (!user) {
    throw new Error("Invalid reset code");
  }

  if (user.resetCodeExpiry < new Date()) {
    throw new Error("Reset code expired");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await users.updateOne(
    { email },
    {
      $set: { passwordHash: hashedPassword },
      $unset: { resetCode: "", resetCodeExpiry: "" },
    }
  );
}
