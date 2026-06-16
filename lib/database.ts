import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useAuthStore } from './store';

/* =========================
   TYPES
========================= */

export interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  sales: number;
}

export interface BillItem {
  name: string;
  price: number;
  qty: number;
  productId?: number;
  custom?: boolean;
}

export interface Session {
  id: number;
  session_id?: number;
  customerName: string;
  phone: string;
  items: BillItem[];
  npVal?: string;
}

export interface SaleLog {
  id: number;
  total: number;
  time: string;
  date: string;
  items: BillItem[];
  customerName: string;
  phone: string;
  paymentMode?: 'cash' | 'upi';
}

export interface Bill {
  id: number;
  name: string;
  date: string;
  amount: number;
  paid: number;
  items?: string[];
}

export interface Transaction {
  id: number;
  date: string;
  type: 'bill' | 'payment';
  billId: number;
  billName: string;
  amount: number;
  supplierId?: number;
  supplierName?: string;
}

export interface Supplier {
  id: number;
  name: string;
  category: string;
  bills: Bill[];
  transactions: Transaction[];
}

/* =========================
   DATABASE SERVICE
========================= */

class DatabaseService {
  private getCurrentUserId(): string {
    const { user } = useAuthStore.getState();

    if (!user?.id) {
      throw new Error('User not logged in');
    }

    return user.id;
  }

  /* =========================
     AUTH SESSION
  ========================= */

  async saveAuthSession(session: any) {
    await AsyncStorage.setItem('supabase_session', JSON.stringify(session));
  }

  async loadAuthSession() {
    const data = await AsyncStorage.getItem('supabase_session');
    return data ? JSON.parse(data) : null;
  }

  async clearAuthSession() {
    await AsyncStorage.removeItem('supabase_session');
  }

  /* =========================
     PROFILE
  ========================= */

