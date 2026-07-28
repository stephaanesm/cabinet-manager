/**
 * src/app/notifications.tsx
 * Écran des Notifications & Rappels d'audiences/factures/RDV.
 * Connecté en temps réel aux endpoints NestJS du backend.
 */

import { AppColors as C } from '@/constants/theme';
import {
  getNotifications, marquerNotificationCommeLue, marquerToutesNotificationsCommeLues,
  NotificationItem, NotificationType,
} from '@/services/notifications.service';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, ArrowLeft, Bell, Calendar, CheckCheck, ChevronRight,
  DollarSign, FileText, Info, Settings, X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_CFG: Record<NotificationType, { label: string; Icon: any; color: string; bg: string }> = {
  audience_rappel: { label: 'Audience', Icon: Calendar,   color: C.blue600,   bg: C.blue100 },
  facture_retard:  { label: 'Facture',  Icon: DollarSign, color: C.red600,    bg: C.red100 },
  rdv_rappel:      { label: 'Rendez-vous', Icon: Calendar,color: C.purple600, bg: C.purple100 },
  info:            { label: 'Information', Icon: Info,    color: C.gray600,   bg: C.gray100 },
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

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const fetchNotifs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getNotifications();
      setNotifs(res.data);
      setNonLues(res.nonLuesCount);
    } catch (e) {
      console.log('Notification fetch error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await marquerToutesNotificationsCommeLues();
      setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
      setNonLues(0);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de marquer comme lu');
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await marquerNotificationCommeLue(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      setNonLues(p => Math.max(0, p - 1));
    } catch (e) {
      console.log('Error marking as read', e);
    }
  };

  const filtered = notifs.filter(n => activeFilter === 'all' || !n.lu);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.navy900 }}>
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
            <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
              <CheckCheck color={C.amber300} size={14} />
              <Text style={s.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={s.filtersContent}>
          {[
            { key: 'all', label: `Toutes (${notifs.length})` },
            { key: 'unread', label: `Non lues (${nonLues})` },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveFilter(key as Filter)}
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
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchNotifs} tintColor={C.amber500} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}>
              <ActivityIndicator color={C.amber500} size="large" />
            </View>
          ) : (
            <View style={s.empty}>
              <Bell color={C.gray400} size={48} />
              <Text style={s.emptyTitle}>Aucune notification</Text>
              <Text style={s.emptyDesc}>Vous êtes parfaitement à jour !</Text>
            </View>
          )
        }
        renderItem={({ item: notif }) => {
          const cfg = TYPE_CFG[notif.type] || TYPE_CFG.info;
          const Icon = cfg.Icon;
          return (
            <TouchableOpacity
              style={[s.card, !notif.lu && s.cardUnread]}
              onPress={() => handleMarkRead(notif.id)}
              activeOpacity={0.9}
            >
              <View style={s.cardContent}>
                <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
                  {notif.type === 'facture_retard'
                    ? <AlertTriangle color={C.red600} size={18} />
                    : <Icon color={cfg.color} size={18} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={[s.notifTitle, !notif.lu && { color: C.gray900 }]} numberOfLines={1}>
                      {notif.titre}
                    </Text>
                    {notif.type === 'facture_retard' && (
                      <View style={s.urgentBadge}><Text style={s.urgentText}>Important</Text></View>
                    )}
                  </View>
                  <Text style={s.notifMsg} numberOfLines={2}>{notif.message}</Text>
                  <View style={s.bottomRow}>
                    <Text style={s.notifDate}>{formatDate(notif.createdAt)}</Text>
                  </View>
                </View>
              </View>
              {!notif.lu && <View style={s.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingBottom: 10, gap: 12, backgroundColor: C.navy900 },
  backBtn: { paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '700', color: C.white },
  sub: { fontSize: 12, color: C.amber400, marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.navy800, borderWidth: 1, borderColor: C.navy700, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 12, color: C.amber400, fontWeight: '500' },
  filtersContent: { paddingHorizontal: 14, gap: 8, paddingBottom: 10, backgroundColor: C.navy900 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.navy700, backgroundColor: C.navy800 },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray400 },
  filterTextActive: { color: C.gray900, fontWeight: '700' },
  list: { padding: 14, paddingBottom: 60, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  emptyDesc: { fontSize: 12, color: C.gray500 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: C.gray200 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: C.amber500 },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: C.gray700, flex: 1 },
  urgentBadge: { backgroundColor: C.red100, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  urgentText: { fontSize: 10, fontWeight: '700', color: C.red700 },
  notifMsg: { fontSize: 12, color: C.gray600, lineHeight: 18, marginBottom: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifDate: { fontSize: 11, color: C.gray400 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber500 },
});
