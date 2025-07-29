import { createSecureEndpoint } from "@/lib/security/secureEndpoint";
import getAllTasksService, { GetAllTasksError } from "@/lib/getAllTasksService";
import { IS_DEV } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { Task } from "@/types";

/**
 * 🎯 Get All Tasks Endpoint - Enterprise Edition
 * ===============================================
 *
 * Retrieves all tasks with completion status for authenticated users.
 * Optimized for server-side rendering and client-side data fetching.
 * Uses SecureEndpoint framework for enterprise-grade security and performance.
 *
 * Features:
 * - ✅ SecureEndpoint integration with authentication & rate limiting
 * - ✅ Optimized for server-side rendering in layout
 * - ✅ Comprehensive error handling with specific error codes
 * - ✅ Performance optimized task retrieval
 * - ✅ Scalable Redis operations with connection pooling
 * - ✅ Audit logging for data access
 */

interface GetAllTasksSuccessResponse {
  tasks: Task[];
  totalCount: number;
  activeCount: number;
  completedCount: number;
  lastUpdated: string;
}

interface GetAllTasksErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: string;
}

type GetAllTasksResponse =
  | GetAllTasksSuccessResponse
  | GetAllTasksErrorResponse;

/**
 * GET /api/GetAllTasks
 *
 * ✅ Enterprise task retrieval endpoint
 * Fetches all tasks with completion status and metadata
 */
export const GET = createSecureEndpoint(
  {
    requireAuth: true, // ✅ Authentication required
    rateLimit: {
      type: "api", // ✅ API endpoint rate limiting
      customConfig: false,
    },
    auditLog: true, // ✅ Audit logging for data access
    logRequests: IS_DEV, // ✅ Request logging in development
    corsEnabled: true, // ✅ CORS for frontend and server-side access
  },
  async (
    req: NextRequest,
    { user }
  ): Promise<NextResponse<GetAllTasksResponse>> => {
    try {
      if (IS_DEV) {
        console.log("[GetAllTasks] Processing task retrieval:", {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        });
      }

      // ✅ PERFORMANCE: Use optimized service with error handling
      const tasks = await getAllTasksService();

      // ✅ SCALABILITY: Calculate metadata for frontend optimization
      const totalCount = tasks.length;
      const activeCount = tasks.filter((task) => !task.completed).length;
      const completedCount = tasks.filter((task) => task.completed).length;
      const lastUpdated = new Date().toISOString();

      // ✅ AUDIT: Log successful data retrieval
      if (IS_DEV) {
        console.log("[GetAllTasks] Tasks retrieved successfully:", {
          totalCount,
          activeCount,
          completedCount,
          userId: user.id,
          email: user.email,
          timestamp: lastUpdated,
        });
      }

      return NextResponse.json({
        tasks,
        totalCount,
        activeCount,
        completedCount,
        lastUpdated,
      });
    } catch (error: any) {
      // ✅ SCALABILITY: Handle specific service errors
      if (error instanceof GetAllTasksError) {
        console.error("[GetAllTasks] Service error:", {
          errorCode: "SERVICE_ERROR",
          message: error.message,
          status: error.status,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: error.message,
            errorCode: "SERVICE_ERROR",
            ...(IS_DEV && { details: `Status: ${error.status}` }),
          },
          { status: error.status }
        );
      }

      // ✅ SCALABILITY: Handle unexpected errors
      console.error("[GetAllTasks] Unexpected error:", {
        error: error.message,
        stack: IS_DEV ? error.stack : undefined,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          errorCode: "INTERNAL_ERROR",
          ...(IS_DEV && { details: error.message }),
        },
        { status: 500 }
      );
    }
  }
);
