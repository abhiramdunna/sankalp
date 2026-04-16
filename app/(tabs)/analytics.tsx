import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
// import { LineChart, BarChart } from 'react-native-chart-kit'; // Package not installed

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  sales: number;
}

interface SaleLog {
  total: number;
  time: string;
  items: Array<{
    name: string;
    price: number;
    qty: number;
    productId?: number;
  }>;
  customerName: string;
  phone: string;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState('Week');
  const [products, setProducts] = useState<Product[]>([]);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);

  // Demo data for charts
  const weekData = [320, 450, 280, 510, 390, 620, 0];
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const threeWeekData = [8500, 9200, 0];
  const threeWeekLabels = ['W1', 'W2', 'W3'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }

      const storedSales = await AsyncStorage.getItem('salesLog');
      if (storedSales) {
        const parsed = JSON.parse(storedSales);
        setSalesLog(parsed);
        const total = parsed.reduce((sum: number, sale: SaleLog) => sum + sale.total, 0);
        setTodayTotal(total);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Update today's sales in week data
  useEffect(() => {
    if (salesLog.length > 0) {
      weekData[6] = todayTotal;
    }
  }, [todayTotal, salesLog]);

  const totalBills = salesLog.length;
  const avgBill = totalBills ? Math.round(todayTotal / totalBills) : 0;
  
  // Product statistics
  const productStats = products.map(p => ({
    name: p.name,
    sales: p.sales || 0,
    revenue: (p.sales || 0) * p.price
  }));
  productStats.sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...productStats.map(x => x.revenue), 1);
  const bestSeller = productStats[0];
  const leastSeller = [...productStats].sort((a, b) => a.sales - b.sales)[0];

  // Period calculations
  const getPeriodRevenue = () => {
    switch (activePeriod) {
      case 'Today':
        return todayTotal;
      case 'Week':
        return weekData.reduce((a, b) => a + b, 0);
      case '3 Weeks':
        return threeWeekData.reduce((a, b) => a + b, 0);
      case 'Month':
        const avgDay = weekData.reduce((a, b) => a + b, 0) / 7;
        return Math.round(avgDay * 30);
      default:
        return todayTotal;
    }
  };

  const getPeriodProfit = () => {
    const revenue = getPeriodRevenue();
    return Math.round(revenue * 0.28);
  };

  const monthEstimate = Math.round((weekData.reduce((a, b) => a + b, 0) / 7) * 30);
  const monthlyProfit = Math.round(monthEstimate * 0.28);

  // Chart configuration
  const screenWidth = Dimensions.get('window').width - 32;
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(252, 128, 25, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📊 Analytics</Text>
          <Text style={styles.headerSub}>Business insights at a glance</Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodTabs}>
          {['Today', 'Week', '3 Weeks', 'Month'].map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodTab, activePeriod === period && styles.activePeriodTab]}
              onPress={() => setActivePeriod(period)}
            >
              <Text style={[styles.periodTabText, activePeriod === period && styles.activePeriodText]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Revenue</Text>
          <Text style={styles.revenueValue}>₹{getPeriodRevenue().toLocaleString('en-IN')}</Text>
          <Text style={styles.revenueSub}>{activePeriod} collection</Text>
          <View style={styles.profitBadge}>
            <Text style={styles.profitText}>💰 Estimated profit: ₹{getPeriodProfit().toLocaleString('en-IN')} (~28%)</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today Bills</Text>
            <Text style={styles.statValue}>{totalBills}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Bill</Text>
            <Text style={[styles.statValue, { color: '#FC8019' }]}>₹{avgBill.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Est. Monthly</Text>
            <Text style={[styles.statValue, { color: '#FC8019' }]}>₹{monthEstimate.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Monthly Profit</Text>
            <Text style={[styles.statValue, { color: '#27500A' }]}>₹{monthlyProfit.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Week Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>📅 Week Sales</Text>
            <View style={styles.chartBadge}>
              <Text style={styles.chartBadgeText}>
                ▲ {weekData[5] > 0 ? Math.round(((weekData[6] - weekData[5]) / weekData[5]) * 100) : 0}% vs yesterday
              </Text>
            </View>
          </View>
          {/* <BarChart
            data={{
              labels: weekLabels,
              datasets: [{ data: weekData }]
            }}
            width={screenWidth}
            height={200}
            yAxisLabel="₹"
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            showValuesOnTopOfBars={true}
            fromZero={true}
          /> */}
          <Text style={styles.chartNote}>Green bar = today</Text>
        </View>

        {/* 3 Week Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>📆 Last 3 Weeks</Text>
          {/* <BarChart
            data={{
              labels: threeWeekLabels,
              datasets: [{ data: threeWeekData }]
            }}
            width={screenWidth}
            height={200}
            yAxisLabel="₹"
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(24, 95, 165, ${opacity})`,
            }}
            showValuesOnTopOfBars={true}
            fromZero={true}
          /> */}
        </View>

        {/* Best Seller */}
        {bestSeller && bestSeller.sales > 0 && (
          <View style={styles.trophyCard}>
            <Text style={styles.trophyEmoji}>🏆</Text>
            <View>
              <Text style={styles.trophyLabel}>Best Seller Today</Text>
              <Text style={styles.trophyName}>{bestSeller.name}</Text>
              <Text style={styles.trophySub}>
                {bestSeller.sales} sold · ₹{bestSeller.revenue.toLocaleString('en-IN')} revenue
              </Text>
            </View>
          </View>
        )}

        {/* Least Seller */}
        {leastSeller && leastSeller.sales >= 0 && productStats.length > 1 && (
          <View style={styles.lowCard}>
            <Text style={styles.lowEmoji}>📉</Text>
            <View>
              <Text style={styles.lowLabel}>Least Selling</Text>
              <Text style={styles.lowName}>{leastSeller.name}</Text>
              <Text style={styles.lowSub}>
                {leastSeller.sales} sold · consider promoting it
              </Text>
            </View>
          </View>
        )}

        {/* Product Revenue Bars */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>💰 Product Revenue</Text>
          {productStats.length > 0 ? (
            productStats.map((prod, idx) => (
              <View key={idx} style={styles.hbarItem}>
                <View style={styles.hbarLabelRow}>
                  <Text style={styles.hbarLabel}>{prod.name}</Text>
                  <Text style={styles.hbarAmount}>₹{prod.revenue.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.hbarTrack}>
                  <View 
                    style={[
                      styles.hbarFill, 
                      { width: `${Math.round((prod.revenue / maxRevenue) * 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Sell items to see data</Text>
          )}
        </View>

        {/* Units Sold */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>🔢 Units Sold Today</Text>
          {productStats.length > 0 ? (
            productStats.map((prod, idx) => {
              const maxSales = Math.max(...productStats.map(x => x.sales), 1);
              return (
                <View key={idx} style={styles.hbarItem}>
                  <View style={styles.hbarLabelRow}>
                    <Text style={styles.hbarLabel}>{prod.name}</Text>
                    <Text style={[styles.hbarAmount, { color: '#27500A' }]}>
                      {prod.sales} sold
                    </Text>
                  </View>
                  <View style={styles.hbarTrack}>
                    <View 
                      style={[
                        styles.hbarFillGreen, 
                        { width: `${Math.round((prod.sales / maxSales) * 100)}%` }
                      ]} 
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noDataText}>Sell items to see data</Text>
          )}
        </View>
        
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="stats-chart" size={24} color="#FC8019" />
          <Text style={[styles.navLabel, { color: '#FC8019' }]}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FC8019',
    padding: 16,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  periodTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  periodTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  activePeriodTab: {
    backgroundColor: '#FC8019',
    borderColor: '#FC8019',
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#888',
  },
  activePeriodText: {
    color: '#fff',
  },
  revenueCard: {
    backgroundColor: '#FC8019',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  revenueLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  revenueSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    fontWeight: '700',
  },
  profitBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  profitText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eee',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#222',
    marginTop: 6,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#eee',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
  },
  chartBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#EAF3DE',
  },
  chartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#27500A',
  },
  chartNote: {
    fontSize: 10,
    color: '#bbb',
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 8,
  },
  trophyCard: {
    backgroundColor: '#fff8f0',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FC8019',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trophyEmoji: {
    fontSize: 36,
  },
  trophyLabel: {
    fontSize: 11,
    color: '#FC8019',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trophyName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
    marginTop: 2,
  },
  trophySub: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
    fontWeight: '600',
  },
  lowCard: {
    backgroundColor: '#fff8f8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f5c1c1',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lowEmoji: {
    fontSize: 32,
  },
  lowLabel: {
    fontSize: 11,
    color: '#A32D2D',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lowName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
    marginTop: 2,
  },
  lowSub: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  hbarItem: {
    marginBottom: 10,
  },
  hbarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hbarLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },
  hbarAmount: {
    fontSize: 12,
    color: '#FC8019',
    fontWeight: '800',
  },
  hbarTrack: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    overflow: 'hidden',
  },
  hbarFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#FC8019',
  },
  hbarFillGreen: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#27500A',
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    color: '#bbb',
    fontSize: 13,
  },
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 9,
    color: '#aaa',
    fontWeight: '700',
    marginTop: 2,
  },
});