  async saveUserProfile(profileData: any) {
    const userId = this.getCurrentUserId();

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...profileData });

    if (error) throw error;
  }

  async getUserProfile() {
    const userId = this.getCurrentUserId();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data;
  }

  /* =========================
     PRODUCTS
  ========================= */

  async loadProducts(): Promise<Product[]> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (
        data?.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          unit: p.unit,
          sales: p.sales || 0,
        })) || []
      );
    } catch (error) {
      console.log('loadProducts error:', error);
      return [];
    }
  }

  async saveProducts(products: Product[]) {
    try {
      const userId = this.getCurrentUserId();

      await supabase.from('user_products').delete().eq('user_id', userId);

      if (products.length === 0) return;

      const formattedProducts = products.map((p) => ({
        user_id: userId,
        name: p.name,
        price: p.price,
        unit: p.unit,
        sales: p.sales || 0,
      }));

      const { error } = await supabase.from('user_products').insert(formattedProducts);

      if (error) throw error;
    } catch (error) {
      console.log('saveProducts error:', error);
    }
  }

  /* =========================
     SALES
  ========================= */

  async loadSalesLog(): Promise<SaleLog[]> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (
        data?.map((sale) => ({
          id: sale.id,
          total: Number(sale.total),
          time: sale.time,
          date: sale.date || '',
          items: sale.items || [],
          customerName: sale.customer_name,
          phone: sale.phone,
          paymentMode: sale.payment_mode || 'cash',
        })) || []
      );
    } catch (error) {
      console.log('loadSalesLog error:', error);
      return [];
    }
  }

  async addSaleLog(saleRecord: SaleLog, existingSales?: SaleLog[]): Promise<number | null> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase.from('user_sales').insert({
        user_id: userId,
        total: saleRecord.total,
        time: saleRecord.time,
        date: saleRecord.date || '',
        items: saleRecord.items,
        customer_name: saleRecord.customerName,
        phone: saleRecord.phone,
        payment_mode: saleRecord.paymentMode || 'cash',
      }).select('id').single();

      if (error) throw error;
      return data?.id ?? null;
    } catch (error) {
      console.log('addSaleLog error:', error);
      return null;
    }
  }

  async deleteSaleLog(id: number) {
    try {
      const userId = this.getCurrentUserId();

      const { error } = await supabase
        .from('user_sales')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.log('deleteSaleLog error:', error);
      throw error;
    }
  }

  /* =========================
     SUPPLIERS
  ========================= */

  async loadSuppliers(): Promise<Supplier[]> {
    try {
      const userId = this.getCurrentUserId();

      // Load suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('user_suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (suppliersError) throw suppliersError;

      if (!suppliersData || suppliersData.length === 0) return [];

      // Load all transactions for this user in one query
      const { data: txData, error: txError } = await supabase
        .from('user_supplier_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (txError) throw txError;

      // Group transactions by supplier_id
      const txBySupplier: Record<number, Transaction[]> = {};
      (txData || []).forEach((tx) => {
        if (!txBySupplier[tx.supplier_id]) txBySupplier[tx.supplier_id] = [];
        txBySupplier[tx.supplier_id].push({
          id: tx.id,
          date: tx.date,
          type: tx.type,
          billId: tx.bill_id,
          billName: tx.bill_name,
          amount: Number(tx.amount),
          supplierId: tx.supplier_id,
          supplierName: tx.supplier_name,
        });
      });

      return suppliersData.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        bills: s.bills || [],
        transactions: txBySupplier[s.id] || [],
      }));
    } catch (error) {
      console.log('loadSuppliers error:', error);
      return [];
    }
  }

  async saveSuppliers(suppliers: Supplier[]) {
    try {
      const userId = this.getCurrentUserId();

      // Get existing supplier rows so we can upsert by id
      const { data: existing, error: fetchError } = await supabase
        .from('user_suppliers')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) throw fetchError;

      const existingIds = new Set((existing || []).map((r: any) => r.id));

      for (const s of suppliers) {
        if (existingIds.has(s.id)) {
          // Update existing supplier (bills only — transactions handled separately)
          const { error } = await supabase
            .from('user_suppliers')
            .update({
              name: s.name,
              category: s.category,
              bills: s.bills,
            })
            .eq('id', s.id)
            .eq('user_id', userId);

          if (error) throw error;
        } else {
          // Insert new supplier
          const { data: inserted, error } = await supabase
            .from('user_suppliers')
            .insert({
              user_id: userId,
              name: s.name,
              category: s.category,
              bills: s.bills,
            })
            .select('id')
            .single();

          if (error) throw error;

          // Update the in-memory supplier id to match the DB-generated id
          s.id = inserted.id;
        }
      }

      // Delete suppliers that were removed
      const currentIds = suppliers.map((s) => s.id);
      const toDelete = [...existingIds].filter((id) => !currentIds.includes(id));
      if (toDelete.length > 0) {
        const { error: supplierError } = await supabase
          .from('user_suppliers')
          .delete()
          .in('id', toDelete)
          .eq('user_id', userId);

        if (supplierError) throw supplierError;

        // Also delete associated transactions
        const { error: txError } = await supabase
          .from('user_supplier_transactions')
          .delete()
          .in('supplier_id', toDelete)
          .eq('user_id', userId);

        if (txError) throw txError;
      }
    } catch (error) {
      console.log('saveSuppliers error:', error);
      throw error;
    }
  }

  // Called when a bill is added to a supplier
  async addSupplierBill(supplier: Supplier, bill: Bill) {
    try {
      const userId = this.getCurrentUserId();

      // Update the supplier's bills array in DB
      const { error: billError } = await supabase
        .from('user_suppliers')
        .update({ bills: supplier.bills })
        .eq('id', supplier.id)
        .eq('user_id', userId);

      if (billError) throw billError;

      // Insert the transaction row
      const { data: inserted, error: txError } = await supabase
        .from('user_supplier_transactions')
        .insert({
          user_id: userId,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          type: 'bill',
          bill_id: bill.id,
          bill_name: bill.name,
          amount: bill.amount,
          date: bill.date,
        })
        .select('id')
        .single();

      if (txError) throw txError;

      return inserted.id; // return the real transaction id
    } catch (error) {
      console.log('addSupplierBill error:', error);
      throw error;
    }
  }

  // Called when a payment is recorded against a bill
  async addSupplierPayment(
    supplier: Supplier,
    bill: Bill,
    amount: number,
    date: string
  ) {
    try {
      const userId = this.getCurrentUserId();

      // Update the supplier's bills array (paid amount updated)
      const { error: billError } = await supabase
        .from('user_suppliers')
        .update({ bills: supplier.bills })
        .eq('id', supplier.id)
        .eq('user_id', userId);

      if (billError) throw billError;

      // Insert the payment transaction row
      const { data: inserted, error: txError } = await supabase
        .from('user_supplier_transactions')
        .insert({
          user_id: userId,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          type: 'payment',
          bill_id: bill.id,
          bill_name: bill.name,
          amount,
          date,
        })
        .select('id')
        .single();

      if (txError) throw txError;

      return inserted.id;
    } catch (error) {
      console.log('addSupplierPayment error:', error);
      throw error;
    }
  }

  // Load all payment transactions across all suppliers (for payment history screen)
  async loadAllSupplierTransactions(): Promise<Transaction[]> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_supplier_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((tx) => ({
        id: tx.id,
        date: tx.date,
        type: tx.type,
        billId: tx.bill_id,
        billName: tx.bill_name,
        amount: Number(tx.amount),
        supplierId: tx.supplier_id,
        supplierName: tx.supplier_name,
      }));
    } catch (error) {
      console.log('loadAllSupplierTransactions error:', error);
      return [];
    }
  }

  /* =========================
     SESSIONS
  ========================= */

  async loadSessions(): Promise<Session[]> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (
        data?.map((session) => ({
          id: session.id,
          session_id: session.session_id,
          customerName: session.customer_name,
          phone: session.phone,
          items: session.items || [],
          npVal: session.np_val,
        })) || []
      );
    } catch (error) {
      console.log('loadSessions error:', error);
      return [];
    }
  }

  async saveSessions(sessions: Session[]) {
    try {
      const userId = this.getCurrentUserId();

      await supabase.from('user_sessions').delete().eq('user_id', userId);

      if (sessions.length === 0) return;

      const formattedSessions = sessions.map((s) => ({
        user_id: userId,
        session_id: s.session_id,
        customer_name: s.customerName,
        phone: s.phone,
        items: s.items,
        np_val: s.npVal,
      }));

      const { error } = await supabase.from('user_sessions').insert(formattedSessions);

      if (error) throw error;
    } catch (error) {
      console.log('saveSessions error:', error);
    }
  }

  /* =========================
     TRIAL / SUBSCRIPTION
  ========================= */

  async saveTrialStart(date: string) {
    await AsyncStorage.setItem('trialStart', date);
  }

  async loadTrialStart() {
    return await AsyncStorage.getItem('trialStart');
  }

  async saveSubscriptionStatus(status: boolean) {
    await AsyncStorage.setItem('isSubscribed', status.toString());
  }

  async loadSubscriptionStatus() {
    const status = await AsyncStorage.getItem('isSubscribed');
    return status === 'true';
  }

  /* =========================
     LOGOUT CLEANUP
  ========================= */

  async logoutCleanup() {
    await this.clearAuthSession();
  }
}

export const db = new DatabaseService();