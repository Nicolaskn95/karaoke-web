import { type NextRequest, NextResponse } from "next/server";
import dotenv from 'dotenv'

dotenv.config()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number } = body;

    if (!number) {
      return NextResponse.json(
        { error: "Number is required" },
        { status: 400 }
      );
    }

    const KARAOKE_SERVICE_URL =
      process.env.NEXT_PUBLIC_KARAOKE_SERVICE_URL || "http://localhost:4000";
    console.log("KARAOKE_SERVICE_URL:", KARAOKE_SERVICE_URL);

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    let response: Response;
    try {
      response = await fetch(`${KARAOKE_SERVICE_URL}/add-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Erro de conexão ou timeout
      if (error.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Service timeout",
            message: "The karaoke service did not respond in time",
          },
          { status: 503 }
        );
      }

      // Erro de rede (ECONNREFUSED, etc)
      return NextResponse.json(
        {
          error: "Service unavailable",
          message:
            "Unable to connect to the karaoke service. Please check if the service is running.",
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.error || "Service error",
          message: errorData.message || `Service returned ${response.status}`,
        },
        { status: response.status }
      );
    }

    console.log(`[Karaoke] Added song number: ${number} to queue`);

    return NextResponse.json({
      success: true,
      message: `Song ${number} added to queue`,
    });
  } catch (error) {
    console.error("Error adding number to queue:", error);
    return NextResponse.json(
      { error: "Failed to add song to queue" },
      { status: 500 }
    );
  }
}
