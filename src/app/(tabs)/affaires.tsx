import { AppColors as C } from '@/constants/theme';
import { useDossiers } from '@/hooks/useDossiers';
import { Dossier, DossierStatut } from '@/services/dossiers.service';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronRight, Plus, Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mapping statuts backend → couleurs
const STATUT_MAP: Record<DossierStatut, { label: string; bg: string; text: string }> = {
  'Ouvert':    { label: 'Ouvert',    bg: C.blue100,   text: C.blue700 },
  'En cours':  { label: 'En cours',  bg: C.orange100, text: C.orange700 },
  'Cloture':   { label: 'Clôturé',   bg: C.gray100,   text: C.gray700 },
};

const FILTRES: Array<{ value: 'all' | DossierStatut; label: string }> = [
  { value: 'all',       label: 'Toutes' },
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

  // Filtrage local par recherche texte (titre / numéro)
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
        activeOpacity={0.8}
      >
        <View style={s.cardTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.cardTitle} numberOfLines={2}>{d.titre}</Text>
            <Text style={s.cardNum}>{d.numeroAffaire}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: stat.bg }]}>
            <Text style={[s.badgeText, { color: stat.text }]}>{stat.label}</Text>
          </View>
        </View>

        <View style={s.cardMeta}>
          {d.juridiction && (
            <>
              <Text style={s.metaText}>{d.juridiction}</Text>
              <Text style={s.dot}>•</Text>
            </>
          )}
          <Text style={s.metaText}>{fmt(d.dateOuverture)}</Text>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.footerText}>
            ID client : <Text style={s.footerBold}>{d.clientId}</Text>
          </Text>
          <ChevronRight color={C.gray400} size={18} />
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Affaires</Text>
          <Text style={s.sub}>
            {isLoading ? 'Chargement…' : `${total} dossier${total !== 1 ? 's' : ''} au total`}
          </Text>
        </View>

        {/* Recherche */}
        <View style={s.searchWrap}>
          <Search color={C.gray400} size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par titre ou numéro…"
            placeholderTextColor={C.gray400}
          />
        </View>

        {/* Filtres par statut */}
        <View style={s.filtersRow}>
          {FILTRES.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => handleStatutChange(f.value)}
              style={[s.filterBtn, selectedStatut === f.value && s.filterBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterBtnText, selectedStatut === f.value && s.filterBtnTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Erreur */}
      {error && !isLoading && (
        <View style={s.errorBanner}>
          <AlertCircle color={C.red500} size={16} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={s.retryBtn}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading && dossiers.length > 0} onRefresh={refetch} tintColor={C.amber500} />}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading
            ? <View style={s.center}><ActivityIndicator color={C.amber500} size="large" /></View>
            : <View style={s.center}><Text style={s.emptyText}>Aucun dossier trouvé</Text></View>
        }
        ListFooterComponent={
          isLoadingMore
            ? <View style={s.footerLoader}><ActivityIndicator color={C.amber500} /></View>
            : null
        }
        renderItem={renderItem}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/nouvelle-affaire')} activeOpacity={0.85}>
        <Plus color={C.gray900} size={28} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, marginTop: 8,
    backgroundColor: C.gray800, borderWidth: 1, borderColor: C.gray700,
    borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.white },
  filtersRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.gray800, borderWidth: 1, borderColor: C.gray700,
  },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterBtnText: { fontSize: 13, fontWeight: '500', color: C.gray300 },
  filterBtnTextActive: { color: C.gray900 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 12,
    backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red700 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.red100, borderRadius: 8 },
  retryText: { fontSize: 12, color: C.red700, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  center: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, lineHeight: 20, marginBottom: 2 },
  cardNum: { fontSize: 12, color: C.gray500 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaText: { fontSize: 12, color: C.gray500 },
  dot: { fontSize: 12, color: C.gray400 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.gray100,
  },
  footerText: { fontSize: 13, color: C.gray500 },
  footerBold: { fontWeight: '600', color: C.gray900 },
  footerLoader: { padding: 16, alignItems: 'center' },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56, backgroundColor: C.amber500, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
