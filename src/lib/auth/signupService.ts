import { prisma } from "@/lib/prismaClient";
import bcrypt from "bcrypt";
import { SignupInputType } from "@/types";

export const SignupService = async ({
  name,
  email,
  password,
}: SignupInputType) => {
  // (Optional) Double-check for existing user for extra safety
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      // Do NOT return password
    },
  });

  return newUser;
};
