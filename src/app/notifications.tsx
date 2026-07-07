import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell, Calendar, DollarSign, FileText, Settings,
  CheckCheck, AlertTriangle, Info, ChevronRight, X, ArrowLeft,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { notifications as allNotifs, type Notification } from '@/data/mockData';

const TYPE_CFG: Record<Notification['type'], { label: string; Icon: any; color: string; bg: string }> = {
  audience: { label: 'Audience', Icon: Calendar,    color: C.blue600,   bg: C.blue100 },
  paiement: { label: 'Paiement', Icon: DollarSign,  color: C.red600,    bg: C.red100 },
  document: { label: 'Document', Icon: FileText,    color: C.purple600, bg: C.purple100 },
  systeme:  { label: 'Système',  Icon: Info,        color: C.gray600,   bg: C.gray100 },
};

const formatDate = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d);
};

type Filter = 'all' | Notification['type'];

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState(allNotifs);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const nonLues = notifs.filter(n => !n.lue).length;
  const filtered = notifs
    .filter(n => activeFilter === 'all' || n.type === activeFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, lue: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
  const deleteNotif = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={C.gray400} size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Notifications</Text>
            <Text style={s.sub}>{nonLues > 0 ? `${nonLues} non lue(s)` : 'Tout est à jour'}</Text>
          </View>
          {nonLues > 0 && (
            <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} activeOpacity={0.8}>
              <CheckCheck color={C.amber300} size={14} />
              <Text style={s.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {(['audience', 'paiement', 'document'] as const).map(t => {
            const cfg = TYPE_CFG[t];
            const Icon = cfg.Icon;
            const count = notifs.filter(n => n.type === t && !n.lue).length;
            return (
              <View key={t} style={s.statCard}>
                <Icon color={C.amber400} size={18} />
                <Text style={s.statVal}>{count}</Text>
                <Text style={s.statLabel}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={s.filtersContent}>
          {([
            { key: 'all', label: `Toutes (${notifs.length})` },
            { key: 'audience', label: 'Audiences' },
            { key: 'paiement', label: 'Paiements' },
            { key: 'document', label: 'Documents' },
            { key: 'systeme', label: 'Système' },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveFilter(key)}
              style={[s.filterBtn, activeFilter === key && s.filterBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, activeFilter === key && s.filterTextActive]}>{label}</Text>
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
            <Bell color={C.gray200} size={48} />
            <Text style={s.emptyTitle}>Aucune notification</Text>
            <Text style={s.emptyDesc}>Vous êtes à jour !</Text>
          </View>
        }
        renderItem={({ item: notif }) => {
          const cfg = TYPE_CFG[notif.type];
          const Icon = cfg.Icon;
          return (
            <TouchableOpacity
              style={[s.card, !notif.lue && s.cardUnread]}
              onPress={() => markRead(notif.id)}
              activeOpacity={0.9}
            >
              <View style={s.cardContent}>
                <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
                  {notif.urgente
                    ? <AlertTriangle color={C.red600} size={18} />
                    : <Icon color={cfg.color} size={18} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={[s.notifTitle, !notif.lue && { color: C.gray900 }]} numberOfLines={1}>
                      {notif.titre}
                    </Text>
                    {notif.urgente && (
                      <View style={s.urgentBadge}><Text style={s.urgentText}>Urgent</Text></View>
                    )}
                  </View>
                  <Text style={s.notifMsg} numberOfLines={2}>{notif.message}</Text>
                  <View style={s.bottomRow}>
                    <Text style={s.notifDate}>{formatDate(notif.date)}</Text>
                    {notif.lienEcran && (
                      <TouchableOpacity
                        onPress={() => { markRead(notif.id); router.back(); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                        activeOpacity={0.7}
                      >
                        <Text style={s.seeLink}>Voir</Text>
                        <ChevronRight color={C.amber600} size={12} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
              {!notif.lue && <View style={s.unreadDot} />}
              <TouchableOpacity style={s.deleteBtn} onPress={() => deleteNotif(notif.id)} activeOpacity={0.7}>
                <X color={C.gray300} size={14} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* Settings button */}
      <View style={s.settingsWrap}>
        <TouchableOpacity style={s.settingsBtn} activeOpacity={0.8}>
          <Settings color={C.gray500} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={s.settingsTitle}>Paramètres des notifications</Text>
            <Text style={s.settingsSub}>Configurer les rappels d'audience et de paiement</Text>
          </View>
          <ChevronRight color={C.gray300} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 10, gap: 12 },
  backBtn: { paddingTop: 4 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 12, color: C.amber300, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 20, fontWeight: '700', color: C.white },
  statLabel: { fontSize: 11, color: C.gray400 },
  filtersContent: { paddingHorizontal: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  filterTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: C.gray500 },
  emptyDesc: { fontSize: 13, color: C.gray400 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: C.amber500 },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: C.gray700, flex: 1 },
  urgentBadge: { backgroundColor: C.red100, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  urgentText: { fontSize: 10, fontWeight: '700', color: C.red700 },
  notifMsg: { fontSize: 12, color: C.gray500, lineHeight: 18, marginBottom: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifDate: { fontSize: 11, color: C.gray400 },
  seeLink: { fontSize: 12, fontWeight: '600', color: C.amber600 },
  unreadDot: { position: 'absolute', top: 14, right: 36, width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber500 },
  deleteBtn: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  settingsWrap: { paddingHorizontal: 12, paddingBottom: 24 },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  settingsTitle: { fontSize: 14, fontWeight: '500', color: C.gray900 },
  settingsSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
});
