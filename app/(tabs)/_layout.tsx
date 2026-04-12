import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FC8019',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen 
          name="home" 
          options={{ 
            headerShown: false,
            title: 'Home'
          }} 
        />
        <Stack.Screen 
          name="products" 
          options={{ 
            title: 'Products',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="analytics" 
          options={{ 
            title: 'Analytics',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="suppliers" 
          options={{ 
            title: 'Suppliers',
            headerShown: true,
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}