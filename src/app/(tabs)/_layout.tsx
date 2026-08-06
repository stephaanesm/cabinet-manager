import { Tabs } from 'expo-router';
import { LayoutDashboard, Briefcase, Users, Calendar, Brain, Receipt, FolderOpen } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';

import { usePreferences } from '@/context/PreferencesContext';

export default function TabsLayout() {
  const { isDark } = usePreferences();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? C.gray900 : C.white,
          borderTopColor: isDark ? C.gray800 : C.gray200,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: C.amber500,
        tabBarInactiveTintColor: isDark ? C.gray500 : C.gray600,
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
        name="documents"
        options={{
          title: 'Documents',
          tabBarLabel: 'Documents',
          tabBarIcon: ({ color, size }) => <FolderOpen color={color} size={size} />,
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
          href: null,
          title: 'Facturation',
        }}
      />
      <Tabs.Screen
        name="assistant-ia"
        options={{
          href: null,
          title: 'IA',
        }}
      />
    </Tabs>
  );
}
