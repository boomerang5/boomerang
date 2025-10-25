import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const region = process.env.SPEECH_REGION
    const key = process.env.SPEECH_KEY
    if (!region || !key) {
      return NextResponse.json({ error: 'Falta SPEECH_REGION o SPEECH_KEY' }, { status: 500 })
    }

    const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': '0',
      },
    })

    if (!r.ok) {
      const text = await r.text()
      return NextResponse.json({ error: 'No se pudo obtener token', details: text }, { status: 500 })
    }

    const token = await r.text()
    return NextResponse.json({ token, region })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
