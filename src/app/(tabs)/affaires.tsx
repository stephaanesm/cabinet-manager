import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Filter, Plus, ChevronRight } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { affaires, statutsAffaires } from '@/data/mockData';

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  green:  { bg: C.green100,  text: C.green700 },
  blue:   { bg: C.blue100,   text: C.blue700 },
  orange: { bg: C.orange100, text: C.orange700 },
  red:    { bg: C.red100,    text: C.red700 },
  gray:   { bg: C.gray100,   text: C.gray700 },
};

export default function AffairesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('all');

  const filtered = affaires.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.intitule.toLowerCase().includes(q)
      || a.client.nom.toLowerCase().includes(q)
      || a.numero.toLowerCase().includes(q);
    const matchStatut = selectedStatut === 'all' || a.statut === selectedStatut;
    return matchSearch && matchStatut;
  });

  const getStatut = (val: string) => statutsAffaires.find(s => s.value === val);
  const fmt = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Affaires</Text>
          <Text style={s.sub}>Gestion des dossiers du cabinet</Text>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Search color={C.gray400} size={18} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une affaire..."
            placeholderTextColor={C.gray400}
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
          {[{ value: 'all', label: `Toutes (${affaires.length})` }, ...statutsAffaires.map(s => ({
            value: s.value,
            label: `${s.label} (${affaires.filter(a => a.statut === s.value).length})`,
          }))].map(item => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setSelectedStatut(item.value)}
              style={[s.filterBtn, selectedStatut === item.value && s.filterBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterBtnText, selectedStatut === item.value && s.filterBtnTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucune affaire trouvée</Text>
          </View>
        }
        renderItem={({ item: a }) => {
          const stat = getStatut(a.statut);
          const colors = stat ? STATUT_COLORS[stat.color] : STATUT_COLORS.gray;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push({ pathname: '/affaire/[id]', params: { id: a.id } })}
              activeOpacity={0.8}
            >
              <View style={s.cardTop}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{a.intitule}</Text>
                  <Text style={s.cardClient}>{a.client.nom}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[s.statusText, { color: colors.text }]}>{stat?.label ?? a.statut}</Text>
                </View>
              </View>

              <View style={s.cardMeta}>
                <Text style={s.metaText}>{a.numero}</Text>
                <Text style={s.metaDot}>•</Text>
                <Text style={s.metaText}>{a.domaine}</Text>
                <Text style={s.metaDot}>•</Text>
                <Text style={s.metaText}>{a.avocatResponsable.nom}</Text>
              </View>

              {a.prochainRendezVous && (
                <View style={s.nextDateBanner}>
                  <Text style={s.nextDateText}>Prochaine audience : {fmt(a.prochainRendezVous.split('T')[0])}</Text>
                </View>
              )}

              <View style={s.cardFooter}>
                <Text style={s.footerText}>
                  Facturé : <Text style={s.footerBold}>{a.montantFacture ? (a.montantFacture / 1_000_000).toFixed(1) + 'M' : 'N/A'}</Text>
                </Text>
                <Text style={s.footerText}>
                  Encaissé : <Text style={s.footerBold}>{a.montantEncaisse ? (a.montantEncaisse / 1_000_000).toFixed(1) + 'M' : '0'}</Text>
                </Text>
                <ChevronRight color={C.gray400} size={18} />
              </View>

              {a.risqueImpaye === 'eleve' && (
                <View style={s.riskBanner}>
                  <Text style={s.riskText}>⚠️ Risque d'impayé élevé</Text>
                </View>
              )}
              {a.risqueImpaye === 'moyen' && (
                <View style={[s.riskBanner, { backgroundColor: C.orange50, borderLeftColor: C.orange500 }]}>
                  <Text style={[s.riskText, { color: C.orange700 }]}>⚠️ Risque d'impayé moyen</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} activeOpacity={0.85}>
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.white },
  filtersScroll: { marginBottom: 8 },
  filtersContent: { paddingHorizontal: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.gray800, borderWidth: 1, borderColor: C.gray700,
  },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterBtnText: { fontSize: 13, fontWeight: '500', color: C.gray300 },
  filterBtnTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, lineHeight: 20, marginBottom: 4 },
  cardClient: { fontSize: 13, color: C.gray600 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  metaText: { fontSize: 12, color: C.gray500 },
  metaDot: { fontSize: 12, color: C.gray400 },
  nextDateBanner: { backgroundColor: C.blue50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  nextDateText: { fontSize: 12, color: C.blue700, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.gray100 },
  footerText: { fontSize: 13, color: C.gray500 },
  footerBold: { fontWeight: '600', color: C.gray900 },
  riskBanner: { backgroundColor: C.red50, borderLeftWidth: 4, borderLeftColor: C.red500, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  riskText: { fontSize: 12, color: C.red700, fontWeight: '500' },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56, backgroundColor: C.amber500, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
