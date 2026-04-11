import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const days = [40, 60, 35, 70, 50, 85, 22];

export default function Analytics() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.sub}>Product sales & revenue insights</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        <View style={styles.grid}>
          {['Today Revenue ₹0', 'Bills Today 0', 'Avg Bill ₹0', 'Products 4'].map((x) => (
            <View key={x} style={styles.metric}><Text style={styles.metricText}>{x}</Text></View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Weekly Sales Trend</Text>
          <View style={styles.bars}>
            {days.map((h, i) => (
              <View key={i} style={[styles.bar, { height: h, backgroundColor: i === 6 ? '#4d7c0f' : '#fb923c' }]} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Product Revenue</Text>
          {['Puri plate', 'Masala puri', 'Tamarind water', 'Special plate'].map((p) => (
            <View key={p} style={styles.row}>
              <Text>{p}</Text>
              <Text style={{ color: '#f97316', fontWeight: '700' }}>₹0</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#f97316', padding: 14 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sub: { color: '#ffedd5' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.7%', backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  metricText: { textAlign: 'center', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  bars: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bar: { flex: 1, borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
});