import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

CRITICAL RULES FOR DATA QUESTIONS:
- The business data below is REAL, LIVE data from the user's app. Trust it completely.
- If user asks about TODAY sales/transactions, use ONLY the "TODAY SALES" section.
- If TODAY SALES says "No sales recorded today", tell the user exactly that — don't guess or use other sections.
- Always mention exact customer names and amounts from the data when available.
- If data is missing or zero: say exactly "I don't see any [X] in your records yet."
- NEVER invent, estimate, or extrapolate business data.
- NEVER say you don't have access to real-time data — you DO have it in the business data below.

FOR BUSINESS TIPS AND LOCATION-AWARE QUESTIONS:
- Give 3–5 practical, specific tips relevant to their business type.
- Draw on their actual data where possible.
- When user asks about business type and location, consider BOTH together.
- Use knowledge of geography, climate, industries, and local markets in India.

Only decline if completely unrelated to business (cricket, movies, politics):
"I'm here to help with your business! Ask me about sales, products, suppliers, tips to grow, or if your business type suits your location."

Business data:
${userContext}
`

    // Build conversation context as plain text instead of using chat history API
    // This avoids Gemini's strict "must start with user" history validation entirely
    const historyText = (conversationHistory || [])
      .slice(-6)
      .map((msg: any) => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'User'
        return `${role}: ${msg.content}`
      })
      .join('\n')

    const fullMessage = historyText
      ? `Previous conversation:\n${historyText}\n\nUser: ${userMessage}`
      : userMessage

    // Use generateContent (single turn) instead of startChat — no history validation
    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: fullMessage }] }],
    })

    const text = result.response.text()

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})