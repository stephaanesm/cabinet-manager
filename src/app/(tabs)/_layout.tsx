import { Tabs } from 'expo-router';
import { LayoutDashboard, Briefcase, Users, FileText, Calendar, Brain, Receipt } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.gray900,
          borderTopColor: C.gray800,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: C.amber500,
        tabBarInactiveTintColor: C.gray500,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="affaires"
        options={{
          title: 'Affaires',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="audiences"
        options={{
          title: 'Calendrier',
          tabBarLabel: 'Calendrier',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="facturation"
        options={{
          title: 'Facturation',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant-ia"
        options={{
          title: 'IA',
          tabBarIcon: ({ color, size }) => <Brain color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
