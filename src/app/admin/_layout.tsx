import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Shield, ScrollText } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a0a0a',
          borderTopColor: '#3f1f1f',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: C.red500,
        tabBarInactiveTintColor: C.gray500,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vue d\'ensemble',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="utilisateurs"
        options={{
          title: 'Utilisateurs',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="roles"
        options={{
          title: 'Rôles & RBAC',
          tabBarLabel: 'Rôles',
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Journal d\'audit',
          tabBarLabel: 'Audit',
          tabBarIcon: ({ color, size }) => <ScrollText color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
