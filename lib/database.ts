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
    await AsyncStorage.setItem(
      'supabase_session',
      JSON.stringify(session)
    );
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
      .upsert({
        id: userId,
        ...profileData,
      });

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
          id: Date.now() + Math.floor(Math.random() * 1000),
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

      await supabase
        .from('user_products')
        .delete()
        .eq('user_id', userId);

      if (products.length === 0) return;

      const formattedProducts = products.map((p) => ({
        user_id: userId,
        name: p.name,
        price: p.price,
        unit: p.unit,
        sales: p.sales || 0,
      }));

      const { error } = await supabase
        .from('user_products')
        .insert(formattedProducts);

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
          id: Date.now() + Math.floor(Math.random() * 1000),
          total: Number(sale.total),
          time: sale.time,
          date: sale.date || '',
          items: sale.items || [],
          customerName: sale.customer_name,
          phone: sale.phone,
        })) || []
      );
    } catch (error) {
      console.log('loadSalesLog error:', error);
      return [];
    }
  }

  async addSaleLog(
    saleRecord: SaleLog,
    existingSales?: SaleLog[]
  ) {
    try {
      const userId = this.getCurrentUserId();

      const { error } = await supabase
        .from('user_sales')
        .insert({
          user_id: userId,
          total: saleRecord.total,
          time: saleRecord.time,
          date: saleRecord.date || '',
          items: saleRecord.items,
          customer_name: saleRecord.customerName,
          phone: saleRecord.phone,
        });

      if (error) throw error;
    } catch (error) {
      console.log('addSaleLog error:', error);
    }
  }

  /* =========================
     SUPPLIERS
  ========================= */

  async loadSuppliers(): Promise<Supplier[]> {
    try {
      const userId = this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (
        data?.map((supplier) => ({
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: supplier.name,
          category: supplier.category,
          bills: supplier.bills || [],
          transactions: supplier.transactions || [],
        })) || []
      );
    } catch (error) {
      console.log('loadSuppliers error:', error);
      return [];
    }
  }

  async saveSuppliers(suppliers: Supplier[]) {
    try {
      const userId = this.getCurrentUserId();

      await supabase
        .from('user_suppliers')
        .delete()
        .eq('user_id', userId);

      if (suppliers.length === 0) return;

      const formattedSuppliers = suppliers.map((s) => ({
        user_id: userId,
        name: s.name,
        category: s.category,
        bills: s.bills,
        transactions: s.transactions,
      }));

      const { error } = await supabase
        .from('user_suppliers')
        .insert(formattedSuppliers);

      if (error) throw error;
    } catch (error) {
      console.log('saveSuppliers error:', error);
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
          id: Date.now() + Math.floor(Math.random() * 1000),
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

      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (sessions.length === 0) return;

      const formattedSessions = sessions.map((s) => ({
        user_id: userId,
        session_id: s.session_id,
        customer_name: s.customerName,
        phone: s.phone,
        items: s.items,
        np_val: s.npVal,
      }));

      const { error } = await supabase
        .from('user_sessions')
        .insert(formattedSessions);

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
    await AsyncStorage.setItem(
      'isSubscribed',
      status.toString()
    );
  }

  async loadSubscriptionStatus() {
    const status = await AsyncStorage.getItem(
      'isSubscribed'
    );
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