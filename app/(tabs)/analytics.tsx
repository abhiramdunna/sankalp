import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  sales: number;
}

interface BillItem {
  name: string;
  price: number;
  qty: number;
  productId?: number;
}

interface SaleLog {
  id: number;
  total: number;
  time: string;
  items: BillItem[];
  customerName: string;
  phone: string;
}

// ============ Animated Counter Component ============
const AnimatedCounter: React.FC<{ value: number; prefix?: string; suffix?: string }> = ({ 
  value, 
  prefix = '', 
  suffix = '' 
}) => {
  const animValue = React.useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: value,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value: val }) => {
      setDisplayValue(Math.floor(val));
    });

    return () => animValue.removeListener(listener);
  }, [value]);

  return (
    <Text style={styles.heroValue}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </Text>
  );
};

// ============ Hero Card Component ============
const HeroCard: React.FC<{ revenue: number; changePercent: number }> = ({
  revenue,
  changePercent,
}) => (
  <View style={styles.heroCard}>
    <View style={styles.heroContent}>
      <Text style={styles.heroLabel}>Total Revenue</Text>
      <AnimatedCounter value={revenue} prefix="?" />
      
      <View style={styles.changeIndicator}>
        <Ionicons 
          name={changePercent >= 0 ? 'arrow-up' : 'arrow-down'} 
          size={14} 
          color="#2ECC71" 
        />
        <Text style={styles.changeText}>{Math.abs(changePercent)}%</Text>
      </View>
    </View>
  </View>
);

// ============ Metric Card Component ============
const MetricCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({
  icon,
  label,
  value,
  color,
}) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: color }]}>
      <Ionicons name={icon as any} size={24} color="#fff" />
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

