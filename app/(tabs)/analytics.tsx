// analytics.tsx — Complete redesign matching the screenshot UI
// Matches home.tsx style system: #2563EB blue, same nav, same card patterns

import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';
import { subscriptionService } from '@/lib/subscription';
import { db as DatabaseService } from '@/lib/database';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { PremiumAccessOverlay } from '@/components/PremiumAccessOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  theme: AppTheme; // FIX: receive theme as prop
}

const SimpleCalendarPicker: React.FC<CalendarPickerProps> = ({
  mode,
  onConfirm,
  onCancel,
  initialStart,
  initialEnd,
  initialSingle,
  theme, // FIX: destructure theme prop
}) => {
  const calendarStyles = makeCalendarStyles(theme); // FIX: build styles with theme

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
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={calendarStyles.monthTitle}>{monthName} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
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
  theme: AppTheme; // FIX: receive theme as prop
}

const DateFilterMenu: React.FC<DateFilterMenuProps> = ({ visible, onSelect, onClose, currentStartDate, currentEndDate, theme }) => {
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
      desc: `1st ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]} to Today (${today.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]})`,
      icon: 'calendar-sharp',
      color: theme.colors.primary, // FIX: theme now in scope
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
      desc: `${weekStart.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][weekStart.getMonth()]} - ${today.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]}`,
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
            <Ionicons name="checkmark" size={20} color={theme.colors.primary} style={{ opacity: 0 }} />
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// BAR CHART — Pure React Native, no SVG lib
// ─────────────────────────────────────────────
interface ChartProps {
  data: number[];
  labels: string[];
  activeIdx: number;
  onPressIdx: (i: number) => void;
  theme: AppTheme; // FIX: receive theme as prop
}

const BarChart: React.FC<ChartProps> = ({ data, labels, activeIdx, onPressIdx, theme }) => {
  if (!data || data.length === 0) {
    return (
      <View style={{ width: CHART_W, height: CHART_H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 14 }}>No data available</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const range = max || 1;

  const barWidth = Math.max(8, CHART_W / data.length * 0.6);
  const spacing = CHART_W / data.length;

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

      {/* Bars */}
      {data.map((value, i) => {
        const isActive = i === activeIdx;
        const barHeight = (value / range) * (CHART_H - 20);
        const barX = (i * spacing) + (spacing - barWidth) / 2;

        return (
          <View key={`bar-${i}`} style={{ position: 'absolute', left: barX, bottom: 0 }}>
            <TouchableOpacity
              onPress={() => onPressIdx(i)}
              style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: isActive ? theme.colors.primary : theme.colors.secondary, // FIX: theme now in scope
                borderRadius: 4,
                elevation: isActive ? 4 : 0,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.3 : 0,
                shadowRadius: 4,
              }}
            />
          </View>
        );
      })}

      {/* Tooltip on active bar */}
      {activeIdx >= 0 && activeIdx < data.length && (
        <View
          style={{
            position: 'absolute',
            left: Math.max(0, Math.min((activeIdx * spacing) + spacing / 2 - 60, CHART_W - 115)),
            top: Math.max(10, CHART_H - (data[activeIdx] / range) * (CHART_H - 20) - 70),
            backgroundColor: theme.colors.primary,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            elevation: 6,
            shadowColor: theme.colors.primary,
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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
const { user } = useAuthStore(); 
const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const { theme } = useThemeStore();
  const styles = makeStyles(theme);
  const calendarStyles = makeCalendarStyles(theme);

  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('month');
  const [activeTrend, setActiveTrend] = useState<TrendKey>('Daily');
  const [showTrendMenu, setShowTrendMenu] = useState(false);
  const [activeChartIdx, setActiveChartIdx] = useState(19);
  const [availableProducts, setAvailableProducts] = useState<{ name: string; price: number }[]>([]);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [filterLabel, setFilterLabel] = useState('This Month');
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        try {
          setLoading(true);
          console.log('🔄 Loading sales data...');

          const storedSales = await DatabaseService.loadSalesLog();
          console.log('📊 Loaded sales:', storedSales?.length || 0, 'records');

          if (isMounted) {
            setSalesLog(storedSales || []);
          }

          const storedProducts = await DatabaseService.loadProducts();
          if (isMounted && Array.isArray(storedProducts)) {
            setAvailableProducts(
              storedProducts.map((p: any) => ({
                name: p.name,
                price: p.price
              }))
            );
          }
        } catch (e) {
          console.error('❌ Error loading analytics data:', e);
          if (isMounted) {
            setSalesLog([]);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      })();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  useEffect(() => {
  if (salesLog.length > 0) {
    console.log('📊 Sales Log Sample:', salesLog.slice(0, 3));
    console.log('📊 Date formats:', salesLog.slice(0, 3).map(s => s.date));
  }
}, [salesLog]);

 useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setIsLoadingSubscription(false);
        return;
      }
      
      try {
        await subscriptionService.initialize(user.id);
        const status = await subscriptionService.refreshStatus(user.id);
        setSubscriptionStatus(status);
        
        if (!status.isSubscribed && !status.isTrialActive) {
          setShowSubscriptionModal(true);
        }
      } catch (error) {
        console.error('Subscription check error:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    
    checkSubscription();
    
    const unsubscribe = subscriptionService.onStatusChange((status) => {
      setSubscriptionStatus(status);
      if (!status.isSubscribed && !status.isTrialActive) {
        setShowSubscriptionModal(true);
      }
    });
    
    return () => unsubscribe();
  }, [user?.id]);

  const filterSalesByDateRange = (sales: SaleLog[], start: Date, end: Date) => {
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    return sales.filter(bill => {
      if (!bill.date) return false;

      const parts = bill.date.trim().split(' ');
      if (parts.length < 2) return false;

      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      if (isNaN(day) || !(monthStr in months)) return false;

      const monthNum = months[monthStr];

      let billYear: number;
      if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
        billYear = parseInt(parts[2]);
      } else {
        const currentYear = new Date().getFullYear();
        billYear = monthNum > new Date().getMonth() ? currentYear - 1 : currentYear;
      }

      const billDate = new Date(billYear, monthNum, day);
      billDate.setHours(0, 0, 0, 0);

      return billDate >= startOfDay && billDate <= endOfDay;
    });
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const parseBillDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  const parts = dateStr.trim().split(' ');
  if (parts.length < 2) return null;
  
  const day = parseInt(parts[0]);
  const monthStr = parts[1];
  
  // Month mapping
  const monthsMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  if (isNaN(day) || !(monthStr in monthsMap)) return null;
  
  const monthNum = monthsMap[monthStr];
  
  // Parse year
  let year: number;
  if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
    year = parseInt(parts[2]);
  } else {
    // If no year provided, assume current or previous year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    year = monthNum > currentMonth ? currentYear - 1 : currentYear;
  }
  
  const d = new Date(year, monthNum, day);
  d.setHours(0, 0, 0, 0);
  
  // Validate date is valid
  if (isNaN(d.getTime())) return null;
  
  return d;
};

  const generateChartData = (sales: SaleLog[], start: Date, end: Date, trend: TrendKey) => {
    const filtered = filterSalesByDateRange(sales, start, end);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (trend === 'Monthly') {
      const byMonth: Record<string, number> = {};
      filtered.forEach(bill => {
        if (!bill.date) return;
        const d = parseBillDate(bill.date);
        if (!d) return;
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        byMonth[key] = (byMonth[key] || 0) + bill.total;
      });

      const data: number[] = [];
      const labels: string[] = [];
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (current <= endMonth) {
        const key = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
        data.push(byMonth[key] || 0);
        labels.push(key);
        current.setMonth(current.getMonth() + 1);
      }
      return { data, labels };
    }

    if (trend === 'Weekly') {
      const byWeek: Record<number, number> = {};
      filtered.forEach(bill => {
        if (!bill.date) return;
        const d = parseBillDate(bill.date);
        if (!d) return;
        const diffDays = Math.floor((d.getTime() - new Date(start).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.max(0, Math.floor(diffDays / 7));
        byWeek[weekIdx] = (byWeek[weekIdx] || 0) + bill.total;
      });

      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const numWeeks = Math.ceil(totalDays / 7);
      const data: number[] = [];
      const labels: string[] = [];
      for (let w = 0; w < numWeeks; w++) {
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() + w * 7);
        data.push(byWeek[w] || 0);
        labels.push(`${weekStart.getDate()} ${monthNames[weekStart.getMonth()]}`);
      }
      return { data, labels };
    }



    // Daily (default) - Improved version
const byDate: Record<string, number> = {};
filtered.forEach(bill => {
  if (!bill.date) return;
  const parsedDate = parseBillDate(bill.date);
  if (!parsedDate) return;
  
  const key = `${parsedDate.getDate()} ${monthNames[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`;
  byDate[key] = (byDate[key] || 0) + bill.total;
});

const data: number[] = [];
const labels: string[] = [];
const current = new Date(start);
current.setHours(0, 0, 0, 0);
const endDay = new Date(end);
endDay.setHours(23, 59, 59, 999);
let daysWithNoData = 0;

while (current <= endDay) {
  const d = current.getDate();
  const m = monthNames[current.getMonth()];
  const y = current.getFullYear();
  const key = `${d} ${m} ${y}`;
  const value = byDate[key] || 0;
  data.push(value);
  labels.push(`${d} ${m}`);
  
  if (value === 0 && filtered.length > 0) {
    daysWithNoData++;
  }
  
  current.setDate(current.getDate() + 1);
}

// Log if we have data but chart shows zeros
if (filtered.length > 0 && daysWithNoData === data.length) {
  console.warn('⚠️ Chart showing zeros but have sales data! Check date parsing.');
  console.log('Sample bill dates:', filtered.slice(0, 3).map(b => b.date));
}

return { data, labels };
  };

  const filteredSales = useMemo(() => filterSalesByDateRange(salesLog, startDate, endDate),
    [salesLog, startDate, endDate]);

  const currentWeekSales = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    return filterSalesByDateRange(salesLog, weekStart, now);
  }, [salesLog]);

  

  const analytics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, bill) => sum + bill.total, 0);
    const totalBills = filteredSales.length;
    const avgBill = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;

    const byDate: Record<string, number> = {};
    filteredSales.forEach(bill => {
      const date = bill.date || 'Unknown';
      byDate[date] = (byDate[date] || 0) + bill.total;
    });

    const dateEntries = Object.entries(byDate).sort((a, b) => b[1] - a[1]);
    const bestDay = dateEntries[0]?.[0] || 'N/A';
    const bestDayAmount = dateEntries[0]?.[1] || 0;

    const pendingBills = 0;
    const avgBillChange = 0;
    const monthChange = 0;

    const perf: Record<string, { qty: number; revenue: number }> = {};

    availableProducts.forEach((product: { name: string; price: number }) => {
      perf[product.name] = { qty: 0, revenue: 0 };
    });

    currentWeekSales.forEach(s =>
      s.items.forEach(it => {
        if (!perf[it.name]) perf[it.name] = { qty: 0, revenue: 0 };
        perf[it.name].qty += it.qty;
        perf[it.name].revenue += it.price * it.qty;
      })
    );

    const topProducts = Object.entries(perf)
      .filter(([name]) => availableProducts.some((p: { name: string; price: number }) => p.name === name))
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProduct = topProducts[0] ?? { name: 'No products are available', qty: 0, revenue: 0 };

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
  }, [filteredSales, currentWeekSales, availableProducts]);

  const chartData = useMemo(() => generateChartData(salesLog, startDate, endDate, activeTrend),
    [salesLog, startDate, endDate, activeTrend]);

    useEffect(() => {
  console.log('📈 Chart Data:', {
    dataLength: chartData.data.length,
    data: chartData.data.slice(0, 5),
    labels: chartData.labels.slice(0, 5),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    activeTrend,
    totalSalesLogs: salesLog.length
  });
}, [chartData, salesLog, startDate, endDate, activeTrend]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
    { key: 'date', label: 'Select Date' },
  ];

  const TRENDS: TrendKey[] = ['Daily', 'Weekly', 'Monthly'];
  const chartMax = chartData.data.length > 0 ? Math.max(...chartData.data, 1) : 1;
  const yTickStep = Math.ceil(chartMax / 5 / 100) * 100 || 500;
  const Y_TICKS = Array.from({ length: 6 }, (_, i) => Math.round(yTickStep * (5 - i)));
  const BAR_COLORS = ['#2563EB', '#6366F1', '#22C55E', '#F97316', '#EC4899'];

  // ── Transactions Modal Component ──
  const TransactionsModal = () => (
    <Modal animationType="slide" transparent visible={showTransactionsModal} onRequestClose={() => setShowTransactionsModal(false)}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111' }}>Transactions</Text>
          <TouchableOpacity onPress={() => setShowTransactionsModal(false)}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>
            {formatDateRange(startDate, endDate)} • {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}
          </Text>
        </View>

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
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.primary }}>
                    ₹{bill.total.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {bill.items.slice(0, 3).map((item, i) => (
                    <View key={i} style={{ backgroundColor: theme.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, color: theme.colors.primary, fontWeight: '600' }}>
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

        {filteredSales.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.primary }}>
                ₹{filteredSales.reduce((sum, bill) => sum + bill.total, 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  
  // ── Loading state (now includes subscription check) ──
  if (loading || isLoadingSubscription) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
  <View>
    <Text style={styles.headerTitle}>Analytics</Text>
  </View>
  {/* 👇 ADD THIS DEBUG BUTTON */}
  <TouchableOpacity 
    onPress={() => {
      console.log('=== ANALYTICS DEBUG ===');
      console.log('Sales Log Count:', salesLog.length);
      console.log('Filtered Sales:', filterSalesByDateRange(salesLog, startDate, endDate).length);
      console.log('Date Range:', startDate.toDateString(), '-', endDate.toDateString());
      console.log('Chart Data:', chartData);
      console.log('Sample bill dates:', salesLog.slice(0, 5).map(b => b.date));
    }}
    style={{ padding: 8 }}
  >
    <Ionicons name="bug-outline" size={24} color="#fff" />
  </TouchableOpacity>
</View>
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9CA3AF', fontWeight: '700', fontSize: 14 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  
  // ── Main render: Analytics with optional premium overlay ──
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
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
            {String(startDate.getDate()).padStart(2, '0')} {monthNames[startDate.getMonth()]} – {String(endDate.getDate()).padStart(2, '0')} {monthNames[endDate.getMonth()]}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="#fff"
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {/* Date Filter Dropdown — FIX: pass theme prop */}
        <DateFilterMenu
          visible={showDateMenu}
          currentStartDate={startDate}
          currentEndDate={endDate}
          theme={theme}
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
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >

        {/* ── Monthly Collection Card ── */}
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.collectionCard}
        >
          <View style={styles.collectionInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.collectionLabel}>COLLECTION</Text>
              <AnimatedCounter value={analytics.totalRevenue} textStyle={styles.collectionAmount} />
              <Text style={styles.collectionDateRange}>{formatDateRange(startDate, endDate)}</Text>
            </View>
            <TouchableOpacity
              style={{
                alignSelf: 'flex-end',
                backgroundColor: 'transparent',
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

        {/* ── Metric Cards — Row 1: Total Bills + Average Bill ── */}
        <View style={styles.metricRow}>

          {/* Total Bills */}
          <View style={[styles.metricCard, { flex: 1 }]}>
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="receipt-outline" size={20} color="#6366F1" />
              </View>
              <Text style={styles.metricLabel}>TOTAL BILLS</Text>
            </View>
            <Text style={styles.metricValue}>{analytics.totalBills}</Text>
            <Text style={styles.metricSubGrey}>
              {analytics.totalBills === 0 ? 'No bills yet' : `in selected period`}
            </Text>
          </View>

          {/* Average Bill */}
          <View style={[styles.metricCard, { flex: 1 }]}>
            <View style={styles.metricCardHeader}>
              <View style={[styles.metricIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="analytics-outline" size={20} color="#22C55E" />
              </View>
              <Text style={styles.metricLabel}>AVG BILL</Text>
            </View>
            <Text style={styles.metricValue}>
              ₹{analytics.avgBill.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.metricSubGrey}>per transaction</Text>
          </View>

        </View>

        {/* ── Metric Cards — Row 2: Top Product (full width) ── */}
        <View style={[styles.metricRow, { marginTop: 0 }]}>
          <View style={[styles.metricCard, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FFF7ED', marginBottom: 0, flexShrink: 0 }]}>
              <Ionicons name="star" size={20} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricLabel}>TOP PRODUCT — PAST 7 DAYS</Text>
              <Text style={[styles.metricValue, { fontSize: 17, marginBottom: 2 }]} numberOfLines={1}>
                {analytics.topProduct.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={styles.metricSubGrey}>
                  {analytics.topProduct.qty > 0 ? `${analytics.topProduct.qty} sold` : 'No sales yet'}
                </Text>
                {analytics.topProduct.revenue > 0 && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#F97316' }}>
                    ₹{analytics.topProduct.revenue.toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            </View>
            {analytics.topProducts.length > 1 && (
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 }}>TOP 3</Text>
                {analytics.topProducts.slice(0, 3).map((p, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ['#F97316','#6366F1','#22C55E'][i] }} />
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B' }} numberOfLines={1}>{p.name}</Text>
                  </View>
                ))}
              </View>
            )}
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
                <Ionicons name="chevron-down" size={14} color={theme.colors.primary} />
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

            {/* The chart — FIX: pass theme prop */}
            <BarChart
              data={chartData.data}
              labels={chartData.labels}
              activeIdx={Math.min(activeChartIdx, chartData.data.length - 1)}
              onPressIdx={setActiveChartIdx}
              theme={theme}
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
            <Ionicons name="bar-chart" size={16} color={theme.colors.primary} />
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
                <Text style={styles.insightItemTitle}>Billing Activity</Text>
                <Text style={styles.insightItemSub}>
                  {analytics.totalBills} bill{analytics.totalBills !== 1 ? 's' : ''} • ₹{analytics.totalRevenue.toLocaleString('en-IN')} total
                </Text>
              </View>
            </View>

            {/* Busiest Hour */}
            {(() => {
              const hourCounts: Record<number, number> = {};
              filteredSales.forEach(s => {
                if (s.time) {
                  const h = parseInt(s.time.split(':')[0]);
                  if (!isNaN(h)) hourCounts[h] = (hourCounts[h] || 0) + 1;
                }
              });
              const entries = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]));
              if (entries.length === 0) return null;
              const [busiestH, count] = entries[0];
              const h = parseInt(busiestH);
              const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
              return (
                <View style={styles.insightItem}>
                  <View style={[styles.insightIconBox, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="time" size={26} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightItemTitle}>Busiest Hour: {label}</Text>
                    <Text style={styles.insightItemSub}>{count} bill{count !== 1 ? 's' : ''} billed at this hour</Text>
                  </View>
                </View>
              );
            })()}

            {/* Repeat Customers */}
            {(() => {
              const phoneCounts: Record<string, number> = {};
              filteredSales.forEach(s => {
                if (s.phone && s.phone.trim()) {
                  phoneCounts[s.phone] = (phoneCounts[s.phone] || 0) + 1;
                }
              });
              const repeats = Object.values(phoneCounts).filter(c => c > 1).length;
              const uniqueCustomers = Object.keys(phoneCounts).length;
              if (uniqueCustomers === 0) return null;
              return (
                <View style={styles.insightItem}>
                  <View style={[styles.insightIconBox, { backgroundColor: '#FDF4FF' }]}>
                    <Ionicons name="people" size={26} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.insightItemTitle}>{uniqueCustomers} Unique Customer{uniqueCustomers !== 1 ? 's' : ''}</Text>
                    <Text style={styles.insightItemSub}>
                      {repeats > 0 ? `${repeats} returned more than once` : 'All first-time visits'}
                    </Text>
                  </View>
                </View>
              );
            })()}

          </View>
        </View>

        {/* ── Top Products ── */}
        {analytics.topProducts.length > 0 && (
          <View style={styles.topProductsCard}>
            <Text style={styles.topProductsTitle}>TOP PRODUCTS</Text>
            <Text style={styles.topProductsSub}>By revenue — past 7 days</Text>
            {analytics.topProducts.slice(0, 5).map((p, i) => {
              const maxRev = Math.max(...analytics.topProducts.map(prod => prod.revenue), 1);
              const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
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

      {/* Date Picker Modal — FIX: pass theme prop */}
      {showCustomCalendar && (
        <SimpleCalendarPicker
          mode="range"
          initialStart={startDate}
          initialEnd={endDate}
          theme={theme}
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

      {/* ── Premium Access Overlay (Trial Expired) ── */}
      <PremiumAccessOverlay
        visible={!subscriptionStatus?.isSubscribed && !subscriptionStatus?.isTrialActive}
        featureName="Analytics"
        trialDaysLeft={subscriptionStatus?.trialDaysLeft || 0}
        onUpgradePress={() => setShowSubscriptionModal(true)}
        onClose={() => {
          // Allow users to dismiss and continue viewing (analytics still runs in background)
        }}
        theme={theme}
      />

      {/* ── Subscription Modal ── */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={() => {
          if (user?.id) {
            subscriptionService.refreshStatus(user.id);
          }
        }}
        userId={user?.id || ''}
        isTrialActive={subscriptionStatus?.isTrialActive || false}
        trialDaysLeft={subscriptionStatus?.trialDaysLeft || 0}
      />

    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES — all use makeStyles(theme) factory
// ─────────────────────────────────────────────
const makeStyles = (theme: AppTheme) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── Header ──
  header: {
    backgroundColor: theme.colors.primary,
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

  // ── Unified Filter Chip ──
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
    color: theme.colors.primary, // FIX: now inside makeStyles, theme is the parameter
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
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: theme.colors.primary,
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
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  collectionAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 4,
  },
  collectionDateRange: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
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
    marginBottom: 10,
    gap: 10,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricSubGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  metricSubGrey: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  metricSubRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  metricName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
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
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trendDropdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primaryLight,
  },
  trendMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  trendMenuTextActive: {
    color: theme.colors.primary,
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
    color: theme.colors.primary,
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exportBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // ── Bottom Nav ──
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
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  trialExpiredText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  upgradeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

// ─────────────────────────────────────────────
// CALENDAR STYLES
// ─────────────────────────────────────────────
const makeCalendarStyles = (theme: AppTheme) => StyleSheet.create({
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
  },
  inRangeDay: {
    backgroundColor: theme.colors.primaryLight,
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
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─────────────────────────────────────────────
// DROPDOWN MENU STYLES (no theme needed — all static)
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