// lib/ai.ts

import { supabase } from './supabase';
import { db as DatabaseService } from './database';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiClient() {
  const apiKey =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in .env and restart Expo.'
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

class AIService {
  private static instance: AIService;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Fetch all business data for AI context
   */
  async fetchUserContext(userId: string): Promise<string> {
    try {
      const [products, salesLog, suppliers, profile, pendingPayments] =
        await Promise.all([
          DatabaseService.loadProducts(),
          DatabaseService.loadSalesLog(),
          DatabaseService.loadSuppliers(),
          supabase
  .from('profiles')
  .select('business_name, city, business_category, state')
  .eq('id', userId)
  .single(),
          supabase
            .from('pending_payments')
            .select('*')
            .eq('user_id', userId),
        ]);

      let context = `BUSINESS DATA FOR ${profile.data?.business_name || 'Business'}\n`;
context += `Business Type: ${profile.data?.business_category || 'General'}\n`;
context += `Location: ${profile.data?.city || 'Unknown'}, ${profile.data?.state || 'India'}\n\n`;

      // -------------------------
      // PRODUCTS
      // -------------------------
      context += `PRODUCTS (${products.length} total):\n`;

      products.slice(0, 30).forEach((product) => {
        context += `- ${product.name}: ₹${product.price} per ${
          product.unit || 'unit'
        }\n`;
      });

      context += `\n`;

      // -------------------------
      // ALL TIME SALES SUMMARY
      // -------------------------
      const totalRevenue = salesLog.reduce(
        (sum, sale) => sum + sale.total,
        0
      );

      context += `ALL TIME SALES SUMMARY:\n`;
      context += `- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n`;
      context += `- Total Transactions: ${salesLog.length}\n`;

      context += `\n`;

      // -------------------------
      // TODAY SALES ONLY
      // -------------------------
      const today = new Date().toISOString().split('T')[0];

      const todaySales = salesLog.filter(
        (sale) => sale.date === today
      );

      context += `TODAY SALES:\n`;

      if (todaySales.length > 0) {
        const todayRevenue = todaySales.reduce(
          (sum, sale) => sum + sale.total,
          0
        );

        context += `- Total Today Revenue: ₹${todayRevenue.toLocaleString(
          'en-IN'
        )}\n`;

        context += `- Transactions Today: ${todaySales.length}\n`;

        todaySales.forEach((sale) => {
          context += `  * ${
            sale.customerName || 'Walk-in Customer'
          }: ₹${sale.total}\n`;
        });
      } else {
        context += `- No sales recorded today\n`;
      }

      context += `\n`;

      // -------------------------
      // RECENT SALES
      // -------------------------
      context += `RECENT SALES:\n`;

      const recentSales = salesLog.slice(0, 10);

      if (recentSales.length > 0) {
        recentSales.forEach((sale) => {
          context += `- ${sale.date}: ₹${sale.total} (${
            sale.customerName || 'Walk-in'
          })\n`;
        });
      } else {
        context += `- No recent sales found\n`;
      }

      context += `\n`;

      // -------------------------
      // SUPPLIERS
      // -------------------------
      const totalSupplierPending = suppliers.reduce((sum, supplier) => {
        return (
          sum +
          supplier.bills.reduce(
            (billSum, bill) =>
              billSum + (bill.amount - bill.paid),
            0
          )
        );
      }, 0);

      context += `SUPPLIER DETAILS:\n`;
      context += `- Total Suppliers: ${suppliers.length}\n`;
      context += `- Pending Supplier Payments: ₹${totalSupplierPending.toLocaleString(
        'en-IN'
      )}\n`;

      suppliers.slice(0, 10).forEach((supplier) => {
        const pendingAmount = supplier.bills.reduce(
          (sum, bill) => sum + (bill.amount - bill.paid),
          0
        );

        if (pendingAmount > 0) {
          context += `- ${supplier.name}: ₹${pendingAmount.toLocaleString(
            'en-IN'
          )} pending\n`;
        }
      });

      context += `\n`;

      // -------------------------
      // CUSTOMER PENDING PAYMENTS
      // -------------------------
      const customerPending = pendingPayments.data || [];

      const totalCustomerPending = customerPending.reduce(
        (sum, customer) => sum + Number(customer.amount),
        0
      );

      context += `CUSTOMERS WHO OWE MONEY:\n`;
      context += `- Total Pending Amount: ₹${totalCustomerPending.toLocaleString(
        'en-IN'
      )}\n`;

      customerPending.forEach((customer) => {
        context += `- ${customer.name}: ₹${Number(
          customer.amount
        ).toLocaleString('en-IN')}\n`;
      });

      context += `\n`;

      // -------------------------
      // TOP PRODUCTS
      // -------------------------
      const productStats: Record<
        string,
        { qty: number; revenue: number }
      > = {};

      salesLog.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productStats[item.name]) {
            productStats[item.name] = {
              qty: 0,
              revenue: 0,
            };
          }

          productStats[item.name].qty += item.qty;
          productStats[item.name].revenue +=
            item.price * item.qty;
        });
      });

      const topProducts = Object.entries(productStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);

      context += `TOP SELLING PRODUCTS:\n`;

      topProducts.forEach(([name, data], index) => {
        context += `${index + 1}. ${name} - ${
          data.qty
        } sold | ₹${data.revenue.toLocaleString('en-IN')}\n`;
      });

      return context;
    } catch (error) {
      console.error('Error fetching business context:', error);
      return 'Unable to fetch business data.';
    }
  }

  /**
   * Generate AI response
   */
  async getResponse(
    userMessage: string,
    userId: string,
    conversationHistory: Message[] = []
  ): Promise<string> {
    if (!userId) {
      return 'Please login to use Sankalp AI.';
    }

    try {
      const userContext = await this.fetchUserContext(userId);
      const genAI = getGeminiClient();

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

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
- If user asks about TODAY sales/transactions, ONLY use the "TODAY SALES" section. Do NOT use historical data.
- Always mention exact names and amounts from the data.
- If data is missing: say "I don't have that information in your records yet."
- Never invent or estimate business data.

FOR BUSINESS TIPS AND LOCATION-AWARE QUESTIONS:
- When a user asks for business tips, growth advice, or general guidance, give 3–5 practical, specific tips relevant to their business type (from the profile below).
- Draw on their actual data where possible (e.g. if a product sells a lot, suggest stocking more).
- IMPORTANT: When user asks questions about their business type and location (e.g., "is fishing nets good for my location?"), always CONSIDER THE LOCATION and BUSINESS TYPE TOGETHER.
  * Use your knowledge of geography, climate, industries, and local markets in India
  * Provide location-specific insights based on the city and state
  * Example: If business type is "Fishing nets" and location is "Sompeta", mention that Sompeta is near the seashore and is excellent for fishing-related businesses
  * If suggesting business feasibility, explain WHY based on location characteristics
- You do NOT need real-time data to answer tips or location-based questions — use your knowledge of Indian small business best practices and geography.

Only decline to answer if the question is completely unrelated to business (e.g. cricket, movies, politics). In that case reply:
"I'm here to help with your business! Ask me about sales, products, suppliers, tips to grow, or if your business type suits your location."

Business data:
${userContext}

Conversation History:
${conversationHistory
  .slice(-5)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join('\n')}

User: ${userMessage}

Sankalp AI:
`;

      const result = await model.generateContent(
        systemPrompt
      );

      const response = await result.response;

      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);

      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes('unregistered callers') ||
        message.includes('403')
      ) {
        return (
          'Gemini is rejecting this API key. Make sure Generative Language API is enabled for your Google Cloud project, the key is unrestricted for testing, and EXPO_PUBLIC_GEMINI_API_KEY matches the active project.'
        );
      }

      return `I'm unable to process your request right now. Please try again later.`;
    }
  }
}

export const aiService = AIService.getInstance();