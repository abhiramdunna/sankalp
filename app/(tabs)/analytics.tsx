// analytics.tsx — Complete redesign matching the screenshot UI
// Matches home.tsx style system: #2563EB blue, same nav, same card patterns

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface BillItem {
  name: string;
  price: number;
  qty: number;
}

interface SaleLog {
  id: number;
  total: number;
  time: string;
  date?: string;
  items: BillItem[];
  customerName: string;
  phone: string;
}

// ─────────────────────────────────────────────
// DUMMY SALES DATA
// ─────────────────────────────────────────────
const DUMMY_SALES: SaleLog[] = [];

// 30 daily data points for April (all zeros - no data yet)
const APRIL_DATA = [
  0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const APRIL_LABELS = Array.from({ length: 30 }, (_, i) => `${i + 1} Apr`);

// Chart dimensions
const CHART_H = 150;
const CHART_W = SCREEN_WIDTH - 84; // 16 margin + 4 gap + 48 y-axis + 16 margin

// ─────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────
const AnimatedCounter: React.FC<{ value: number; textStyle: any }> = ({ value, textStyle }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(Math.floor(v)));
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={textStyle}>₹{display.toLocaleString('en-IN')}</Text>;
};

// ─────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────
const formatDateShort = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}`;
};

const formatDateRange = (start: Date, end: Date) => {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
};

// ─────────────────────────────────────────────
// SIMPLE CALENDAR PICKER
// ─────────────────────────────────────────────
interface CalendarPickerProps {
  mode: 'range' | 'single';
  onConfirm: (start?: Date, end?: Date, single?: Date) => void;
  onCancel: () => void;
  initialStart?: Date;
  initialEnd?: Date;
  initialSingle?: Date;
}

const SimpleCalendarPicker: React.FC<CalendarPickerProps> = ({
  mode,
  onConfirm,
  onCancel,
  initialStart,
  initialEnd,
  initialSingle,
}) => {
  const [tempStart, setTempStart] = useState(initialStart || new Date());
  const [tempEnd, setTempEnd] = useState(initialEnd || new Date());
  const [tempSingle, setTempSingle] = useState(initialSingle || new Date());
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const currentDate = mode === 'range' && selecting === 'end' ? tempEnd : mode === 'range' ? tempStart : tempSingle;
  const days = generateDays(currentDate);
  const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][currentDate.getMonth()];
  const year = currentDate.getFullYear();

  const handleDayPress = (day: number | null) => {
    if (day === null) return;
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    if (mode === 'range') {
      if (selecting === 'start') {
        setTempStart(newDate);
        setSelecting('end');
      } else {
        if (newDate < tempStart) {
          setTempStart(newDate);
          setTempEnd(tempStart);
        } else {
          setTempEnd(newDate);
        }
        setSelecting('start');
      }
    } else {
      setTempSingle(newDate);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    if (mode === 'range' && selecting === 'end') {
      setTempEnd(newDate);
    } else if (mode === 'range') {
      setTempStart(newDate);
    } else {
      setTempSingle(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    if (mode === 'range' && selecting === 'end') {
      setTempEnd(newDate);
    } else if (mode === 'range') {
      setTempStart(newDate);
    } else {
      setTempSingle(newDate);
    }
  };

  const isDateInRange = (day: number) => {
    if (mode !== 'range') return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date >= tempStart && date <= tempEnd;
  };

  const isDateSelected = (day: number) => {
    if (mode === 'range') {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      return date.getTime() === tempStart.getTime() || date.getTime() === tempEnd.getTime();
    } else {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      return date.getTime() === tempSingle.getTime();
    }
  };

  return (
    <Modal transparent visible={true} animationType="fade">
      <View style={calendarStyles.backdrop}>
        <View style={calendarStyles.container}>
          <View style={calendarStyles.header}>
            <Text style={calendarStyles.title}>
              {mode === 'range' ? (selecting === 'start' ? 'Select Start Date' : 'Select End Date') : 'Select Date'}
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={calendarStyles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color="#2563EB" />
            </TouchableOpacity>
            <Text style={calendarStyles.monthTitle}>{monthName} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={calendarStyles.weekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={calendarStyles.weekDay}>{day}</Text>
            ))}
          </View>

          <View style={calendarStyles.daysGrid}>
            {days.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleDayPress(day)}
                style={[
                  calendarStyles.dayButton,
                  !day && calendarStyles.emptyDay,
                  isDateSelected(day!) && calendarStyles.selectedDay,
                  isDateInRange(day!) && calendarStyles.inRangeDay,
                ]}
                disabled={!day}
              >
                <Text style={[
                  calendarStyles.dayText,
                  !day && calendarStyles.emptyDayText,
                  isDateSelected(day!) && calendarStyles.selectedDayText,
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={calendarStyles.footer}>
            <TouchableOpacity
              style={calendarStyles.cancelBtn}
              onPress={onCancel}
            >
              <Text style={calendarStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={calendarStyles.confirmBtn}
              onPress={() => {
                if (mode === 'range') {
                  onConfirm(tempStart, tempEnd);
                } else {
                  onConfirm(undefined, undefined, tempSingle);
                }
              }}
            >
              <Text style={calendarStyles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// DATE FILTER DROPDOWN MENU
// ─────────────────────────────────────────────
interface DateFilterMenuProps {
  visible: boolean;
  onSelect: (key: string, start?: Date, end?: Date) => void;
  onClose: () => void;
  currentStartDate?: Date;
  currentEndDate?: Date;
}

const DateFilterMenu: React.FC<DateFilterMenuProps> = ({ visible, onSelect, onClose, currentStartDate, currentEndDate }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Format current custom range
  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  };

  const customRangeDesc = currentStartDate && currentEndDate
    ? `${formatDate(currentStartDate)} - ${formatDate(currentEndDate)}`
    : 'Select Start & End Date';

  const menuItems = [
    {
      key: 'month',
      label: 'This Month',
      desc: `1st Apr to Today (${today.getDate()} Apr)`,
      icon: 'calendar-sharp',
      color: '#2563EB',
      start: monthStart,
      end: today,
    },
    {
      key: 'today',
      label: 'Today',
      desc: today.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      icon: 'today',
      color: '#22C55E',
      start: today,
      end: today,
    },
    {
      key: 'yesterday',
      label: 'Yesterday',
      desc: yesterday.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      icon: 'arrow-back-circle',
      color: '#A78BFA',
      start: yesterday,
      end: yesterday,
    },
    {
      key: 'week',
      label: 'This Week',
      desc: `${weekStart.getDate()} Apr - ${today.getDate()} Apr`,
      icon: 'calendar-sharp',
      color: '#F97316',
      start: weekStart,
      end: today,
    },
    {
      key: 'custom',
      label: 'Custom Range',
      desc: customRangeDesc,
      icon: 'calendar-outline',
      color: '#EC4899',
      start: undefined,
      end: undefined,
    },
  ];

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        dropdownStyles.overlay,
        { opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          dropdownStyles.menuContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={dropdownStyles.menuItem}
            onPress={() => {
              onSelect(item.key, item.start, item.end);
              onClose();
            }}
          >
            <View style={[dropdownStyles.iconBox, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dropdownStyles.menuItemLabel}>{item.label}</Text>
              <Text style={dropdownStyles.menuItemDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="checkmark" size={20} color="#2563EB" style={{ opacity: 0 }} />
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// LINE CHART — Pure React Native, no SVG lib
// ─────────────────────────────────────────────
interface ChartProps {
  data: number[];
  labels: string[];
  activeIdx: number;
  onPressIdx: (i: number) => void;
}

const LineChart: React.FC<ChartProps> = ({ data, labels, activeIdx, onPressIdx }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ width: CHART_W, height: CHART_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Pixel coordinates for each data point
  const pts = data.map((v, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * CHART_W : CHART_W / 2,
    y: CHART_H - ((v - min) / range) * (CHART_H - 20) - 10,
  }));

  const ap = pts[activeIdx];

  return (
    <View style={{ width: CHART_W, height: CHART_H }}>

      {/* Horizontal grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <View
          key={`grid-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: CHART_H * t,
            height: 0.5,
            backgroundColor: '#E5E7EB',
          }}
        />
      ))}

      {/* Shaded area fill under line */}
      {pts.slice(0, -1).map((p, i) => {
        const nx = pts[i + 1];
        const topY = Math.min(p.y, nx.y) - 2;
        return (
          <View
            key={`area-${i}`}
            style={{
              position: 'absolute',
              left: p.x,
              width: nx.x - p.x + 1,
              top: topY,
              bottom: 0,
              backgroundColor: 'rgba(37,99,235,0.07)',
            }}
          />
        );
      })}

      {/* Line segments */}
      {pts.slice(0, -1).map((p, i) => {
        const nx = pts[i + 1];
        const dx = nx.x - p.x;
        const dy = nx.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`seg-${i}`}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y - 1.25,
              width: len,
              height: 2.5,
              backgroundColor: '#2563EB',
              borderRadius: 2,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* Tap zones + dots */}
      {pts.map((p, i) => {
        const isActive = i === activeIdx;
        return (
          <TouchableOpacity
            key={`tap-${i}`}
            onPress={() => onPressIdx(i)}
            hitSlop={{ top: 16, bottom: 16, left: 6, right: 6 }}
            style={{
              position: 'absolute',
              left: p.x - (isActive ? 7 : 4),
              top: p.y - (isActive ? 7 : 4),
              width: isActive ? 14 : 8,
              height: isActive ? 14 : 8,
              borderRadius: isActive ? 7 : 4,
              backgroundColor: isActive ? '#fff' : '#2563EB',
              borderWidth: isActive ? 2.5 : 0,
              borderColor: '#2563EB',
              elevation: isActive ? 4 : 0,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
            }}
          />
        );
      })}

      {/* Active vertical drop-line */}
      {ap && (
        <View
          style={{
            position: 'absolute',
            left: ap.x - 0.75,
            top: ap.y + 8,
            bottom: 0,
            width: 1.5,
            backgroundColor: 'rgba(37,99,235,0.2)',
          }}
        />
      )}

      {/* Tooltip */}
      {ap && (
        <View
          style={{
            position: 'absolute',
            left: Math.min(Math.max(ap.x - 52, 0), CHART_W - 115),
            top: Math.max(ap.y - 60, 0),
            backgroundColor: '#1E3A8A',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            elevation: 6,
            shadowColor: '#1E3A8A',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', marginBottom: 2 }}>
            {labels[activeIdx]}
          </Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
            ₹{data[activeIdx].toLocaleString('en-IN')}
          </Text>
        </View>
      )}

    </View>
  );
};

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
type FilterKey = 'month' | 'custom' | 'date';
type TrendKey = 'Daily' | 'Weekly' | 'Monthly';

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('month');
  const [activeTrend, setActiveTrend] = useState<TrendKey>('Daily');
  const [showTrendMenu, setShowTrendMenu] = useState(false);
  const [activeChartIdx, setActiveChartIdx] = useState(19); // 20 Apr
  
  // Date selection states
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [startDate, setStartDate] = useState(new Date(2025, 3, 1)); // 01 Apr 2025
  const [endDate, setEndDate] = useState(new Date());
  const [filterLabel, setFilterLabel] = useState('This Month');
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  // Load sales from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('salesLog');
        setSalesLog(stored ? JSON.parse(stored) : DUMMY_SALES);
      } catch {
        setSalesLog(DUMMY_SALES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper: Filter sales by date range
  const filterSalesByDateRange = (sales: SaleLog[], start: Date, end: Date) => {
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    return sales.filter(bill => {
      if (!bill.date) return false;
      // Parse date string like "21 Apr" to compare
      const parts = bill.date.split(' ');
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const billDate = new Date(new Date().getFullYear(), months[monthStr] || 0, day);
      return billDate >= startOfDay && billDate <= endOfDay;
    });
  };

  // Generate chart data for selected date range
  const generateChartData = (sales: SaleLog[], start: Date, end: Date) => {
    const filtered = filterSalesByDateRange(sales, start, end);
    
    // Group by date
    const byDate: Record<string, number> = {};
    filtered.forEach(bill => {
      const date = bill.date || 'Unknown';
      byDate[date] = (byDate[date] || 0) + bill.total;
    });

    // Generate all dates in range
    const dates = [];
    const labels = [];
    const current = new Date(start);
    while (current <= end) {
      const d = current.getDate();
      const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][current.getMonth()];
      const dateStr = `${d} ${m}`;
      dates.push(byDate[dateStr] || 0);
      labels.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    return { data: dates, labels };
  };

  // Get filtered data
  const filteredSales = useMemo(() => filterSalesByDateRange(salesLog, startDate, endDate), 
    [salesLog, startDate, endDate]);

  // Compute analytics from filtered sales log
  const analytics = useMemo(() => {
    // Calculate from filtered sales log data
    const totalRevenue = filteredSales.reduce((sum, bill) => sum + bill.total, 0);
    const totalBills = filteredSales.length;
    const avgBill = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;
    
    // Group by date to find best day
    const byDate: Record<string, number> = {};
    filteredSales.forEach(bill => {
      const date = bill.date || 'Unknown';
      byDate[date] = (byDate[date] || 0) + bill.total;
    });
    
    const dateEntries = Object.entries(byDate).sort((a, b) => b[1] - a[1]);
    const bestDay = dateEntries[0]?.[0] || 'N/A';
    const bestDayAmount = dateEntries[0]?.[1] || 0;
    
    const pendingBills = 0; // No pending data yet
    const avgBillChange = 0; // Comparison data not available yet
    const monthChange = 0; // Comparison data not available yet

    // Product performance from filtered sales log
    const perf: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s =>
      s.items.forEach(it => {
        if (!perf[it.name]) perf[it.name] = { qty: 0, revenue: 0 };
        perf[it.name].qty += it.qty;
        perf[it.name].revenue += it.price * it.qty;
      })
    );

    const topProducts = Object.entries(perf)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProduct = topProducts[0] ?? { name: 'Quick Entry', qty: 0, revenue: 0 };

    return {
      totalRevenue,
      totalBills,
      pendingBills,
      avgBill,
      avgBillChange,
      monthChange,
      bestDay,
      bestDayAmount,
      topProduct,
      topProducts,
    };
  }, [filteredSales]);

  // Generate chart data
  const chartData = useMemo(() => generateChartData(salesLog, startDate, endDate), 
    [salesLog, startDate, endDate]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
    { key: 'date', label: 'Select Date' },
  ];

  const TRENDS: TrendKey[] = ['Daily', 'Weekly', 'Monthly'];
  const Y_TICKS = [2500, 2000, 1500, 1000, 500, 0];
  const BAR_COLORS = ['#2563EB', '#6366F1', '#22C55E', '#F97316', '#EC4899'];

  // ── Transactions Modal Component ──
  const TransactionsModal = () => (
    <Modal animationType="slide" transparent visible={showTransactionsModal} onRequestClose={() => setShowTransactionsModal(false)}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111' }}>Transactions</Text>
          <TouchableOpacity onPress={() => setShowTransactionsModal(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Date Range Info */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>
            {formatDateRange(startDate, endDate)} • {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Transactions List */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {filteredSales.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={{ marginTop: 12, fontSize: 14, color: '#9CA3AF', fontWeight: '600' }}>No transactions found</Text>
            </View>
          ) : (
            filteredSales.map((bill, idx) => (
              <View key={idx} style={{ borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 }}>
                      {bill.customerName || 'Walk-in Customer'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
                      {bill.date} • {bill.time}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#2563EB' }}>
                    ₹{bill.total.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {bill.items.slice(0, 3).map((item, i) => (
                    <View key={i} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '600' }}>
                        {item.name} x{item.qty}
                      </Text>
                    </View>
                  ))}
                  {bill.items.length > 3 && (
                    <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>
                        +{bill.items.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Footer */}
        {filteredSales.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#2563EB' }}>
                ₹{filteredSales.reduce((sum, bill) => sum + bill.total, 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Analytics</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Loading...</Text>
        </View>
        
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        {/* Title */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Analytics</Text>
          </View>
        </View>

        {/* Unified Date Filter Chip */}
        <TouchableOpacity
          style={styles.unifiedFilterChip}
          onPress={() => setShowDateMenu(!showDateMenu)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={16} color="#fff" />
          <Text style={styles.filterLabelBold}>{filterLabel}</Text>
          <Text style={styles.filterSeparator}>•</Text>
          <Text style={styles.dateRangeLight}>
            {String(startDate.getDate()).padStart(2, '0')} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][startDate.getMonth()]} – {String(endDate.getDate()).padStart(2, '0')} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][endDate.getMonth()]}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="#fff"
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {/* Date Filter Dropdown */}
        <DateFilterMenu
          visible={showDateMenu}
          currentStartDate={startDate}
          currentEndDate={endDate}
          onSelect={(key, start, end) => {
            setFilterLabel(key === 'month' ? 'This Month' : key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : key === 'week' ? 'This Week' : 'Custom Range');
            if (key === 'custom') {
              setShowDateMenu(false);
              setShowCustomCalendar(true);
            } else if (start && end) {
              setStartDate(start);
              setEndDate(end);
              setActiveFilter(key as FilterKey);
            }
          }}
          onClose={() => setShowDateMenu(false)}
        />
      </LinearGradient>

      {/* ══════════════════════════════════════
          SCROLL BODY
      ══════════════════════════════════════ */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >

        {/* ── Monthly Collection Card ── */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.collectionCard}
        >
          <View style={styles.collectionInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.collectionLabel}>COLLECTION</Text>
              <AnimatedCounter value={analytics.totalRevenue} textStyle={styles.collectionAmount} />
              <Text style={styles.collectionDateRange}>{formatDateRange(startDate, endDate)}</Text>
              <View style={styles.collectionChangeRow}>
                <Ionicons name="arrow-up" size={14} color="#22C55E" />
                <Text style={styles.collectionChangeVal}>{analytics.monthChange}%</Text>
                <Text style={styles.collectionChangeSub}> vs. previous period</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                alignSelf: 'flex-end',
                backgroundColor: '#2563EB',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
              onPress={() => setShowTransactionsModal(true)}
            >
              <Ionicons name="list" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>View</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── 3 Metric Cards ── */}
        <View style={styles.metricRow}>

          {/* Total Bills */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="document-text-outline" size={22} color="#6366F1" />
            </View>
            <Text style={styles.metricLabel}>TOTAL BILLS</Text>
            <Text style={styles.metricValue}>{analytics.totalBills}</Text>
            <Text style={styles.metricSubGreen}>{analytics.pendingBills} pending</Text>
          </View>

          {/* Average Bill */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="grid-outline" size={22} color="#22C55E" />
            </View>
            <Text style={styles.metricLabel}>AVERAGE BILL</Text>
            <Text style={styles.metricValue}>₹{analytics.avgBill}</Text>
            <View style={styles.metricChangeRow}>
              <Ionicons name="arrow-up" size={10} color="#22C55E" />
              <Text style={styles.metricChangeText}>{analytics.avgBillChange}% vs last month</Text>
            </View>
          </View>

          {/* Top Product */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="star-outline" size={22} color="#F97316" />
            </View>
            <Text style={styles.metricLabel}>TOP PRODUCT</Text>
            <Text style={[styles.metricValue, { fontSize: 14, lineHeight: 20 }]} numberOfLines={2}>
              {analytics.topProduct.name}
            </Text>
            <Text style={styles.metricSubGrey}>Most Used</Text>
          </View>

        </View>

        {/* ── Collection Trend Line Chart ── */}
        <View style={styles.chartCard}>

          {/* Chart header */}
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>COLLECTION TREND</Text>
            <View>
              <TouchableOpacity
                style={styles.trendDropdown}
                onPress={() => setShowTrendMenu(v => !v)}
              >
                <Text style={styles.trendDropdownText}>{activeTrend}</Text>
                <Ionicons name="chevron-down" size={14} color="#2563EB" />
              </TouchableOpacity>
              {showTrendMenu && (
                <View style={styles.trendMenu}>
                  {TRENDS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.trendMenuItem, activeTrend === t && styles.trendMenuItemActive]}
                      onPress={() => { setActiveTrend(t); setShowTrendMenu(false); }}
                    >
                      <Text style={[styles.trendMenuText, activeTrend === t && styles.trendMenuTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Y-axis + chart */}
          <View style={{ flexDirection: 'row', marginTop: 14, alignItems: 'flex-start' }}>

            {/* Y-axis labels */}
            <View style={styles.yAxisContainer}>
              {Y_TICKS.map((tick, i) => (
                <Text key={i} style={styles.yAxisLabel}>
                  ₹{tick >= 1000 ? `${tick / 1000}k` : tick}
                </Text>
              ))}
            </View>

            {/* The chart */}
            <LineChart
              data={chartData.data}
              labels={chartData.labels}
              activeIdx={Math.min(activeChartIdx, chartData.data.length - 1)}
              onPressIdx={setActiveChartIdx}
            />
          </View>

          {/* X-axis labels */}
          <View style={styles.xAxisRow}>
            {chartData.labels.length > 0 ? (
              chartData.labels.filter((_, i) => i % Math.ceil(chartData.labels.length / 7) === 0 || i === chartData.labels.length - 1).map((l, i) => (
                <Text key={i} style={styles.xAxisLabel}>{l}</Text>
              ))
            ) : (
              ['No', 'Data', 'Available'].map((l, i) => (
                <Text key={i} style={styles.xAxisLabel}>{l}</Text>
              ))
            )}
          </View>

        </View>

        {/* ── Quick Insights ── */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bar-chart" size={16} color="#2563EB" />
            <Text style={styles.insightsTitle}>QUICK INSIGHTS</Text>
          </View>
          <View style={styles.insightsBody}>

            {/* Best Day */}
            <View style={styles.insightItem}>
              <View style={[styles.insightIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="arrow-up-circle" size={26} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightItemTitle}>Best Day: {analytics.bestDay}</Text>
                <Text style={styles.insightItemSub}>
                  Highest Collection ₹{analytics.bestDayAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Billing Activity */}
            <View style={styles.insightItem}>
              <View style={[styles.insightIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="flash" size={26} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightItemTitle}>Billing Activity: Normal</Text>
                <Text style={styles.insightItemSub}>
                  {analytics.totalBills} bills this month
                </Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── Top Products ── */}
        {analytics.topProducts.length > 0 && (
          <View style={styles.topProductsCard}>
            <Text style={styles.topProductsTitle}>TOP PRODUCTS</Text>
            <Text style={styles.topProductsSub}>By revenue this month</Text>
            {analytics.topProducts.slice(0, 5).map((p, i) => {
              const maxRev = analytics.topProducts[0]?.revenue || 1;
              const pct = (p.revenue / maxRev) * 100;
              return (
                <View key={i} style={styles.productBarItem}>
                  <View style={styles.productBarLabelRow}>
                    <Text style={styles.productBarName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.productBarValue}>₹{p.revenue.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.productBarTrack}>
                    <View
                      style={[
                        styles.productBarFill,
                        { width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* ── Transactions Modal ── */}
      <TransactionsModal />

      {/* ══════════════════════════════════════
          BOTTOM NAV — identical to home.tsx
      ══════════════════════════════════════ */}
      

      {/* Date Picker Modal */}
      {showCustomCalendar && (
        <SimpleCalendarPicker
          mode="range"
          initialStart={startDate}
          initialEnd={endDate}
          onConfirm={(start, end) => {
            if (start && end) {
              setStartDate(start);
              setEndDate(end);
            }
            setShowCustomCalendar(false);
          }}
          onCancel={() => setShowCustomCalendar(false)}
        />
      )}

    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },

  // ── Header ──
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 2,
  },
  calendarBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Unified Filter Chip (Premium Fintech Style) ──
  unifiedFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  filterSeparator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  dateRangeLight: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.1,
  },

  // ── Filter section (legacy) ──
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterPillMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillMainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  dateRangeDisplay: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  // ── Filter pills (legacy) ──
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterPillActive: {
    backgroundColor: '#fff',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  filterPillTextActive: {
    color: '#2563EB',
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateRangeBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },

  // ── Collection Card ──
  collectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  collectionInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  collectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  collectionAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  collectionDateRange: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 10,
  },
  collectionChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  collectionChangeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
  },
  collectionChangeSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  walletIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Metric Cards ──
  metricRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  metricIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111',
    marginBottom: 4,
  },
  metricSubGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  metricSubGrey: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  metricChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexWrap: 'wrap',
  },
  metricChangeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
    flexShrink: 1,
  },

  // ── Chart Card ──
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trendDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trendDropdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  trendMenu: {
    position: 'absolute',
    right: 0,
    top: 36,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    zIndex: 999,
    minWidth: 110,
  },
  trendMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  trendMenuItemActive: {
    backgroundColor: '#EEF2FF',
  },
  trendMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  trendMenuTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },

  // Y-axis
  yAxisContainer: {
    width: 36,
    height: CHART_H,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 2,
    paddingTop: 2,
  },
  yAxisLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // X-axis
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 36,
    marginTop: 10,
  },
  xAxisLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // ── Quick Insights ──
  insightsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  insightsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  insightsBody: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  insightIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
    marginBottom: 3,
  },
  insightItemSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // ── Top Products ──
  topProductsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  topProductsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  topProductsSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  productBarItem: {
    marginBottom: 14,
  },
  productBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productBarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productBarValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  productBarTrack: {
    height: 8,
    backgroundColor: '#F0F2F8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  productBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ── Export Button ──
  exportBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // ── Bottom Nav — exact match to home.tsx ──
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    marginTop: 2,
  },
});

// ─────────────────────────────────────────────
// CALENDAR STYLES
// ─────────────────────────────────────────────
const calendarStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 350,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F2F8',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  dayButton: {
    width: '14.2%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#2563EB',
  },
  inRangeDay: {
    backgroundColor: '#DBEAFE',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  emptyDayText: {
    color: 'transparent',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─────────────────────────────────────────────
// DROPDOWN MENU STYLES
// ─────────────────────────────────────────────
const dropdownStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
    maxHeight: 400,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  menuItemDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});