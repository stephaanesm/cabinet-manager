/**
 * src/app/(tabs)/affaires.tsx
 * Liste des Affaires & Dossiers du Cabinet.
 * Design Executive (Bleu Nuit Prestige, Or, Cartes Épurées).
 */

import { AppColors as C } from '@/constants/theme';
import { useDossiers } from '@/hooks/useDossiers';
import { Dossier, DossierStatut } from '@/services/dossiers.service';
import { useRouter } from 'expo-router';
import { AlertCircle, Briefcase, ChevronRight, Plus, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUT_MAP: Record<DossierStatut, { label: string; bg: string; text: string }> = {
  'Ouvert':    { label: 'Ouvert',    bg: C.blue100,   text: C.blue700 },
  'En cours':  { label: 'En cours',  bg: C.orange100, text: C.orange700 },
  'Cloture':   { label: 'Clôturé',   bg: C.gray100,   text: C.gray700 },
};

const FILTRES: Array<{ value: 'all' | DossierStatut; label: string }> = [
  { value: 'all',       label: 'Toutes les affaires' },
  { value: 'Ouvert',    label: 'Ouvertes' },
  { value: 'En cours',  label: 'En cours' },
  { value: 'Cloture',   label: 'Clôturées' },
];

const fmt = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

export default function AffairesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<'all' | DossierStatut>('all');

  const { dossiers, isLoading, isLoadingMore, error, total, hasMore, refetch, loadMore } =
    useDossiers({
      statut: selectedStatut !== 'all' ? selectedStatut : undefined,
    });

  const filtered = search.trim()
    ? dossiers.filter(d => {
        const q = search.toLowerCase();
        return d.titre.toLowerCase().includes(q) || d.numeroAffaire.toLowerCase().includes(q);
      })
    : dossiers;

  const handleStatutChange = useCallback((val: 'all' | DossierStatut) => {
    setSelectedStatut(val);
    setSearch('');
  }, []);

  const renderItem = useCallback(({ item: d }: { item: Dossier }) => {
    const stat = STATUT_MAP[d.statut] ?? { label: d.statut, bg: C.gray100, text: C.gray700 };
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push({ pathname: '/affaire/[id]', params: { id: d.id } })}
        activeOpacity={0.85}
      >
        <View style={s.cardMain}>
          <View style={s.cardTopRow}>
            <Text style={s.numAffaire}>{d.numeroAffaire}</Text>
            <View style={[s.badge, { backgroundColor: stat.bg }]}>
              <Text style={[s.badgeText, { color: stat.text }]}>{stat.label}</Text>
            </View>
          </View>
          <Text style={s.titreAffaire} numberOfLines={2}>{d.titre}</Text>
          {d.juridiction ? (
            <Text style={s.juridictionText} numberOfLines={1}>{d.juridiction}</Text>
          ) : null}
          <View style={s.cardFooter}>
            <Text style={s.dateText}>Ouvert le {fmt(d.dateOuverture)}</Text>
          </View>
        </View>
        <ChevronRight color={C.gray400} size={18} style={s.arrow} />
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header Executive */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Affaires & Dossiers</Text>
            <Text style={s.subtitle}>
              {total > 0 ? `${total} affaire(s) enregistrée(s)` : 'Gestion du contentieux'}
            </Text>
          </View>
        </View>

        {/* Barre de Recherche */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Search color={C.gray400} size={16} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher par titre ou numéro..."
              placeholderTextColor={C.gray400}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Filtres Statut Chips */}
        <View style={s.filtresWrap}>
          <FlatList
            horizontal
            data={FILTRES}
            keyExtractor={item => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtresList}
            renderItem={({ item }) => {
              const active = selectedStatut === item.value;
              return (
                <TouchableOpacity
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => handleStatutChange(item.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </SafeAreaView>

      {/* Contenu Liste */}
      {error ? (
        <View style={s.center}>
          <AlertCircle color={C.red500} size={36} />
          <Text style={s.errorTitle}>Erreur de chargement</Text>
          <Text style={s.errorSub}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && dossiers.length > 0}
              onRefresh={refetch}
              tintColor={C.amber500}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={s.center}>
                <ActivityIndicator color={C.amber500} size="large" />
                <Text style={s.loadingText}>Chargement des affaires...</Text>
              </View>
            ) : (
              <View style={s.center}>
                <Briefcase color={C.gray300} size={48} />
                <Text style={s.emptyTitle}>Aucune affaire trouvée</Text>
                <Text style={s.emptySub}>
                  {search ? 'Modifiez vos critères de recherche.' : 'Créez une première affaire dans le cabinet.'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={C.amber500} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  safe: { backgroundColor: C.navy900 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: C.navy900,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.white },
  subtitle: { fontSize: 12, color: C.amber400, marginTop: 2, fontWeight: '500' },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.navy900 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.navy800, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: C.navy700,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.white, padding: 0 },
  filtresWrap: { backgroundColor: C.navy900, paddingBottom: 12 },
  filtresList: { paddingHorizontal: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.navy800, borderWidth: 1, borderColor: C.navy700,
  },
  chipActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  chipText: { fontSize: 12, fontWeight: '500', color: C.gray400 },
  chipTextActive: { color: C.gray900, fontWeight: '700' },
  listContent: { padding: 14, paddingBottom: 80, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 16, padding: 16, shadowColor: C.black,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    borderWidth: 1, borderColor: C.gray200,
  },
  cardMain: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numAffaire: { fontSize: 12, fontWeight: '700', color: C.amber600 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  titreAffaire: { fontSize: 15, fontWeight: '600', color: C.gray900, lineHeight: 20 },
  juridictionText: { fontSize: 12, color: C.gray500 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dateText: { fontSize: 11, color: C.gray400 },
  arrow: { marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loadingText: { fontSize: 13, color: C.gray500, marginTop: 8 },
  errorTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginTop: 8 },
  errorSub: { fontSize: 12, color: C.red500, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: C.amber500, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  retryText: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginTop: 8 },
  emptySub: { fontSize: 12, color: C.gray500, textAlign: 'center' },
});
