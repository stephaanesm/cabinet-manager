import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, ChevronRight, Plus, WifiOff } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { audiences } from '@/data/mockData';

type AudFilter = 'all' | 'prevue' | 'tenue' | 'renvoyee';

const STATUT_COLORS: Record<string, { bg: string; text: string }> = {
  prevue:   { bg: C.blue100,   text: C.blue700 },
  tenue:    { bg: C.green100,  text: C.green700 },
  renvoyee: { bg: C.orange100, text: C.orange700 },
};
const STATUT_LABELS: Record<string, string> = {
  prevue: 'Prévue', tenue: 'Tenue', renvoyee: 'Renvoyée',
};

export default function AudiencesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<AudFilter>('all');

  const today = new Date();
  const upcoming = audiences.filter(a => new Date(a.date) >= today && a.statut === 'prevue').length;

  const filtered = audiences
    .filter(a => filter === 'all' || a.statut === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isToday = (d: string) => today.toDateString() === new Date(d).toDateString();
  const isTomorrow = (d: string) => {
    const t = new Date(); t.setDate(today.getDate() + 1);
    return t.toDateString() === new Date(d).toDateString();
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Audiences</Text>
          <Text style={s.sub}>Calendrier et suivi des audiences</Text>
        </View>

        {/* Stat card */}
        <View style={s.statCard}>
          <View>
            <Text style={s.statLabel}>Audiences à venir</Text>
            <Text style={s.statVal}>{upcoming}</Text>
          </View>
          <Calendar color={C.gray900} size={32} />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={s.filtersContent}>
          {([
            { key: 'all', label: `Toutes (${audiences.length})` },
            { key: 'prevue', label: `Prévues (${audiences.filter(a => a.statut === 'prevue').length})` },
            { key: 'tenue', label: `Tenues (${audiences.filter(a => a.statut === 'tenue').length})` },
            { key: 'renvoyee', label: `Renvoyées (${audiences.filter(a => a.statut === 'renvoyee').length})` },
          ] as { key: AudFilter; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              style={[s.filterBtn, filter === key && s.filterBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, filter === key && s.filterTextActive]}>{label}</Text>
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
            <Calendar color={C.gray400} size={48} />
            <Text style={s.emptyText}>Aucune audience</Text>
          </View>
        }
        renderItem={({ item: a }) => {
          const d = new Date(a.date);
          const isPast = d < today;
          const showToday = isToday(a.date);
          const showTomorrow = isTomorrow(a.date);
          const sc = STATUT_COLORS[a.statut];

          return (
            <TouchableOpacity
              style={[s.card, showToday && s.cardToday]}
              onPress={() => router.push({ pathname: '/affaire/[id]', params: { id: a.affaire.id } })}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Date box */}
                <View style={[
                  s.datebox,
                  showToday ? s.dateboxToday : isPast ? s.dateboxPast : s.dateboxFuture,
                ]}>
                  <Text style={[s.dateDay, showToday ? { color: C.white } : isPast ? { color: C.gray600 } : { color: C.blue600 }]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[s.dateMon, showToday ? { color: C.white } : isPast ? { color: C.gray500 } : { color: C.blue600 }]}>
                    {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)}
                  </Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  {showToday && <View style={s.todayBadge}><Text style={s.todayText}>AUJOURD'HUI</Text></View>}
                  {showTomorrow && <View style={s.tomorrowBadge}><Text style={s.tomorrowText}>DEMAIN</Text></View>}

                  <Text style={s.affTitle} numberOfLines={1}>{a.affaire.intitule}</Text>
                  <Text style={s.meta}>{a.heure} • {a.nature}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                    <MapPin color={C.gray500} size={12} style={{ marginTop: 1 }} />
                    <Text style={s.jur} numberOfLines={2}>{a.juridiction}</Text>
                  </View>

                  <View style={[s.row, { marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{STATUT_LABELS[a.statut]}</Text>
                    </View>
                    <ChevronRight color={C.gray400} size={18} />
                  </View>

                  {a.notes && (
                    <View style={s.noteBanner}>
                      <Text style={s.noteText}>📌 {a.notes}</Text>
                    </View>
                  )}
                  {a.decision && (
                    <View style={s.decisionBanner}>
                      <Text style={s.decisionText}>✓ {a.decision}</Text>
                    </View>
                  )}
                  {a.syncStatus === 'pending' && (
                    <View style={s.syncRow}>
                      <WifiOff color={C.orange600} size={12} />
                      <Text style={s.syncText}>En attente de synchronisation</Text>
                    </View>
                  )}
                </View>
              </View>
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
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  statCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.amber500, borderRadius: 14, marginHorizontal: 16, padding: 14, marginBottom: 12,
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  statLabel: { fontSize: 12, color: C.gray900, fontWeight: '500', marginBottom: 4 },
  statVal: { fontSize: 28, fontWeight: '700', color: C.gray900 },
  filtersContent: { paddingHorizontal: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.gray800, borderWidth: 1, borderColor: C.gray700 },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 13, fontWeight: '500', color: C.gray300 },
  filterTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  cardToday: { borderWidth: 2, borderColor: C.blue600 },
  datebox: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 52 },
  dateboxToday: { backgroundColor: C.blue600 },
  dateboxPast: { backgroundColor: C.gray100 },
  dateboxFuture: { backgroundColor: C.blue50 },
  dateDay: { fontSize: 22, fontWeight: '700' },
  dateMon: { fontSize: 11, marginTop: 2 },
  todayBadge: { backgroundColor: C.blue600, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  todayText: { fontSize: 11, color: C.white, fontWeight: '700' },
  tomorrowBadge: { backgroundColor: C.orange500, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  tomorrowText: { fontSize: 11, color: C.white, fontWeight: '700' },
  affTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, marginBottom: 2 },
  meta: { fontSize: 13, color: C.gray600, marginBottom: 2 },
  jur: { fontSize: 12, color: C.gray500, flex: 1 },
  row: { flexDirection: 'row' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  noteBanner: { marginTop: 6, backgroundColor: C.amber50, borderRadius: 8, padding: 8 },
  noteText: { fontSize: 12, color: C.amber900 },
  decisionBanner: { marginTop: 6, backgroundColor: C.green50, borderRadius: 8, padding: 8 },
  decisionText: { fontSize: 12, color: C.green700 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  syncText: { fontSize: 12, color: C.orange600 },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56, backgroundColor: C.amber500, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
