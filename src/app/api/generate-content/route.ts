import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { verifyRoomPermission } from "@/lib/permissions";
import { generateContent, checkRateLimit } from "@/lib/openai";
import { contentGenerationRequestSchema } from "@/lib/types/editor";
import { logActivity } from "@/lib/activityLogger";

/**
 * POST /api/generate-content
 * Generate AI content for a story node
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get authenticated user
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const validatedRequest = contentGenerationRequestSchema.parse(body);

    // 3. Check rate limiting
    const rateLimit = checkRateLimit(user.id, 20, 60 * 60 * 1000); // 20 requests per hour
    
    if (rateLimit.limited) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          }
        }
      );
    }

    // 4. Verify user has permission to update nodes in this room
    const db = await getDb();
    const roomId = new ObjectId(validatedRequest.roomId);
    const userId = new ObjectId(user.id);

    const { authorized, role } = await verifyRoomPermission(
      db,
      roomId,
      userId,
      "UPDATE_NODES"
    );

    if (!authorized) {
      return NextResponse.json(
        { error: "You don't have permission to edit nodes in this room" },
        { status: 403 }
      );
    }

    // 5. Verify the node exists and belongs to this room
    const node = await db.collection("nodes").findOne({
      _id: new ObjectId(validatedRequest.nodeId),
      roomId: roomId,
    });

    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // 6. Generate content using OpenAI
    const startTime = Date.now();
    const result = await generateContent(validatedRequest);
    const generationTimeMs = Date.now() - startTime;

    // 7. Log the generation activity
    if (result.success) {
      await logActivity(
        db,
        roomId,
        userId,
        userId,
        "room_updated",
        {
          action: "ai_content_generated",
          nodeId: validatedRequest.nodeId,
          nodeTitle: node.title,
          prompt: validatedRequest.prompt.substring(0, 100),
          tokens: result.usage?.totalTokens,
          generationTimeMs,
          nodeType: validatedRequest.nodeType,
          userRole: role,
        }
      );
    } else {
      // Log failed generation attempts
      console.error("AI generation failed:", {
        userId: user.id,
        username: user.username,
        roomId: validatedRequest.roomId,
        nodeId: validatedRequest.nodeId,
        error: result.error,
      });
    }

    // 8. Return response with rate limit headers
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: {
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });

  } catch (error) {
    console.error("Generate content API error:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
