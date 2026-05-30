// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/store';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  useEffect(() => {
  if (Platform.OS !== 'android') return;

  let updateSub: any;
  let errorSub: any;

  const setup = async () => {
    try {
      const RNIap = require('react-native-iap');
      await RNIap.initConnection();

      updateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
        if (purchase?.purchaseToken) {
          try {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
          } catch (e) {
            console.warn('IAP finishTransaction error:', e);
          }
        }
      });

      errorSub = RNIap.purchaseErrorListener((err: any) => {
        console.warn('IAP background error:', err);
      });
    } catch (e) {
      console.warn('IAP setup error:', e);
    }
  };

  setup();

  return () => {
    updateSub?.remove();
    errorSub?.remove();
  };
}, []);

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={({ route }) => ({
          animationEnabled: false,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.primaryText,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBar,
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.tabBarBorder,
            height: 78 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
        })}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'pricetag' : 'pricetag-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="suppliers"
          options={{
            title: 'Suppliers',
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}