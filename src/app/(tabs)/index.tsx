/**
 * src/app/(tabs)/index.tsx
 * Tableau de bord Executive avec :
 *  - Cloche de Notifications 🔔 dans l'en-tête (à côté de déconnexion) ouvrant une Modal Pop-up interactive
 *  - Calendrier Journalier (Agenda du Jour avec données réelles BDD)
 *  - Rappels & Alertes Intelligentes (Factures en retard, Échéances)
 *  - Raccourcis Métier (Nouveau Dossier, Créer Facture, Calendrier, Fiche Client)
 */

import { AppColors as C } from '@/constants/theme';
import { useAudiences } from '@/hooks/useAudiences';
import { useAuth } from '@/hooks/useAuth';
import { useDossiers } from '@/hooks/useDossiers';
import { useFactures } from '@/hooks/useFactures';
import { createFacture, deleteFacture, Facture, getSoldeRestant } from '@/services/facturation.service';
import {
  getNotifications, marquerNotificationCommeLue, marquerToutesNotificationsCommeLues,
  NotificationItem,
} from '@/services/notifications.service';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Bell, Brain, Briefcase,
  Calendar as CalendarIcon, CheckCheck, CheckCircle2, Clock, DollarSign, FileText,
  Info, LayoutDashboard, LogOut, Plus, Receipt, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, X, Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { extractErrorMessage } from '@/lib/api';
import { checkUpcomingEventReminders } from '@/lib/notificationsManager';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DashboardTab = 'overview' | 'agenda' | 'facturation';

