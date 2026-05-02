// lib/database.ts
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './store';

// Types remain the same...
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

class DatabaseService {
  private getCurrentUserId(): string | null {
    const { user } = useAuthStore.getState();
    return user?.id || null;
  }

  private isAuthenticated(): boolean {
    const userId = this.getCurrentUserId();
    return !!userId;
  }

  // ==================== Products ====================
  async loadProducts(): Promise<Product[]> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping products load');
      return [];
    }

    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        unit: item.unit,
        sales: item.sales || 0
      }));
    } catch (error) {
      console.error('Error loading products from DB:', error);
      return [];
    }
  }

  async saveProducts(products: Product[]): Promise<void> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping products save');
      await AsyncStorage.setItem('products', JSON.stringify(products));
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (products.length > 0) {
        const { error: insertError } = await supabase
          .from('user_products')
          .insert(
            products.map(p => ({
              user_id: userId,
              name: p.name,
              price: p.price,
              unit: p.unit,
              sales: p.sales || 0
            }))
          );

        if (insertError) throw insertError;
      }

      await AsyncStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error('Error saving products to DB:', error);
      await AsyncStorage.setItem('products', JSON.stringify(products));
    }
  }

  // ==================== Sessions ====================
  async loadSessions(): Promise<Session[]> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping sessions load');
      return [];
    }

    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.session_id,
        customerName: item.customer_name || 'Walk-in Customer',
        phone: item.phone || '',
        items: item.items || [],
        npVal: item.np_val || '0'
      }));
    } catch (error) {
      console.error('Error loading sessions from DB:', error);
      return [];
    }
  }

  async saveSessions(sessions: Session[]): Promise<void> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping sessions save');
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (sessions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_sessions')
          .insert(
            sessions.map(s => ({
              user_id: userId,
              session_id: s.id,
              customer_name: s.customerName,
              phone: s.phone,
              items: s.items,
              np_val: s.npVal || '0'
            }))
          );

        if (insertError) throw insertError;
      }

      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving sessions to DB:', error);
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
    }
  }

  // ==================== Sales Log ====================
  async loadSalesLog(): Promise<SaleLog[]> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping sales log load');
      return [];
    }

    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.sale_id,
        total: item.total,
        time: item.time,
        date: item.date,
        items: item.items,
        customerName: item.customer_name || 'Walk-in Customer',
        phone: item.phone || ''
      }));
    } catch (error) {
      console.error('Error loading sales from DB:', error);
      return [];
    }
  }

  async addSaleLog(sale: SaleLog, existingSales: SaleLog[]): Promise<SaleLog[]> {
    const updated = [sale, ...existingSales];
    await AsyncStorage.setItem('salesLog', JSON.stringify(updated));

    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping sale save to DB');
      return updated;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return updated;

    try {
      const { error } = await supabase
        .from('user_sales')
        .insert({
          user_id: userId,
          sale_id: sale.id,
          total: sale.total,
          time: sale.time,
          date: sale.date,
          items: sale.items,
          customer_name: sale.customerName,
          phone: sale.phone
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding sale to DB:', error);
    }
    
    return updated;
  }

  // ==================== Suppliers ====================
  async loadSuppliers(): Promise<Supplier[]> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping suppliers load');
      return [];
    }

    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_suppliers')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.supplier_id,
        name: item.name,
        category: item.category,
        bills: item.bills || [],
        transactions: item.transactions || []
      }));
    } catch (error) {
      console.error('Error loading suppliers from DB:', error);
      return [];
    }
  }

  async saveSuppliers(suppliers: Supplier[]): Promise<void> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping suppliers save');
      await AsyncStorage.setItem('suppliers_v2', JSON.stringify(suppliers));
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) return;

    try {
      const { error: deleteError } = await supabase
        .from('user_suppliers')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (suppliers.length > 0) {
        const { error: insertError } = await supabase
          .from('user_suppliers')
          .insert(
            suppliers.map(s => ({
              user_id: userId,
              supplier_id: s.id,
              name: s.name,
              category: s.category,
              bills: s.bills,
              transactions: s.transactions
            }))
          );

        if (insertError) throw insertError;
      }

      await AsyncStorage.setItem('suppliers_v2', JSON.stringify(suppliers));
    } catch (error) {
      console.error('Error saving suppliers to DB:', error);
      await AsyncStorage.setItem('suppliers_v2', JSON.stringify(suppliers));
    }
  }

  // ==================== Sync All Data ====================
  async syncAllData(): Promise<void> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, skipping sync');
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      console.log('No user ID, skipping sync');
      return;
    }

    console.log('🔄 Syncing data for user:', userId);

    try {
      const [products, sessions, salesLog, suppliers] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('sessions'),
        AsyncStorage.getItem('salesLog'),
        AsyncStorage.getItem('suppliers_v2')
      ]);

      if (products) {
        await this.saveProducts(JSON.parse(products));
        console.log('✅ Products synced');
      }

      if (sessions) {
        await this.saveSessions(JSON.parse(sessions));
        console.log('✅ Sessions synced');
      }

      if (salesLog) {
        const sales = JSON.parse(salesLog);
        for (const sale of sales) {
          await this.addSaleLog(sale, []);
        }
        console.log('✅ Sales synced');
      }

      if (suppliers) {
        await this.saveSuppliers(JSON.parse(suppliers));
        console.log('✅ Suppliers synced');
      }

      console.log('✅ All data synced successfully');
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  async loadAllDataFromDB(): Promise<{
    products: Product[];
    sessions: Session[];
    salesLog: SaleLog[];
    suppliers: Supplier[];
  }> {
    if (!this.isAuthenticated()) {
      console.log('No authenticated user, returning empty data');
      return { products: [], sessions: [], salesLog: [], suppliers: [] };
    }

    const [products, sessions, salesLog, suppliers] = await Promise.all([
      this.loadProducts(),
      this.loadSessions(),
      this.loadSalesLog(),
      this.loadSuppliers()
    ]);

    return { products, sessions, salesLog, suppliers };
  }
}

export const db = new DatabaseService();