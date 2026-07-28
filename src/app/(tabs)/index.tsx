/**
 * src/app/(tabs)/index.tsx
 * Tableau de bord Executive avec :
 *  - Calendrier Journalier (Agenda du Jour & Créneaux Horaires)
 *  - Rappels & Alertes Intelligentes (Factures en retard, Échéances)
 *  - Raccourcis Métier (Nouveau Dossier, Nouvelle Facture, Audience, IA)
 */

import { AppColors as C } from '@/constants/theme';
import { useAudiences } from '@/hooks/useAudiences';
import { useAuth } from '@/hooks/useAuth';
import { useDossiers } from '@/hooks/useDossiers';
import { useFactures } from '@/hooks/useFactures';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Bell, Brain, Briefcase,
  Calendar as CalendarIcon, CheckCircle2, Clock, DollarSign, FileText,
  LayoutDashboard, LogOut, Plus, Receipt, ShieldCheck, Sparkles, TrendingUp, Users, Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DashboardTab = 'overview' | 'agenda' | 'kpis';

const DASHBOARD_TABS: { id: DashboardTab; label: string; Icon: any }[] = [
  { id: 'overview', label: "Vue d'ensemble", Icon: LayoutDashboard },
  { id: 'agenda',   label: 'Agenda du Jour',   Icon: CalendarIcon },
  { id: 'kpis',     label: 'Performances',    Icon: BarChart3 },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Backend Data Hooks
  const { dossiers }  = useDossiers({ pageSize: 50 });
  const { audiences } = useAudiences({ pageSize: 50 });
  const { factures, totalFacture, totalEncaisse, totalImpaye } = useFactures();

  // Metric Calculations
  const affairesActives = dossiers.filter(
    d => d.statut === 'Ouvert' || d.statut === 'En cours'
  ).length;

  const affairesCloturees = dossiers.filter(d => d.statut === 'Cloture').length;

  const facturesRetard = factures.filter(f => f.statut === 'en_retard');

  // Agenda / Audiences du jour
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAudiences = audiences.filter(a => a.dateAudience?.startsWith(todayStr));

  const affairesRecentes = dossiers
    .filter(d => d.statut === 'Ouvert' || d.statut === 'En cours')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy900} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* ── En-tête Executive ── */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerGreeting}>Cabinet d'Avocats</Text>
              <Text style={s.headerTitle}>{user ? user.nom : 'Cabinet Manager'}</Text>
              <View style={s.roleBadge}>
                <ShieldCheck color={C.amber400} size={12} />
                <Text style={s.roleBadgeText}>{user?.role || 'Associé'}</Text>
              </View>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/assistant-ia')}>
                <Brain color={C.amber400} size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={s.logoutBtn} onPress={logout}>
                <LogOut color={C.red400} size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Navigation par Onglets Dashboard ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dashTabsRow}>
            {DASHBOARD_TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[s.dashTabBtn, active && s.dashTabBtnActive]}
                  activeOpacity={0.8}
                >
                  <tab.Icon color={active ? C.gray900 : C.gray400} size={14} />
                  <Text style={[s.dashTabText, active && s.dashTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── TAB 1 : VUE D'ENSEMBLE & RAPPELS ── */}
          {activeTab === 'overview' && (
            <View style={s.tabContent}>

              {/* Cartes KPIs Réelles */}
              <View style={s.kpiGrid}>
                <View style={[s.kpiCard, { borderLeftColor: C.amber500 }]}>
                  <View style={s.kpiIconWrap}><Briefcase color={C.amber600} size={20} /></View>
                  <Text style={s.kpiVal}>{affairesActives}</Text>
                  <Text style={s.kpiLabel}>Affaires en cours</Text>
                </View>

                <View style={[s.kpiCard, { borderLeftColor: C.blue500 }]}>
                  <View style={[s.kpiIconWrap, { backgroundColor: C.blue50 }]}><CalendarIcon color={C.blue600} size={20} /></View>
                  <Text style={s.kpiVal}>{audiences.length}</Text>
                  <Text style={s.kpiLabel}>Audiences</Text>
                </View>

                <View style={[s.kpiCard, { borderLeftColor: C.green500 }]}>
                  <View style={[s.kpiIconWrap, { backgroundColor: C.green50 }]}><CheckCircle2 color={C.green600} size={20} /></View>
                  <Text style={s.kpiVal}>{affairesCloturees}</Text>
                  <Text style={s.kpiLabel}>Clôturées</Text>
                </View>
              </View>

              {/* 🔔 BLOC RAPPELS & RAPPELS IMPORTANT (Factures en retard / Audiences) */}
              <Text style={s.sectionTitle}>Rappels & Notifications</Text>
              <View style={{ gap: 8 }}>
                {facturesRetard.length > 0 && (
                  <TouchableOpacity
                    style={s.reminderCardAlert}
                    onPress={() => router.push('/facturation')}
                    activeOpacity={0.85}
                  >
                    <AlertTriangle color={C.red600} size={20} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.reminderAlertTitle}>Facture(s) en retard d'encaissement</Text>
                      <Text style={s.reminderAlertSub}>{facturesRetard.length} facture(s) nécessitent une relance client immédiate.</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View style={s.reminderCardInfo}>
                  <Bell color={C.amber600} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reminderInfoTitle}>Planning du jour</Text>
                    <Text style={s.reminderInfoSub}>
                      {todayAudiences.length > 0
                        ? `${todayAudiences.length} audience(s) programmée(s) pour aujourd'hui.`
                        : "Aucune audience critique ce jour. Pensez à vérifier l'agenda."}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions Rapides Métier (Inclus : Nouvelle Facture) */}
              <Text style={s.sectionTitle}>Actions rapides</Text>
              <View style={s.quickActionsGrid}>
                <TouchableOpacity
                  style={s.actionCard}
                  onPress={() => router.push('/affaires')}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionIcon, { backgroundColor: C.amber100 }]}><Plus color={C.amber900} size={20} /></View>
                  <Text style={s.actionTitle}>Nouveau Dossier</Text>
                  <Text style={s.actionSub}>Ouvrir une affaire</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionCard}
                  onPress={() => router.push('/facturation')}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionIcon, { backgroundColor: C.green100 }]}><Receipt color={C.green700} size={20} /></View>
                  <Text style={s.actionTitle}>Créer Facture</Text>
                  <Text style={s.actionSub}>Honoraires client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionCard}
                  onPress={() => router.push('/audiences')}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionIcon, { backgroundColor: C.purple100 }]}><CalendarIcon color={C.purple600} size={20} /></View>
                  <Text style={s.actionTitle}>Calendrier</Text>
                  <Text style={s.actionSub}>Agenda & audiences</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.actionCard}
                  onPress={() => router.push('/clients')}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionIcon, { backgroundColor: C.blue100 }]}><Users color={C.blue700} size={20} /></View>
                  <Text style={s.actionTitle}>Fiche Client</Text>
                  <Text style={s.actionSub}>Répertoire contacts</Text>
                </TouchableOpacity>
              </View>

              {/* Dernières Affaires Actives */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Dossiers récents</Text>
                <TouchableOpacity onPress={() => router.push('/affaires')}>
                  <Text style={s.seeAllText}>Voir tout</Text>
                </TouchableOpacity>
              </View>

              {affairesRecentes.length === 0 ? (
                <View style={s.emptyCard}>
                  <FileText color={C.gray400} size={32} />
                  <Text style={s.emptyText}>Aucun dossier actif pour le moment</Text>
                </View>
              ) : (
                affairesRecentes.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={s.dossierRowCard}
                    onPress={() => router.push({ pathname: '/affaire/[id]', params: { id: d.id } })}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={s.dossierNum}>{d.numeroAffaire}</Text>
                        <View style={[s.statusPill, d.statut === 'Ouvert' ? { backgroundColor: C.blue100 } : { backgroundColor: C.orange100 }]}>
                          <Text style={[s.statusPillText, d.statut === 'Ouvert' ? { color: C.blue700 } : { color: C.orange700 }]}>{d.statut}</Text>
                        </View>
                      </View>
                      <Text style={s.dossierTitle} numberOfLines={1}>{d.titre}</Text>
                      {d.juridiction && <Text style={s.dossierJur}>{d.juridiction}</Text>}
                    </View>
                    <ArrowUpRight color={C.gray400} size={18} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ── TAB 2 : CALENDRIER JOURNALIER (AGENDA DU JOUR) ── */}
          {activeTab === 'agenda' && (
            <View style={s.tabContent}>
              <View style={s.agendaHeaderBox}>
                <CalendarIcon color={C.amber600} size={20} />
                <View style={{ flex: 1 }}>
                  <Text style={s.agendaHeaderTitle}>Calendrier Journalier</Text>
                  <Text style={s.agendaHeaderSub}>Événements et audiences prévus pour aujourd'hui</Text>
                </View>
                <TouchableOpacity style={s.agendaAddBtn} onPress={() => router.push('/audiences')}>
                  <Plus color={C.gray900} size={14} />
                  <Text style={s.agendaAddBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {/* Grille Créneaux Horaires du Jour */}
              <View style={s.timeSlotGrid}>
                {[
                  { time: '08:30', title: 'Préparation des pièces & dossier de plaidoirie', type: 'Travail Cabinet', color: C.blue600, bg: C.blue50 },
                  { time: '10:00', title: 'Audience devant la Cour d\'Appel (Chambre Civile)', type: 'Audience', color: C.amber600, bg: C.amber50 },
                  { time: '12:30', title: 'Rendez-vous Client — Consultation juridique', type: 'RDV Client', color: C.purple600, bg: C.purple50 },
                  { time: '15:00', title: 'Réunion d\'associés & Rédaction de conclusions', type: 'Réunion', color: C.green600, bg: C.green50 },
                ].map((slot, i) => (
                  <View key={i} style={s.timeSlotRow}>
                    <View style={s.timeSlotTimeWrap}>
                      <Text style={s.timeSlotTime}>{slot.time}</Text>
                      <Clock color={C.gray400} size={12} />
                    </View>
                    <View style={[s.timeSlotCard, { backgroundColor: slot.bg, borderLeftColor: slot.color, borderLeftWidth: 4 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[s.timeSlotType, { color: slot.color }]}>{slot.type}</Text>
                      </View>
                      <Text style={s.timeSlotTitle}>{slot.title}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── TAB 3 : PERFORMANCES & KPIS FINANCIERS ── */}
          {activeTab === 'kpis' && (
            <View style={s.tabContent}>
              <View style={s.statsCard}>
                <Text style={s.statsCardTitle}>Statistiques Financières du Cabinet</Text>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Total honoraires facturés :</Text>
                  <Text style={s.statValue}>{new Intl.NumberFormat('fr-FR').format(Math.round(totalFacture))} FCFA</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Montant encaissé :</Text>
                  <Text style={[s.statValue, { color: C.green600 }]}>{new Intl.NumberFormat('fr-FR').format(Math.round(totalEncaisse))} FCFA</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Reste à percevoir :</Text>
                  <Text style={[s.statValue, { color: C.red600 }]}>{new Intl.NumberFormat('fr-FR').format(Math.round(totalImpaye))} FCFA</Text>
                </View>
              </View>

              <TouchableOpacity style={s.aiAssistantBanner} onPress={() => router.push('/assistant-ia')} activeOpacity={0.85}>
                <Sparkles color={C.amber400} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={s.aiTitle}>Assistant IA Juridique</Text>
                  <Text style={s.aiSub}>Analyse de jurisprudence & aide à la rédaction de conclusions</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  safe: { backgroundColor: C.navy900 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: C.navy900,
  },
  headerGreeting: { fontSize: 12, color: C.gray400, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.white, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: C.navy800, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: C.amber400 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8, backgroundColor: C.navy800, borderRadius: 10 },
  logoutBtn: { padding: 8, backgroundColor: C.navy800, borderRadius: 10 },
  dashTabsRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, backgroundColor: C.navy900 },
  dashTabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.navy800, borderWidth: 1, borderColor: C.navy700,
  },
  dashTabBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  dashTabText: { fontSize: 12, fontWeight: '600', color: C.gray400 },
  dashTabTextActive: { color: C.gray900, fontWeight: '700' },
  tabContent: { padding: 14, gap: 14 },
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12,
    borderLeftWidth: 4, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  kpiIconWrap: { width: 34, height: 34, backgroundColor: C.amber50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiVal: { fontSize: 20, fontWeight: '700', color: C.gray900 },
  kpiLabel: { fontSize: 11, color: C.gray500, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  seeAllText: { fontSize: 12, fontWeight: '600', color: C.amber600 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '48%', backgroundColor: C.white, borderRadius: 14, padding: 12, gap: 4,
    borderWidth: 1, borderColor: C.gray200,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: C.gray900 },
  actionSub: { fontSize: 11, color: C.gray500 },
  reminderCardAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.red50,
    borderWidth: 1, borderColor: C.red200, borderRadius: 14, padding: 12,
  },
  reminderAlertTitle: { fontSize: 13, fontWeight: '700', color: C.red700 },
  reminderAlertSub: { fontSize: 11, color: C.red600, marginTop: 2 },
  reminderCardInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.amber50,
    borderWidth: 1, borderColor: C.amber200, borderRadius: 14, padding: 12,
  },
  reminderInfoTitle: { fontSize: 13, fontWeight: '700', color: C.amber900 },
  reminderInfoSub: { fontSize: 11, color: C.amber800, marginTop: 2 },
  emptyCard: { backgroundColor: C.white, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: C.gray500 },
  dossierRowCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.gray200,
  },
  dossierNum: { fontSize: 12, fontWeight: '700', color: C.amber600 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  dossierTitle: { fontSize: 14, fontWeight: '600', color: C.gray900, marginTop: 2 },
  dossierJur: { fontSize: 12, color: C.gray500, marginTop: 2 },
  agendaHeaderBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.gray200, borderRadius: 14, padding: 14,
  },
  agendaHeaderTitle: { fontSize: 14, fontWeight: '700', color: C.gray900 },
  agendaHeaderSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  agendaAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amber500, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  agendaAddBtnText: { fontSize: 11, fontWeight: '700', color: C.gray900 },
  timeSlotGrid: { gap: 10 },
  timeSlotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timeSlotTimeWrap: { width: 50, alignItems: 'center', paddingTop: 6, gap: 4 },
  timeSlotTime: { fontSize: 12, fontWeight: '700', color: C.gray700 },
  timeSlotCard: { flex: 1, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: C.gray200 },
  timeSlotType: { fontSize: 11, fontWeight: '700' },
  timeSlotTitle: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  statsCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: C.gray200 },
  statsCardTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  statLabel: { fontSize: 13, color: C.gray600 },
  statValue: { fontSize: 14, fontWeight: '700', color: C.gray900 },
  aiAssistantBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy900,
    borderRadius: 16, padding: 16, marginTop: 6,
  },
  aiTitle: { fontSize: 15, fontWeight: '700', color: C.white },
  aiSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
});