const DASHBOARD_TABS: { id: DashboardTab; label: string; Icon: any }[] = [
  { id: 'overview',    label: "Vue d'ensemble", Icon: LayoutDashboard },
  { id: 'agenda',      label: 'Agenda du Jour', Icon: CalendarIcon },
  { id: 'facturation', label: 'Facturation',    Icon: Receipt },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Modal Pop-up Notifications
  const [showNotifPopUp, setShowNotifPopUp] = useState(false);
  const [notifs, setNotifs]                 = useState<NotificationItem[]>([]);
  const [nonLues, setNonLues]               = useState(0);
  const [loadingNotifs, setLoadingNotifs]   = useState(false);

  // Backend Data Hooks
  const { dossiers }  = useDossiers({ pageSize: 50 });
  const { audiences } = useAudiences({ pageSize: 50 });
  const {
    factures, totalFacture, totalEncaisse, totalImpaye, tauxRecouvrement,
    refetch: refetchFactures, create: createFacture,
  } = useFactures();

  // Modal Nouvelle Facture (Page d'accueil)
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [factDossierId, setFactDossierId]     = useState<number | undefined>(undefined);
  const [factMontantHt, setFactMontantHt]     = useState('');
  const [factTva, setFactTva]                 = useState('19.25');
  const [factEcheance, setFactEcheance]       = useState('');
  const [factDesc, setFactDesc]               = useState('');
  const [creatingFact, setCreatingFact]       = useState(false);

  // Chargement des notifications réelles du backend (silencieux si indisponible)
  const fetchNotifs = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await getNotifications();
      setNotifs(res.data);
      setNonLues(res.nonLuesCount);
    } catch (e: any) {
      // 404 = table notifications pas encore migrée, ou endpoint indisponible
      // On ne bloque pas l'UI : la cloche reste accessible mais vide
      const status = e?.response?.status;
      if (status !== 404 && status !== 401) {
        console.log('[Notifications] Erreur de chargement (status:', status, ')');
      }
      setNotifs([]);
      setNonLues(0);
    } finally {
      setLoadingNotifs(false);
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
      console.log('Error mark all read:', e);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await marquerNotificationCommeLue(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
      setNonLues(p => Math.max(0, p - 1));
    } catch (e) {
      console.log('Error mark read:', e);
    }
  };

  // Handlers Création Facture (Page Accueil)
  const handleOpenFactureModal = () => {
    if (dossiers.length > 0) setFactDossierId(Number(dossiers[0].id));
    setFactMontantHt('');
    setFactTva('19.25');
    const defaultEch = new Date();
    defaultEch.setDate(defaultEch.getDate() + 30);
    setFactEcheance(defaultEch.toISOString().slice(0, 10));
    setFactDesc('');
    setShowFactureModal(true);
  };

  const handleCreateFacture = async () => {
    if (!factMontantHt || isNaN(Number(factMontantHt)) || Number(factMontantHt) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant Hors Taxe valide.');
      return;
    }
    const dossierSelected = dossiers.find(d => Number(d.id) === Number(factDossierId));
    if (!dossierSelected) {
      Alert.alert('Erreur', 'Veuillez sélectionner un dossier.');
      return;
    }

    setCreatingFact(true);
    try {
      await createFacture({
        dossierId: Number(dossierSelected.id),
        clientId: Number(dossierSelected.clientId),
        montantHt: Number(factMontantHt),
        tauxTva: Number(factTva) || 19.25,
        dateEcheance: factEcheance || undefined,
        description: factDesc.trim() || undefined,
      });

      setShowFactureModal(false);
      refetchFactures();
      Alert.alert('Succès', 'Facture créée avec succès.');
    } catch (e) {
      Alert.alert('Erreur', extractErrorMessage(e));
    } finally {
      setCreatingFact(false);
    }
  };

  const handleDeleteFacture = (f: Facture) => {
    Alert.alert(
      'Supprimer la facture',
      `Êtes-vous sûr de vouloir supprimer définitivement la facture ${f.numeroFacture} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFacture(f.id);
              refetchFactures();
              Alert.alert('Succès', 'La facture a été supprimée.');
            } catch (e) {
              Alert.alert('Erreur', extractErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const affairesActives = dossiers.filter(
    d => d.statut === 'Ouvert' || d.statut === 'En cours'
  ).length;
  const affairesCloturees = dossiers.filter(d => d.statut === 'Cloture').length;
  const facturesRetard = factures.filter(f => f.statut === 'en_retard');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAudiences = audiences.filter(a => a.dateAudience?.startsWith(todayStr));

  // Vérification automatique des rappels 30 min avant les événements
  useEffect(() => {
    if (audiences.length > 0) {
      const remList = audiences.map(a => ({
        id: a.id,
        titre: a.typeAudience || 'Événement Cabinet',
        dateStr: a.dateAudience ? a.dateAudience.slice(0, 10) : '',
        heureStr: a.heure || '09:00',
      }));
      checkUpcomingEventReminders(remList);
    }
  }, [audiences]);

  const affairesRecentes = dossiers
    .filter(d => d.statut === 'Ouvert' || d.statut === 'En cours')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy900} />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* ── En-tête Executive avec Cloche Notifications & Déconnexion à droite ── */}
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

              {/* 🔔 Icône Cloche Notifications Pop-up */}
              <TouchableOpacity
                style={s.bellBtn}
                onPress={() => { fetchNotifs(); setShowNotifPopUp(true); }}
                activeOpacity={0.8}
              >
                <Bell color={C.white} size={20} />
                {nonLues > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{nonLues > 9 ? '9+' : nonLues}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Bouton Déconnexion */}
              <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
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

              {/* 🔔 BLOC RAPPELS & NOTIFICATIONS IMPORTANTES */}
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

              {/* Actions Rapides Métier */}
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

          {/* ── TAB 2 : CALENDRIER JOURNALIER (DONNÉES RÉELLES) ── */}
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

              {/* Données réelles des événements d'aujourd'hui */}
              {todayAudiences.length === 0 ? (
                <View style={s.emptyCard}>
                  <CalendarIcon color={C.gray400} size={36} />
                  <Text style={s.emptyText}>Aucune audience ou rendez-vous prévu aujourd'hui</Text>
                  <TouchableOpacity style={s.agendaAddBtn} onPress={() => router.push('/audiences')}>
                    <Plus color={C.gray900} size={14} />
                    <Text style={s.agendaAddBtnText}>Planifier un événement</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.timeSlotGrid}>
                  {todayAudiences.map((aud) => {
                    const timeStr = aud.heure || '09:00';
                    const isTenue = aud.statut === 'tenue';
                    const cardBg = isTenue ? C.green50 : C.amber50;
                    const cardColor = isTenue ? C.green600 : C.amber600;
                    return (
                      <View key={String(aud.id)} style={s.timeSlotRow}>
                        <View style={s.timeSlotTimeWrap}>
                          <Text style={s.timeSlotTime}>{timeStr}</Text>
                          <Clock color={C.gray400} size={12} />
                        </View>
                        <View style={[s.timeSlotCard, { backgroundColor: cardBg, borderLeftColor: cardColor, borderLeftWidth: 4 }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[s.timeSlotType, { color: cardColor }]}>{aud.typeAudience || 'Audience'}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: cardColor }}>{aud.statut.toUpperCase()}</Text>
                          </View>
                          <Text style={s.timeSlotTitle}>{aud.juridiction || 'Tribunal de Grande Instance'}</Text>
                          {aud.notes ? <Text style={{ fontSize: 11, color: C.gray600, marginTop: 2 }}>{aud.notes}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── TAB 3 : FACTURATION & ENCAISSEMENTS ── */}
          {activeTab === 'facturation' && (
            <View style={s.tabContent}>
              <View style={s.agendaHeaderBox}>
                <Receipt color={C.green600} size={20} />
                <View style={{ flex: 1 }}>
                  <Text style={s.agendaHeaderTitle}>Facturation & Encaissements</Text>
                  <Text style={s.agendaHeaderSub}>Honoraires, suivi des paiements et relances</Text>
                </View>
                <TouchableOpacity style={s.agendaAddBtn} onPress={handleOpenFactureModal} activeOpacity={0.8}>
                  <Plus color={C.gray900} size={14} />
                  <Text style={s.agendaAddBtnText}>Nouvelle Facture</Text>
                </TouchableOpacity>
              </View>

              {/* KPIs Financiers */}
              <View style={s.kpiGrid}>
                <View style={[s.kpiCard, { borderLeftColor: C.gray900 }]}>
                  <Text style={s.kpiLabel}>Total facturé</Text>
                  <Text style={[s.kpiVal, { fontSize: 16 }]}>{totalFacture > 0 ? `${(totalFacture / 1_000_000).toFixed(1)}M` : '0'} FCFA</Text>
                </View>

                <View style={[s.kpiCard, { borderLeftColor: C.green500 }]}>
                  <Text style={s.kpiLabel}>Total encaissé</Text>
                  <Text style={[s.kpiVal, { fontSize: 16, color: C.green600 }]}>{totalEncaisse > 0 ? `${(totalEncaisse / 1_000_000).toFixed(1)}M` : '0'} FCFA</Text>
                </View>

                <View style={[s.kpiCard, { borderLeftColor: C.red500 }]}>
                  <Text style={s.kpiLabel}>Reste à percevoir</Text>
                  <Text style={[s.kpiVal, { fontSize: 16, color: C.red600 }]}>{totalImpaye > 0 ? `${(totalImpaye / 1_000_000).toFixed(1)}M` : '0'} FCFA</Text>
                </View>

                <View style={[s.kpiCard, { borderLeftColor: C.amber500 }]}>
                  <Text style={s.kpiLabel}>Taux recouvrement</Text>
                  <Text style={[s.kpiVal, { fontSize: 16, color: C.amber600 }]}>{tauxRecouvrement}%</Text>
                </View>
              </View>

              {/* Liste des Factures */}
              {factures.length === 0 ? (
                <View style={s.emptyCard}>
                  <DollarSign color={C.gray400} size={36} />
                  <Text style={s.emptyText}>Aucune facture d'honoraires enregistrée</Text>
                  <TouchableOpacity style={s.agendaAddBtn} onPress={handleOpenFactureModal} activeOpacity={0.8}>
                    <Plus color={C.gray900} size={14} />
                    <Text style={s.agendaAddBtnText}>Créer la première facture</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {factures.map((f) => {
                    const statusColor = f.statut === 'payee' ? C.green600 : f.statut === 'en_retard' ? C.red600 : f.statut === 'partielle' ? C.amber600 : C.gray600;
                    const statusBg = f.statut === 'payee' ? C.green50 : f.statut === 'en_retard' ? C.red50 : f.statut === 'partielle' ? C.amber50 : C.gray100;
                    return (
                      <View key={String(f.id)} style={[s.timeSlotCard, { backgroundColor: C.white, borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={s.timeSlotTitle}>{f.numeroFacture}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>{f.statut.toUpperCase()}</Text>
                            </View>
                            <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteFacture(f)} activeOpacity={0.8}>
                              <Trash2 color={C.red600} size={15} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {f.description ? <Text style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{f.description}</Text> : null}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.gray100 }}>
                          <Text style={{ fontSize: 12, color: C.gray500 }}>Montant TTC: <Text style={{ fontWeight: '700', color: C.gray900 }}>{new Intl.NumberFormat('fr-FR').format(Math.round(Number(f.montantTtc)))} FCFA</Text></Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor }}>Solde: {new Intl.NumberFormat('fr-FR').format(Math.round(getSoldeRestant(f)))} FCFA</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* ── MODAL POP-UP DES NOTIFICATIONS (Relié à l'icône cloche 🔔) ── */}
      <Modal visible={showNotifPopUp} transparent animationType="slide" onRequestClose={() => setShowNotifPopUp(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNotifPopUp(false)}>
          <TouchableOpacity style={s.sheetNotif} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell color={C.amber600} size={20} />
                <Text style={s.sheetNotifTitle}>Notifications</Text>
                {nonLues > 0 && (
                  <View style={s.notifBadgePop}>
                    <Text style={s.notifBadgePopText}>{nonLues} non lue(s)</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowNotifPopUp(false)}>
                <X color={C.gray600} size={18} />
              </TouchableOpacity>
            </View>

            {nonLues > 0 && (
              <TouchableOpacity style={s.markAllPopBtn} onPress={handleMarkAllRead} activeOpacity={0.8}>
                <CheckCheck color={C.amber900} size={14} />
                <Text style={s.markAllPopText}>Tout marquer comme lu</Text>
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
              {loadingNotifs ? (
                <ActivityIndicator color={C.amber500} style={{ paddingVertical: 20 }} />
              ) : notifs.length === 0 ? (
                <View style={s.emptyNotifBox}>
                  <Bell color={C.gray400} size={36} />
                  <Text style={s.emptyNotifTitle}>Aucune notification</Text>
                  <Text style={s.emptyNotifSub}>Vous êtes parfaitement à jour !</Text>
                </View>
              ) : (
                notifs.map(n => (
                  <TouchableOpacity
                    key={String(n.id)}
                    style={[s.notifCardItem, !n.lu && s.notifCardItemUnread]}
                    onPress={() => handleMarkRead(n.id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                      <View style={[s.notifIconWrap, n.type === 'facture_retard' ? { backgroundColor: C.red100 } : { backgroundColor: C.blue100 }]}>
                        {n.type === 'facture_retard' ? <AlertTriangle color={C.red600} size={16} /> : <Bell color={C.blue600} size={16} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.notifItemTitle, !n.lu && { color: C.gray900 }]} numberOfLines={1}>{n.titre}</Text>
                        <Text style={s.notifItemMsg} numberOfLines={2}>{n.message}</Text>
                        <Text style={s.notifItemDate}>{new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      {!n.lu && <View style={s.unreadDotPop} />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* ── MODAL NOUVELLE FACTURE (PAGE D'ACCUEIL) ── */}
      <Modal visible={showFactureModal} transparent animationType="slide" onRequestClose={() => setShowFactureModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFactureModal(false)}>
          <TouchableOpacity style={s.sheetNotif} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.gray900, marginBottom: 14 }}>Nouvelle Facture d'Honoraires</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Dossier */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 }}>Dossier / Affaire concernée *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {dossiers.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setFactDossierId(Number(d.id))}
                      style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 }, Number(factDossierId) === Number(d.id) && { backgroundColor: C.amber100, borderColor: C.amber400 }]}
                    >
                      <Text style={[{ fontSize: 12, color: C.gray700 }, Number(factDossierId) === Number(d.id) && { color: C.amber900, fontWeight: '700' }]}>
                        {d.numeroAffaire} — {d.titre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Montant HT & TVA */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 }}>Montant HT (FCFA) *</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.gray900 }}
                    value={factMontantHt}
                    onChangeText={setFactMontantHt}
                    keyboardType="numeric"
                    placeholder="ex: 500000"
                    placeholderTextColor={C.gray400}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 }}>TVA (%)</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.gray900 }}
                    value={factTva}
                    onChangeText={setFactTva}
                    keyboardType="numeric"
                    placeholder="19.25"
                    placeholderTextColor={C.gray400}
                  />
                </View>
              </View>

              {/* Estimation TTC */}
              {factMontantHt && !isNaN(Number(factMontantHt)) ? (
                <View style={{ backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 10, padding: 10, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: C.amber900 }}>
                    Montant TTC estimé : <Text style={{ fontWeight: '800', color: C.amber900 }}>{new Intl.NumberFormat('fr-FR').format(Math.round(Number(factMontantHt) * (1 + (Number(factTva) || 19.25) / 100)))} FCFA</Text>
                  </Text>
                </View>
              ) : null}

              {/* Échéance */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 }}>Date d'échéance (YYYY-MM-DD)</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.gray900 }}
                  value={factEcheance}
                  onChangeText={setFactEcheance}
                  placeholder="2026-10-15"
                  placeholderTextColor={C.gray400}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 }}>Description / Libellé des prestations</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.gray900, height: 75, textAlignVertical: 'top' }}
                  value={factDesc}
                  onChangeText={setFactDesc}
                  multiline
                  numberOfLines={3}
                  placeholder="ex: Honoraires de diligence, plaidoirie, rédaction d'actes..."
                  placeholderTextColor={C.gray400}
                />
              </View>

              <TouchableOpacity
                style={[{ backgroundColor: C.amber500, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 }, creatingFact && { opacity: 0.6 }]}
                onPress={handleCreateFacture}
                disabled={creatingFact}
                activeOpacity={0.85}
              >
                {creatingFact ? <ActivityIndicator color={C.gray900} /> : <Text style={{ fontSize: 14, fontWeight: '700', color: C.gray900 }}>Enregistrer la facture</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ borderWidth: 1, borderColor: C.gray200, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }} onPress={() => setShowFactureModal(false)} activeOpacity={0.8}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: C.gray500 }}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  bellBtn: { padding: 8, backgroundColor: C.navy800, borderRadius: 10, position: 'relative' },
  logoutBtn: { padding: 8, backgroundColor: C.navy800, borderRadius: 10 },
  badge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: C.red500,
    borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: C.white, fontSize: 10, fontWeight: '700' },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetNotif: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetNotifTitle: { fontSize: 17, fontWeight: '700', color: C.gray900 },
  notifBadgePop: { backgroundColor: C.red100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  notifBadgePopText: { fontSize: 10, fontWeight: '700', color: C.red700 },
  closeBtn: { padding: 6, backgroundColor: C.gray100, borderRadius: 12 },
  markAllPopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  markAllPopText: { fontSize: 12, fontWeight: '600', color: C.amber900 },
  emptyNotifBox: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyNotifTitle: { fontSize: 14, fontWeight: '700', color: C.gray900 },
  emptyNotifSub: { fontSize: 12, color: C.gray500 },
  notifCardItem: { backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, padding: 12, position: 'relative' },
  notifCardItemUnread: { backgroundColor: C.white, borderColor: C.amber300, borderLeftWidth: 4, borderLeftColor: C.amber500 },
  notifIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  notifItemTitle: { fontSize: 13, fontWeight: '600', color: C.gray800 },
  notifItemMsg: { fontSize: 12, color: C.gray600, marginTop: 2 },
  notifItemDate: { fontSize: 10, color: C.gray400, marginTop: 4 },
  unreadDotPop: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber500 },
});