// ============ Chart Bar Component ============
const ChartBar: React.FC<{ label: string; value: number; maxValue: number; color: string }> = ({
  label,
  value,
  maxValue,
  color,
}) => {
  const percentage = (value / maxValue) * 100;
  return (
    <View style={styles.chartBarItem}>
      <View style={styles.chartBarLabel}>
        <Text style={styles.chartBarLabelText}>{label}</Text>
        <Text style={styles.chartBarValue}>?{value.toLocaleString()}</Text>
      </View>
      <View style={styles.chartBarTrack}>
        <View style={[styles.chartBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

// ============ Main Analytics Screen ============
export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Dummy data for demonstration
  const dummySalesLog: SaleLog[] = [
    {
      id: 1,
      total: 450,
      time: '10:30 AM',
      items: [{ name: 'Puri plate', price: 20, qty: 5 }, { name: 'Tamarind water', price: 10, qty: 3 }],
      customerName: 'Rajesh',
      phone: '9876543210',
    },
    {
      id: 2,
      total: 280,
      time: '11:45 AM',
      items: [{ name: 'Masala puri', price: 25, qty: 4 }],
      customerName: 'Priya',
      phone: '9876543211',
    },
    {
      id: 3,
      total: 620,
      time: '1:20 PM',
      items: [{ name: 'Special plate', price: 40, qty: 5 }, { name: 'Idly 2pcs', price: 15, qty: 2 }],
      customerName: 'Vikram',
      phone: '9876543212',
    },
    {
      id: 4,
      total: 510,
      time: '3:15 PM',
      items: [{ name: 'Puri plate', price: 20, qty: 8 }],
      customerName: 'Ananya',
      phone: '9876543213',
    },
    {
      id: 5,
      total: 390,
      time: '5:40 PM',
      items: [{ name: 'Masala puri', price: 25, qty: 6 }],
      customerName: 'Dev',
      phone: '9876543214',
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        const demoProducts: Product[] = [
          { id: 1, name: 'Puri plate', price: 20, unit: 'pieces', sales: 25 },
          { id: 2, name: 'Masala puri', price: 25, unit: 'pieces', sales: 18 },
          { id: 3, name: 'Tamarind water', price: 10, unit: 'liters', sales: 12 },
          { id: 4, name: 'Special plate', price: 40, unit: 'pieces', sales: 8 },
          { id: 5, name: 'Idly 2pcs', price: 15, unit: 'pieces', sales: 10 },
        ];
        setProducts(demoProducts);
      }

      const storedSales = await AsyncStorage.getItem('salesLog');
      setSalesLog(storedSales ? JSON.parse(storedSales) : dummySalesLog);
    } catch (error) {
      console.error('Error loading data:', error);
      setSalesLog(dummySalesLog);
      setProducts([
        { id: 1, name: 'Puri plate', price: 20, unit: 'pieces', sales: 25 },
        { id: 2, name: 'Masala puri', price: 25, unit: 'pieces', sales: 18 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============ Calculations with useMemo ============
  const analytics = useMemo(() => {
    const calculateForDate = (date: string) => {
      // Filter sales for the selected date
      const dateSales = salesLog.filter(sale => {
        return true; // Show all sales regardless of date for now
      });

      const totalRevenue = dateSales.reduce((sum, sale) => sum + sale.total, 0);
      const totalBills = dateSales.length;
      const avgBill = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;
      const profit = Math.round(totalRevenue * 0.3);
      
      // Product performance
      const productPerformance: Record<string, { qty: number; revenue: number }> = {};
      dateSales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productPerformance[item.name]) {
            productPerformance[item.name] = { qty: 0, revenue: 0 };
          }
          productPerformance[item.name].qty += item.qty;
          productPerformance[item.name].revenue += item.price * item.qty;
        });
      });

      const topProducts = Object.entries(productPerformance)
        .map(([name, data]) => ({
          name,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const topProduct = topProducts[0];
      const changePercent = totalBills > 0 ? 12 : 0;

      return {
        totalRevenue,
        totalBills,
        avgBill,
        profit,
        topProduct,
        topProducts,
        changePercent,
      };
    };

    return calculateForDate(selectedDate);
  }, [selectedDate, salesLog]);

  const maxProductRevenue = Math.max(...analytics.topProducts.map(p => p.revenue), 1);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header} />
        <View style={styles.skeletonLoader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Week Selector */}
        <View style={styles.weekSelectorContainer}>
          <View style={styles.weekHeader}>
            <TouchableOpacity 
              style={styles.weekNavBtn}
              onPress={() => {
                const prevWeek = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 7));
                setSelectedDate(prevWeek.toISOString().split('T')[0]);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            
            <View style={styles.weekTitleContainer}>
              <Text style={styles.weekTitle}>
                {(() => {
                  const date = new Date(selectedDate);
                  const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(endOfWeek.getDate() + 6);
                  return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                })()}
              </Text>
              <Text style={styles.weekSubtitle}>
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.weekNavBtn}
              onPress={() => {
                const nextWeek = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 7));
                setSelectedDate(nextWeek.toISOString().split('T')[0]);
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysContainer}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(selectedDate);
              const dayDate = new Date(date.setDate(date.getDate() - date.getDay() + i));
              const dateStr = dayDate.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.weekDay, isSelected && styles.weekDaySelected]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[styles.weekDayLabel, isSelected && styles.weekDayLabelSelected]}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                  </Text>
                  <Text style={[styles.weekDayNumber, isSelected && styles.weekDayNumberSelected]}>
                    {dayDate.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hero Card */}
        <HeroCard
          revenue={analytics.totalRevenue}
          changePercent={analytics.changePercent}
        />

        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="bag"
            label="Bills"
            value={analytics.totalBills.toString()}
            color="#FF6B6B"
          />
          <MetricCard
            icon="cash"
            label="Avg Bill"
            value={`?${analytics.avgBill}`}
            color="#4ECDC4"
          />
          <MetricCard
            icon="trending-up"
            label="Profit"
            value={`?${analytics.profit}`}
            color="#45B7D1"
          />
          <MetricCard
            icon="star"
            label="Top Product"
            value={analytics.topProduct?.name.substring(0, 10) || 'N/A'}
            color="#95E1D3"
          />
        </View>

        {/* Revenue Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>?? Revenue Trend</Text>
          <Text style={styles.chartSub}>Last 7 days</Text>
          <View style={styles.trendBars}>
            {[2100, 2500, 2200, 2800, 2400, 2900, analytics.totalRevenue].map((val, idx) => (
              <View key={idx} style={styles.trendBar}>
                <View style={[styles.trendBarFill, { height: `${(val / 3000) * 100}%` }]} />
                <Text style={styles.trendLabel}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx].charAt(0)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Products */}
        {analytics.topProducts.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>?? Top Products</Text>
            <Text style={styles.chartSub}>By revenue</Text>
            {analytics.topProducts.slice(0, 4).map((product, idx) => (
              <ChartBar
                key={idx}
                label={product.name.substring(0, 12)}
                value={product.revenue}
                maxValue={maxProductRevenue}
                color="#2563EB"
              />
            ))}
          </View>
        )}

        {/* Smart Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.insightTitle}>?? Smart Insights</Text>
          
          <View style={styles.insightCard}>
            <Ionicons name="checkmark-circle" size={24} color="#2ECC71" />
            <View style={styles.insightContent}>
              <Text style={styles.insightCardTitle}>Top Performer</Text>
              <Text style={styles.insightCardText}>
                {analytics.topProduct?.name} leads with ?{analytics.topProduct?.revenue || 0}
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#3498DB" />
            <View style={styles.insightContent}>
              <Text style={styles.insightCardTitle}>Sales Growth</Text>
              <Text style={styles.insightCardText}>
                {analytics.changePercent}% increase from last period
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <Ionicons name="calculator" size={24} color="#F39C12" />
            <View style={styles.insightContent}>
              <Text style={styles.insightCardTitle}>Average Billing</Text>
              <Text style={styles.insightCardText}>
                Your average bill value is ?{analytics.avgBill}
              </Text>
            </View>
          </View>
        </View>

        {/* Export/Share Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social" size={20} color="#2563EB" />
            <Text style={styles.actionBtnText}>Export Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="stats-chart" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ Styles ============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 16,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  
  // Selector Section
  selectorSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  selectorBars: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayBar: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  dayBarActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayBarTextActive: {
    color: '#fff',
  },
  weekBar: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  weekBarActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  weekBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  weekBarTextActive: {
    color: '#fff',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthBar: {
    width: '23%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  monthBarActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  monthBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  monthBarTextActive: {
    color: '#fff',
  },
  
  // Period Filter
  periodFilter: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
  },
  periodBtnTextActive: {
    color: '#fff',
  },

  // Calendar Picker
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Week Selector
  weekSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 0,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weekNavBtn: {
    padding: 8,
    borderRadius: 8,
  },
  weekTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  weekTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  weekSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekDay: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  weekDaySelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  weekDayLabelSelected: {
    color: '#fff',
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekDayNumberSelected: {
    color: '#fff',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContent: {
    gap: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  heroSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  heroSubValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  changeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeUp: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  changeDown: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2ECC71',
  },

  // Metric Cards
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 8,
    textAlign: 'center',
  },

  // Chart Section
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  chartSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
  },
  
  // Trend Bars
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    gap: 8,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },

  // Chart Bar Item
  chartBarItem: {
    marginBottom: 16,
  },
  chartBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartBarLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
  },
  chartBarValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  chartBarTrack: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Insights Section
  insightsSection: {
    marginBottom: 24,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  insightContent: {
    flex: 1,
  },
  insightCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  insightCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },

  // Action Section
  actionSection: {
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Dropdown Menu
  dropdownContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },

  // Skeleton Loader
  skeletonLoader: {
    flex: 1,
    padding: 16,
    gap: 16,
  },

  // Bottom Navigation
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
});
