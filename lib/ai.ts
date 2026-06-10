// lib/ai.ts

import { supabase } from './supabase';
import { db as DatabaseService } from './database';

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

        context += `- Total Today Revenue: ₹${todayRevenue.toLocaleString('en-IN')}\n`;
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
            (billSum, bill) => billSum + (bill.amount - bill.paid),
            0
          )
        );
      }, 0);

      context += `SUPPLIER DETAILS:\n`;
      context += `- Total Suppliers: ${suppliers.length}\n`;
      context += `- Pending Supplier Payments: ₹${totalSupplierPending.toLocaleString('en-IN')}\n`;

      suppliers.slice(0, 10).forEach((supplier) => {
        const pendingAmount = supplier.bills.reduce(
          (sum, bill) => sum + (bill.amount - bill.paid),
          0
        );

        if (pendingAmount > 0) {
          context += `- ${supplier.name}: ₹${pendingAmount.toLocaleString('en-IN')} pending\n`;
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
      context += `- Total Pending Amount: ₹${totalCustomerPending.toLocaleString('en-IN')}\n`;

      customerPending.forEach((customer) => {
        context += `- ${customer.name}: ₹${Number(customer.amount).toLocaleString('en-IN')}\n`;
      });

      context += `\n`;

      // -------------------------
      // TOP PRODUCTS
      // -------------------------
      const productStats: Record<string, { qty: number; revenue: number }> = {};

      salesLog.forEach((sale) => {
        sale.items.forEach((item) => {
          if (!productStats[item.name]) {
            productStats[item.name] = { qty: 0, revenue: 0 };
          }

          productStats[item.name].qty += item.qty;
          productStats[item.name].revenue += item.price * item.qty;
        });
      });

      const topProducts = Object.entries(productStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);

      context += `TOP SELLING PRODUCTS:\n`;

      topProducts.forEach(([name, data], index) => {
        context += `${index + 1}. ${name} - ${data.qty} sold | ₹${data.revenue.toLocaleString('en-IN')}\n`;
      });

      return context;
    } catch (error) {
      console.error('Error fetching business context:', error);
      return 'Unable to fetch business data.';
    }
  }

  /**
   * Generate AI response via Supabase Edge Function
   * Gemini API key is securely stored as an edge function secret —
   * it is NOT exposed in the app bundle.
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

      const { data, error } = await supabase.functions.invoke('aichat', {
        body: {
          userMessage,
          userContext,
          conversationHistory: conversationHistory.slice(-5).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      });

      if (error) throw error;

      if (!data?.text) {
        throw new Error('Empty response from AI edge function');
      }

      return data.text;
    } catch (error) {
      console.error('AI Edge Function Error:', error);

      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('Failed to send') || message.includes('network')) {
        return 'Unable to connect. Please check your internet connection and try again.';
      }

      return `I'm unable to process your request right now. Please try again later.`;
    }
  }
}

export const aiService = AIService.getInstance();