import { AppColors as C } from '@/constants/theme';
import {
    audiences, factures, notifications,
} from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useDossiers } from '@/hooks/useDossiers';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Bell,
    Brain, Calendar,
    DollarSign,
    FileText,
    Plus,
    Shield,
    TrendingUp,
    Users,
    WifiOff
} from 'lucide-react-native';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Dossiers réels depuis le backend
  const { dossiers, isLoading: loadingDossiers, total: totalDossiers } = useDossiers({ pageSize: 50 });

  const affairesActives = dossiers.filter(
    d => d.statut === 'Ouvert' || d.statut === 'En cours'
  ).length;

  const today = new Date();
  const in7days = new Date(); in7days.setDate(today.getDate() + 7);
  const prochaines7Jours = audiences.filter(a => {
    const d = new Date(a.date);
    return d >= today && d <= in7days && a.statut === 'prevue';
  }).length;

  const mois = today.getMonth();
  const montantFacture = factures
    .filter(f => new Date(f.dateEmission).getMonth() === mois)
    .reduce((acc, f) => acc + f.montant, 0);
  const montantEncaisse = factures
    .filter(f => new Date(f.dateEmission).getMonth() === mois)
    .reduce((acc, f) => acc + f.montantPaye, 0);

  const facturesRetard = factures.filter(f => f.statut === 'en_retard').length;
  const unread = notifications.filter(n => !n.lue).length;

  const prochainesAudiences = audiences
    .filter(a => new Date(a.date) >= today && a.statut === 'prevue')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Dossiers récents (remplace les "affaires critiques" jusqu'à l'ajout d'un endpoint stats)
  const dossiersRecents = dossiers.slice(0, 3);

  const fmtDate = (d: string) => new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

  const fmtShortDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(dt)}`;
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.gray900} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>Tableau de bord</Text>
              <Text style={s.headerSub}>
                {user ? `${user.nom} · ${user.role}` : 'Cabinet Manager'}
              </Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/notifications')}>
                <Bell color={C.white} size={20} />
                {unread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View>
                <Text style={s.dateLabel}>Aujourd'hui</Text>
                <Text style={s.dateVal}>
                  {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(today)}
                </Text>
              </View>
            </View>
          </View>

          {/* Offline banner */}
          <View style={s.offlineBanner}>
            <WifiOff color={C.amber600} size={16} />
            <Text style={s.offlineText}>
              <Text style={{ fontWeight: '700' }}>Mode hors-ligne disponible.</Text>
              {' '}Vos données sont synchronisées.
            </Text>
            <View style={s.syncDot} />
          </View>

          {/* IA Banner */}
          <TouchableOpacity style={s.iaBanner} onPress={() => router.push('/(tabs)/assistant-ia')} activeOpacity={0.85}>
            <View style={s.iaIconWrap}>
              <Brain color={C.gray900} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={s.iaTitle}>Assistant IA Juridique</Text>
                <View style={s.newBadge}><Text style={s.newBadgeText}>NOUVEAU</Text></View>
              </View>
              <Text style={s.iaDesc}>Analysez vos affaires avec le droit camerounais et OHADA</Text>
              <View style={[s.iaCta]}>
                <Text style={s.iaCtaText}>Essayer maintenant →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* KPI — affaires actives */}
          <View style={s.kpiCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiLabel}>Affaires actives</Text>
              <Text style={s.kpiValue}>{affairesActives}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={s.kpiTrend}>
                <ArrowUp color={C.green600} size={14} />
                <Text style={s.kpiTrendText}>+12%</Text>
              </View>
              <Text style={s.kpiSub}>vs mois dernier</Text>
            </View>
          </View>

          {/* KPI — audiences */}
          <View style={s.kpiCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.kpiLabel}>Audiences (7 jours)</Text>
              <Text style={s.kpiValue}>{prochaines7Jours}</Text>
              <Text style={s.kpiSub}>
                Prochaine :{' '}
                {prochainesAudiences[0] ? fmtDate(prochainesAudiences[0].date) : 'Aucune'}
              </Text>
            </View>
            <View style={s.kpiIconWrap}>
              <Calendar color={C.amber600} size={26} />
            </View>
          </View>

          {/* KPI — montants */}
          <View style={s.row}>
            <View style={[s.kpiCardSm, { flex: 1, marginRight: 6 }]}>
              <Text style={s.kpiLabel}>Facturé (mois)</Text>
              <Text style={s.kpiValue}>{(montantFacture / 1_000_000).toFixed(1)}M</Text>
              <View style={[s.kpiTrend, { marginTop: 4 }]}>
                <TrendingUp color={C.green600} size={13} />
                <Text style={[s.kpiTrendText, { color: C.green600 }]}>+8%</Text>
              </View>
            </View>
            <View style={[s.kpiCardSm, { flex: 1, marginLeft: 6 }]}>
              <Text style={s.kpiLabel}>Encaissé (mois)</Text>
              <Text style={s.kpiValue}>{(montantEncaisse / 1_000_000).toFixed(1)}M</Text>
              <View style={[s.kpiTrend, { marginTop: 4 }]}>
                <ArrowDown color={C.orange600} size={13} />
                <Text style={[s.kpiTrendText, { color: C.orange600 }]}>-3%</Text>
              </View>
            </View>
          </View>

          {/* Alert factures en retard */}
          {facturesRetard > 0 && (
            <TouchableOpacity style={s.alertCard} onPress={() => router.push('/(tabs)/facturation')}>
              <AlertTriangle color={C.red600} size={22} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.alertTitle}>{facturesRetard} facture(s) en retard</Text>
                <Text style={s.alertSub}>Action requise</Text>
              </View>
              <Text style={s.alertLink}>Voir</Text>
            </TouchableOpacity>
          )}

          {/* Prochaines audiences */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Mes prochaines audiences</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/audiences')}>
                <Text style={s.sectionLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {prochainesAudiences.map(aud => (
              <View key={aud.id} style={s.audCard}>
                <View style={s.audDate}>
                  <Text style={s.audDay}>{new Date(aud.date).getDate()}</Text>
                  <Text style={s.audMonth}>
                    {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(aud.date))}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.audTitle} numberOfLines={1}>{aud.affaire.intitule}</Text>
                  <Text style={s.audMeta}>{aud.heure} • {aud.nature}</Text>
                  <Text style={s.audJur} numberOfLines={1}>{aud.juridiction}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Affaires critiques */}
          {affairesCritiques.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Affaires critiques</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/affaires')}>
                  <Text style={s.sectionLink}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {affairesCritiques.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={s.critCard}
                  onPress={() => router.push({ pathname: '/affaire/[id]', params: { id: a.id } })}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.critTitle} numberOfLines={1}>{a.intitule}</Text>
                    <Text style={s.critClient}>{a.client.nom}</Text>
                    <Text style={s.critMeta}>{a.numero} • {a.avocatResponsable.nom}</Text>
                  </View>
                  <View style={s.critBadge}>
                    <Text style={s.critBadgeText}>Risque élevé</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Actions rapides */}
          <View style={s.section}>
            <View style={s.actionsCard}>
              <Text style={s.sectionTitle}>Actions rapides</Text>
              <View style={s.actionsGrid}>
                {[
                  { icon: FileText, label: 'Nouvelle affaire', sub: 'Créer un dossier', color: C.amber50, border: C.amber200, iconColor: C.amber600, route: '/(tabs)/affaires' },
                  { icon: Calendar, label: 'Audiences', sub: 'Calendrier', color: C.blue50, border: C.blue100, iconColor: C.blue600, route: '/(tabs)/audiences' },
                  { icon: Brain, label: 'Assistant IA', sub: 'Analyse juridique', color: C.purple50, border: C.purple100, iconColor: C.purple600, route: '/(tabs)/assistant-ia', badge: 'NEW' },
                  { icon: TrendingUp, label: 'Facturation', sub: 'Honoraires', color: C.green50, border: C.green100, iconColor: C.green600, route: '/(tabs)/facturation' },
                  { icon: DollarSign, label: 'Documents', sub: 'GED', color: C.orange50, border: C.orange100, iconColor: C.orange600, route: '/(tabs)/documents' },
                  { icon: Users, label: 'Clients', sub: 'Répertoire', color: C.indigo50, border: C.indigo100, iconColor: C.indigo600, route: '/(tabs)/clients' },
                ].map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={[s.actionBtn, { backgroundColor: item.color, borderColor: item.border }]}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <item.icon color={item.iconColor} size={22} />
                      {item.badge && (
                        <View style={s.actionBadge}><Text style={s.actionBadgeText}>{item.badge}</Text></View>
                      )}
                    </View>
                    <Text style={s.actionLabel}>{item.label}</Text>
                    <Text style={s.actionSub}>{item.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={s.fab} onPress={() => router.push('/(tabs)/affaires')} activeOpacity={0.85}>
          <Plus color={C.gray900} size={28} />
        </TouchableOpacity>
        {/* Bouton Admin */}
        <TouchableOpacity style={s.adminFab} onPress={() => router.push('/admin' as any)} activeOpacity={0.85}>
          <Shield color={C.white} size={20} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  safe: { flex: 1, backgroundColor: C.gray900 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: C.gray900,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.white },
  headerSub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: C.red500, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
  dateLabel: { fontSize: 11, color: C.gray400, textAlign: 'right' },
  dateVal: { fontSize: 13, fontWeight: '600', color: C.white, textAlign: 'right' },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200,
    borderRadius: 12, marginHorizontal: 16, marginTop: 8, padding: 12,
  },
  offlineText: { flex: 1, fontSize: 12, color: '#92400e' },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green500 },
  iaBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.gray900,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.5)',
    borderRadius: 16, margin: 16, padding: 16, overflow: 'hidden',
  },
  iaIconWrap: {
    width: 44, height: 44, backgroundColor: C.amber500,
    borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  iaTitle: { fontSize: 15, fontWeight: '700', color: C.white },
  newBadge: { backgroundColor: C.amber500, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { fontSize: 9, fontWeight: '700', color: C.gray900 },
  iaDesc: { fontSize: 12, color: C.amber100, lineHeight: 18 },
  iaCta: {
    marginTop: 10, backgroundColor: C.amber500,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  iaCtaText: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  kpiCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12,
    borderLeftWidth: 4, borderLeftColor: C.amber500,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  kpiCardSm: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  kpiLabel: { fontSize: 13, color: C.gray500, marginBottom: 4 },
  kpiValue: { fontSize: 30, fontWeight: '700', color: C.gray900 },
  kpiSub: { fontSize: 12, color: C.gray600, marginTop: 4 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiTrendText: { fontSize: 13, fontWeight: '500', color: C.green600 },
  kpiIconWrap: { backgroundColor: C.amber50, padding: 10, borderRadius: 12 },
  row: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.red50, borderWidth: 1, borderColor: C.red100,
    borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12,
  },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#7f1d1d' },
  alertSub: { fontSize: 13, color: C.red600, marginTop: 2 },
  alertLink: { fontSize: 13, fontWeight: '600', color: C.red600 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.gray900 },
  sectionLink: { fontSize: 13, fontWeight: '500', color: C.amber600 },
  audCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  audDate: {
    backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 48,
  },
  audDay: { fontSize: 22, fontWeight: '700', color: C.amber600 },
  audMonth: { fontSize: 11, color: C.amber600, marginTop: 2 },
  audTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, marginBottom: 2 },
  audMeta: { fontSize: 13, color: C.gray600, marginBottom: 2 },
  audJur: { fontSize: 12, color: C.gray500 },
  critCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: C.red500,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  critTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, marginBottom: 2 },
  critClient: { fontSize: 13, color: C.gray600, marginBottom: 2 },
  critMeta: { fontSize: 12, color: C.gray500 },
  critBadge: { backgroundColor: C.red100, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 10 },
  critBadgeText: { fontSize: 11, fontWeight: '500', color: C.red700 },
  actionsCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionBtn: {
    width: '47%', borderRadius: 14, borderWidth: 1,
    padding: 14,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  actionBadge: { backgroundColor: C.amber500, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  actionBadgeText: { fontSize: 8, fontWeight: '700', color: C.white },
  actionLabel: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  actionSub: { fontSize: 11, color: C.gray600, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56,
    backgroundColor: C.amber500, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  adminFab: {
    position: 'absolute', bottom: 80, left: 20,
    width: 48, height: 48,
    backgroundColor: C.red600, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.red700, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
