import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userMessage, userContext, conversationHistory } = await req.json()

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const systemPrompt = `
You are Sankalp AI, a smart and friendly business assistant for Indian small business owners using the Sankalp app.

You help users with:
- Sales insights (today, recent, all-time)
- Top selling products and inventory
- Profit and revenue analysis
- Supplier management and pending bills
- Customer pending payments
- Practical business tips and advice tailored to their business type
- Location-aware business recommendations and feasibility analysis
- How to use Sankalp app features

Respond ONLY in English. Be warm, concise, and actionable.

IMPORTANT RULES FOR DATA QUESTIONS:
- If user asks about TODAY sales/transactions, ONLY use the "TODAY SALES" section.
- Always mention exact names and amounts from the data.
- If data is missing: say "I don't have that information in your records yet."
- Never invent or estimate business data.

FOR BUSINESS TIPS AND LOCATION-AWARE QUESTIONS:
- Give 3–5 practical, specific tips relevant to their business type.
- Draw on their actual data where possible.
- When user asks about business type and location, consider BOTH together.
- Use knowledge of geography, climate, industries, and local markets in India.

Only decline if completely unrelated to business (cricket, movies, politics):
"I'm here to help with your business! Ask me about sales, products, suppliers, tips to grow, or if your business type suits your location."

Business data:
${userContext}

Conversation History:
${conversationHistory.slice(-5).map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${userMessage}

Sankalp AI:
`

    const result = await model.generateContent(systemPrompt)
    const text = result.response.text()

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})