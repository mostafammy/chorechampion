import { prisma } from "@/lib/prismaClient";
import bcrypt from "bcrypt";

export interface LoginServiceInput {
  email: string;
  password: string;
}

export const loginService = async ({ email, password }: LoginServiceInput) => {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Compare password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Return user data (without password)
  const { password: _pw, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
