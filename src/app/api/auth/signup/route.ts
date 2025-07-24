import { signupSchema } from "@/schemas/auth/signup.schema";
import { SignupService } from "@/lib/auth/signupService";
import { escapeHtml, isEmailTaken, IS_DEV } from "@/lib/utils";


export async function POST(req: Request) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    if (IS_DEV) {
      console.error("[Signup] Validation failed:", parsed.error.flatten());
    }
    return new Response(
      JSON.stringify({
        message: "Validation failed",
        errors: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Sanitize input

  let { name, email, password } = parsed.data;
  name = escapeHtml(name.trim());
  email = email.trim().toLowerCase();

  // Check if email already exists
  if (await isEmailTaken(email)) {
    if (IS_DEV) {
      console.warn(`[Signup] Duplicate email attempt: ${email}`);
    }
    return new Response(JSON.stringify({ error: "Email already in use" }), {
      status: 409,
    });
  }

  // ...rest of your signup logic (hash password, create user, etc.)
  const newUser = await SignupService({ name, email, password });

  if (IS_DEV) {
    console.log(`[Signup] User created: ${email}`);
  }

  return new Response(JSON.stringify({ success: true, user: newUser }), {
    status: 201,
  });
}
