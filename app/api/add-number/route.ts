import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { number } = body

    if (!number) {
      return NextResponse.json({ error: "Number is required" }, { status: 400 })
    }

    // TODO: Replace with actual microservice call
    // const response = await fetch(`${process.env.KARAOKE_SERVICE_URL}/add-number`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ number }),
    // })

    console.log(`[Karaoke] Added song number: ${number} to queue`)

    return NextResponse.json({
      success: true,
      message: `Song ${number} added to queue`,
    })
  } catch (error) {
    console.error("Error adding number to queue:", error)
    return NextResponse.json({ error: "Failed to add song to queue" }, { status: 500 })
  }
}
