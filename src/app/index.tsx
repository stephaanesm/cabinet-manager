/**
 * src/app/index.tsx
 * Point d'entrée — écran de redirection silencieux.
 *
 * L'AuthProvider dans _layout.tsx gère automatiquement la navigation :
 *  - session active  → /(tabs)
 *  - aucune session  → /login
 *
 * Cet écran ne s'affiche que le temps que isLoading passe à false.
 * Il ne montre rien pour éviter tout flash de contenu parasite.
 */
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
