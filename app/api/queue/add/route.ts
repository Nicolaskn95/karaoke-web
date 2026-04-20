import { type NextRequest, NextResponse } from "next/server";
import { joinServiceUrl } from "@/lib/join-service-url";

const EXPRESS_API_URL = process.env.EXPRESS_API_URL;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { musicId, name, date, time } = body;

    if (!musicId || !name || !date || !time) {
      return NextResponse.json(
        {
          error: "Parâmetros obrigatórios ausentes",
          message: "Envie musicId, name, date e time.",
        },
        { status: 400 }
      );
    }

    const apiUrl = joinServiceUrl(EXPRESS_API_URL, "queue/add");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ musicId, name, date, time }),
    });

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

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error adding to queue:", error);
    return NextResponse.json(
      {
        error: "Failed to add to queue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
