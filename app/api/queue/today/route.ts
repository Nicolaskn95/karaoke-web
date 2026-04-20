import { type NextRequest, NextResponse } from "next/server";
import { joinServiceUrl } from "@/lib/join-service-url";

const EXPRESS_API_URL = process.env.EXPRESS_API_URL;

export async function GET(request: NextRequest) {
  try {
    if (!EXPRESS_API_URL) {
      return NextResponse.json(
        {
          error: "Configuração ausente",
          message: "EXPRESS_API_URL não está definida",
        },
        { status: 500 }
      );
    }

    const apiUrl = joinServiceUrl(EXPRESS_API_URL, "queue/today");
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Express API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching queue from Express API:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
