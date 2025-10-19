# 🔍 Role System: Where It's Checked & How to Update It

## 🎯 **Where Your Role is Checked**

### **1. Role Flow in the System:**

```mermaid
graph TD
    A[Database User Model] --> B[Login Service]
    B --> C[JWT Token Generation]
    C --> D[SecureEndpoint]
    D --> E[Role Check in Handler]

    A2[user.role = 'USER'] --> B2[loginService returns user]
    B2 --> C2[JWT payload: {id, role, email}]
    C2 --> D2[requireAuth verifies token]
    D2 --> E2[AdjustScore checks user.role]
```

### **2. Database Level (Prisma Schema):**

```sql
-- In your PostgreSQL database:
model User {
  id       String @id @default(cuid())
  name     String?
  email    String @unique
  role     Role   @default(USER)  -- 🎯 THIS IS WHERE YOUR ROLE IS STORED
  -- ... other fields
}

enum Role {
  ADMIN  -- 🔓 Can adjust scores
  USER   -- 🔒 Cannot adjust scores (default)
}
```

### **3. Login Process (Token Generation):**

```typescript
// In src/app/api/auth/login/route.ts:
const user = await loginService({ email, password });

const payload = {
  id: user.id,
  role: user.role, // 🎯 Role from database goes into JWT
  email: user.email,
};

const accessToken = await generateAccessToken(payload);
// Token now contains your role
```

### **4. Role Check in AdjustScore:**

```typescript
// In src/app/api/AdjustScore/route.ts:
const allowedRoles = ["admin"]; // 🎯 Only "admin" role allowed
if (!allowedRoles.includes(user.role)) {
  // 🚫 Access denied if user.role !== "admin"
  return NextResponse.json(
    {
      error: "Insufficient privileges",
      requiredRoles: allowedRoles,
      userRole: user.role, // 🎯 Shows your current role
    },
    { status: 403 }
  );
}
```

## 🛠️ **How to Update Your Role**

### **Option 1: Direct Database Update (Quickest)**

```sql
-- Connect to your PostgreSQL database and run:
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';

-- Verify the update:
SELECT id, name, email, role
FROM "User"
WHERE email = 'your-email@example.com';
```

### **Option 2: Using Prisma Studio (Visual)**

```bash
# In your terminal:
npx prisma studio

# This opens a web interface where you can:
# 1. Navigate to the User model
# 2. Find your user record
# 3. Change role from "USER" to "ADMIN"
# 4. Save the changes
```

### **Option 3: Create an Admin Endpoint (Programmatic)**

```typescript
// Create src/app/api/admin/promote-user/route.ts:
import { prisma } from "@/lib/prismaClient";
import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import { z } from "zod";

const promoteUserSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["USER", "ADMIN"], {
    errorMap: () => ({ message: "Role must be USER or ADMIN" }),
  }),
});

export const POST = createSecureEndpoint(
  {
    requireAuth: true,
    validation: { schema: promoteUserSchema },
    auditLog: true,
  },
  async (req, { user, validatedData }) => {
    // 🔒 Only existing admins can promote users
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Only admins can change user roles",
          userRole: user.role,
        },
        { status: 403 }
      );
    }

    // Update user role in database
    const updatedUser = await prisma.user.update({
      where: { email: validatedData.email },
      data: { role: validatedData.role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: `User ${validatedData.email} role updated to ${validatedData.role}`,
      user: updatedUser,
    });
  }
);
```

### **Option 4: Signup with Admin Role (Development)**

```typescript
// Temporarily modify src/lib/auth/signupService.ts for testing:
const newUser = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
    role: "ADMIN", // 🎯 Add this line for testing
  },
  select: {
    id: true,
    name: true,
    email: true,
    role: true, // 🎯 Include role in response
    createdAt: true,
  },
});
```

## 🔍 **How to Check Your Current Role**

### **Method 1: Check Database Directly**

```sql
SELECT id, name, email, role, "createdAt"
FROM "User"
WHERE email = 'your-email@example.com';
```

### **Method 2: Add Debugging to AdjustScore**

```typescript
// Add this to AdjustScore endpoint (temporarily):
console.log("🔍 Current user debug info:", {
  id: user.id,
  email: user.email,
  role: user.role,
  fullUser: user,
});
```

### **Method 3: Create a User Info Endpoint**

```typescript
// Create src/app/api/user/me/route.ts:
export const GET = createSecureEndpoint(
  {
    requireAuth: true,
    rateLimit: { type: "api" },
  },
  async (req, { user }) => {
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      message: `You are logged in as ${user.role}`,
    });
  }
);
```

## ⚡ **Quick Fix Steps**

### **Step 1: Check Current Role**

```bash
# Option A: Use Prisma Studio
npx prisma studio

# Option B: Connect to database directly
psql -h your-host -U your-username -d your-database
\c your-database
SELECT email, role FROM "User";
```

### **Step 2: Update to Admin**

```sql
-- Replace 'your-email@example.com' with your actual email:
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### **Step 3: Re-login**

```typescript
// You need to log out and log back in to get a new JWT token
// with the updated role, because the role is stored in the JWT token
```

### **Step 4: Test AdjustScore**

```typescript
// Now your AdjustScore call should work:
const response = await fetchWithAuth("/api/AdjustScore", {
  method: "POST",
  body: JSON.stringify({
    userId: "target-user-id",
    delta: 10,
    source: "manual",
    reason: "Test adjustment",
  }),
});
```

## 🎯 **Role System Summary**

| Component       | Current Value          | Location                |
| --------------- | ---------------------- | ----------------------- |
| **Database**    | `role: USER` (default) | PostgreSQL `User` table |
| **JWT Token**   | `user.role: "USER"`    | Generated from database |
| **AdjustScore** | Requires `"admin"`     | Line 48 in route.ts     |
| **Your Access** | ❌ Denied              | USER ≠ admin            |

## ✅ **After Updating Role**

| Component       | New Value            | Result            |
| --------------- | -------------------- | ----------------- |
| **Database**    | `role: ADMIN`        | ✅ Updated        |
| **JWT Token**   | `user.role: "ADMIN"` | ✅ After re-login |
| **AdjustScore** | Requires `"admin"`   | ✅ Matches        |
| **Your Access** | ✅ Granted           | ADMIN = admin     |

The key is that **roles are stored in the database** and **included in JWT tokens**, so you need to:

1. Update the database role
2. Log out and log back in to get a new token
3. Then the AdjustScore endpoint will work! 🎉
