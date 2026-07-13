import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ScrollView, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollText, Filter, RotateCcw, AlertTriangle,
  ChevronDown, ChevronUp, X, Clock,
  LogIn, LogOut, FileText, DollarSign,
  Users, Shield, Download,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { journalActivites, type LogActivite, type RoleKey } from '@/data/adminData';

const ACTION_CFG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  connexion:              { label: 'Connexion',           color: C.green600,   bg: C.green50,   Icon: LogIn },
  deconnexion:            { label: 'Déconnexion',         color: C.gray500,    bg: C.gray100,   Icon: LogOut },
  connexion_echec:        { label: 'Échec connexion',     color: C.red600,     bg: C.red50,     Icon: AlertTriangle },
  tentative_acces_refuse: { label: 'Accès refusé',        color: C.red600,     bg: C.red50,     Icon: Shield },
  creation_dossier:       { label: 'Création dossier',    color: C.blue600,    bg: C.blue50,    Icon: FileText },
  modification_dossier:   { label: 'Modif. dossier',      color: C.orange600,  bg: C.orange50,  Icon: FileText },
  cloture_dossier:        { label: 'Clôture dossier',     color: C.gray600,    bg: C.gray100,   Icon: FileText },
  ajout_document:         { label: 'Ajout document',      color: '#7c3aed',    bg: '#faf5ff',   Icon: FileText },
  suppression_document:   { label: 'Suppression doc.',    color: C.red600,     bg: C.red50,     Icon: FileText },
  creation_facture:       { label: 'Création facture',    color: C.green600,   bg: C.green50,   Icon: DollarSign },
  paiement_enregistre:    { label: 'Paiement enregistré', color: C.green600,   bg: C.green50,   Icon: DollarSign },
  modification_permissions:{ label: 'Modif. permissions', color: C.red600,    bg: C.red50,     Icon: Shield },
  creation_utilisateur:   { label: 'Création utilisateur',color: C.blue600,   bg: C.blue50,    Icon: Users },
  modification_role:      { label: 'Modif. rôle',         color: C.red600,     bg: C.red50,     Icon: Shield },
  planification_audience: { label: 'Planif. audience',    color: C.amber600,   bg: C.amber50,   Icon: Clock },
  export_donnees:         { label: 'Export données',      color: C.orange600,  bg: C.orange50,  Icon: Download },
  restauration_donnees:   { label: 'Restauration',        color: C.purple600,  bg: C.purple50,  Icon: RotateCcw },
};

const ROLE_COLORS: Record<RoleKey, string> = {
  administrateur: '#dc2626', associe: '#7c3aed', avocat: C.blue600, assistant: C.green600,
};

type FilterType = 'all' | 'securite' | 'dossiers' | 'facturation' | 'administration' | 'restaurable';

export default function AuditScreen() {
  const [logs, setLogs]             = useState<LogActivite[]>(journalActivites);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedLog, setSelectedLog]   = useState<LogActivite | null>(null);
  const [showFilters, setShowFilters]   = useState(false);
  const [moduleFilter, setModuleFilter] = useState('all');

  const modules = ['all', ...new Set(logs.map(l => l.module))];

  const alertes = logs.filter(
    l => l.action === 'connexion_echec' || l.action === 'tentative_acces_refuse'
  ).length;
  const restaurables = logs.filter(l => l.restaurable).length;

  const filtered = [...logs]
    .filter(l => {
      if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
      if (activeFilter === 'securite') return l.action === 'connexion_echec' || l.action === 'tentative_acces_refuse';
      if (activeFilter === 'dossiers') return l.module === 'Dossiers' || l.module === 'Documents';
      if (activeFilter === 'facturation') return l.module === 'Facturation';
      if (activeFilter === 'administration') return l.module === 'Administration' || l.module === 'Authentification';
      if (activeFilter === 'restaurable') return l.restaurable;
      return true;
    })
    .sort((a, b) => new Date(b.horodatage).getTime() - new Date(a.horodatage).getTime());

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(dt);
  };

  const fmtRel = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h`;
    return `${Math.floor(diff / 86400000)}j`;
  };

  const handleRestaurer = (log: LogActivite) => {
    Alert.alert(
      'Restaurer les données',
      `Voulez-vous restaurer l'état antérieur de ${log.ressourceType ?? 'cette ressource'} ?\n\nValeur précédente :\n"${log.ancienneValeur}"`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: () => {
            const newLog: LogActivite = {
              id: `log_rest_${Date.now()}`,
              utilisateurId: 'u1',
              utilisateurNom: 'Tchio Paul',
              utilisateurRole: 'administrateur',
              action: 'restauration_donnees',
              module: log.module,
              description: `Restauration de ${log.ressourceType ?? 'ressource'} — ${log.ressourceId} vers état antérieur`,
              horodatage: new Date().toISOString(),
              adresseIP: '192.168.1.10',
              ressourceId: log.ressourceId,
              ressourceType: log.ressourceType,
              ancienneValeur: log.nouvelleValeur,
              nouvelleValeur: log.ancienneValeur,
              restaurable: false,
            };
            setLogs(prev => [newLog, ...prev]);
            setSelectedLog(null);
            Alert.alert('Restauration effectuée', 'L\'action a été journalisée dans l\'audit.');
          },
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1a0a0a' }}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Journal d'audit</Text>
            <Text style={s.sub}>{logs.length} entrée(s) · Traçabilité complète</Text>
          </View>
          <TouchableOpacity
            style={s.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.8}
          >
            <Filter color={C.white} size={16} />
          </TouchableOpacity>
        </View>

        {/* Stats rapides */}
        <View style={s.statsRow}>
          {[
            { val: logs.length,    label: 'Total',       color: C.white },
            { val: alertes,        label: 'Alertes',     color: '#fca5a5' },
            { val: restaurables,   label: 'Restaurables',color: C.amber400 },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Filtres rapides */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
          {([
            { key: 'all',            label: 'Tous' },
            { key: 'securite',       label: '🔴 Sécurité' },
            { key: 'restaurable',    label: '↩ Restaurables' },
            { key: 'dossiers',       label: 'Dossiers' },
            { key: 'facturation',    label: 'Facturation' },
            { key: 'administration', label: 'Admin' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
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

      {/* Filtre module */}
      {showFilters && (
        <View style={s.modFilterBox}>
          <Text style={s.modFilterLabel}>Filtrer par module :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {modules.map(mod => (
              <TouchableOpacity
                key={mod}
                onPress={() => setModuleFilter(mod)}
                style={[s.modFilterBtn, moduleFilter === mod && s.modFilterBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.modFilterText, moduleFilter === mod && s.modFilterTextActive]}>
                  {mod === 'all' ? 'Tous les modules' : mod}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={s.resultCount}>{filtered.length} entrée(s)</Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <ScrollText color={C.gray300} size={48} />
            <Text style={s.emptyText}>Aucun log correspondant</Text>
          </View>
        }
        renderItem={({ item: log }) => {
          const cfg = ACTION_CFG[log.action] ?? { label: log.action, color: C.gray500, bg: C.gray100, Icon: ScrollText };
          const Icon = cfg.Icon;
          const isAlerte = log.action === 'connexion_echec' || log.action === 'tentative_acces_refuse';
          return (
            <TouchableOpacity
              style={[s.logCard, isAlerte && s.logCardAlerte]}
              onPress={() => setSelectedLog(log)}
              activeOpacity={0.8}
            >
              <View style={[s.logIcon, { backgroundColor: cfg.bg }]}>
                <Icon color={cfg.color} size={16} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={s.logTopRow}>
                  <View style={[s.actionBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.actionBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {log.restaurable && (
                    <View style={s.restoreBadge}>
                      <RotateCcw color={C.amber700} size={10} />
                      <Text style={s.restoreBadgeText}>Restaurable</Text>
                    </View>
                  )}
                </View>
                <Text style={s.logDesc} numberOfLines={1}>{log.description}</Text>
                <View style={s.logMeta}>
                  <View style={[s.roleDot, { backgroundColor: ROLE_COLORS[log.utilisateurRole] }]} />
                  <Text style={s.logMetaText}>{log.utilisateurNom}</Text>
                  <Text style={s.logMetaDot}>·</Text>
                  <Text style={s.logMetaText}>{log.adresseIP}</Text>
                </View>
              </View>
              <Text style={s.logTime}>{fmtRel(log.horodatage)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal détail log */}
      <Modal visible={selectedLog !== null} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
        <TouchableOpacity style={s.overlay} onPress={() => setSelectedLog(null)} activeOpacity={1}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            {selectedLog && (() => {
              const cfg = ACTION_CFG[selectedLog.action] ?? { label: selectedLog.action, color: C.gray500, bg: C.gray100, Icon: ScrollText };
              const Icon = cfg.Icon;
              const isAlerte = selectedLog.action === 'connexion_echec' || selectedLog.action === 'tentative_acces_refuse';
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={s.sheetHeader}>
                    <View style={[s.logIconLg, { backgroundColor: cfg.bg }]}>
                      <Icon color={cfg.color} size={22} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetTitle}>{cfg.label}</Text>
                      <Text style={s.sheetModule}>{selectedLog.module}</Text>
                    </View>
                    {isAlerte && (
                      <View style={s.alertePill}>
                        <AlertTriangle color={C.red600} size={12} />
                        <Text style={s.alertePillText}>Alerte</Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <View style={s.descBox}>
                    <Text style={s.descLabel}>Description</Text>
                    <Text style={s.descText}>{selectedLog.description}</Text>
                  </View>

                  {/* Infos techniques */}
                  <View style={s.infoGrid}>
                    {[
                      { label: 'Utilisateur',   val: selectedLog.utilisateurNom },
                      { label: 'Rôle',          val: selectedLog.utilisateurRole },
                      { label: 'Module',        val: selectedLog.module },
                      { label: 'Horodatage',    val: fmtDate(selectedLog.horodatage) },
                      { label: 'Adresse IP',    val: selectedLog.adresseIP },
                      ...(selectedLog.ressourceType ? [{ label: 'Ressource', val: `${selectedLog.ressourceType} #${selectedLog.ressourceId}` }] : []),
                    ].map(({ label, val }) => (
                      <View key={label} style={s.infoRow}>
                        <Text style={s.infoLabel}>{label}</Text>
                        <Text style={s.infoVal} numberOfLines={2}>{val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Avant / Après */}
                  {(selectedLog.ancienneValeur || selectedLog.nouvelleValeur) && (
                    <View style={s.diffSection}>
                      <Text style={s.diffTitle}>Modifications</Text>
                      {selectedLog.ancienneValeur && (
                        <View style={s.diffBox}>
                          <Text style={s.diffLabelBefore}>Avant</Text>
                          <Text style={s.diffTextBefore}>{selectedLog.ancienneValeur}</Text>
                        </View>
                      )}
                      {selectedLog.nouvelleValeur && (
                        <View style={[s.diffBox, s.diffBoxAfter]}>
                          <Text style={s.diffLabelAfter}>Après</Text>
                          <Text style={s.diffTextAfter}>{selectedLog.nouvelleValeur}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ gap: 10, marginTop: 12, paddingBottom: 20 }}>
                    {selectedLog.restaurable && selectedLog.ancienneValeur && (
                      <TouchableOpacity
                        style={s.restoreBtn}
                        onPress={() => handleRestaurer(selectedLog)}
                        activeOpacity={0.85}
                      >
                        <RotateCcw color={C.white} size={16} />
                        <Text style={s.restoreBtnText}>Restaurer l'état antérieur</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedLog(null)} activeOpacity={0.8}>
                      <Text style={s.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: '#fca5a5', marginTop: 2 },
  filterToggle: { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.gray400, marginTop: 2 },
  filtersRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.07)' },
  filterBtnActive: { backgroundColor: C.red600, borderColor: C.red600 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray400 },
  filterTextActive: { color: C.white },
  modFilterBox: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100, padding: 12 },
  modFilterLabel: { fontSize: 11, color: C.gray500, marginBottom: 8, fontWeight: '600' },
  modFilterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  modFilterBtnActive: { backgroundColor: C.red600, borderColor: C.red600 },
  modFilterText: { fontSize: 12, color: C.gray600 },
  modFilterTextActive: { color: C.white, fontWeight: '600' },
  resultCount: { fontSize: 12, color: C.gray500, paddingHorizontal: 14, paddingVertical: 6 },
  list: { padding: 12, paddingBottom: 100, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: C.gray500 },
  logCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  logCardAlerte: { borderLeftWidth: 3, borderLeftColor: C.red500 },
  logIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  actionBadgeText: { fontSize: 11, fontWeight: '600' },
  restoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.amber100, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  restoreBadgeText: { fontSize: 10, color: C.amber700, fontWeight: '600' },
  logDesc: { fontSize: 13, color: C.gray900, marginBottom: 4, fontWeight: '500' },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roleDot: { width: 7, height: 7, borderRadius: 3.5 },
  logMetaText: { fontSize: 11, color: C.gray500 },
  logMetaDot: { color: C.gray300, fontSize: 11 },
  logTime: { fontSize: 11, color: C.gray400, marginLeft: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logIconLg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.gray900 },
  sheetModule: { fontSize: 12, color: C.gray500, marginTop: 2 },
  alertePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.red50, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  alertePillText: { fontSize: 12, color: C.red600, fontWeight: '600' },
  descBox: { backgroundColor: C.gray50, borderRadius: 12, padding: 14, marginBottom: 14 },
  descLabel: { fontSize: 12, color: C.gray500, fontWeight: '600', marginBottom: 6 },
  descText: { fontSize: 14, color: C.gray900, lineHeight: 22 },
  infoGrid: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: C.gray50 },
  infoLabel: { fontSize: 13, color: C.gray500, width: 110 },
  infoVal: { fontSize: 13, fontWeight: '500', color: C.gray900, flex: 1, textAlign: 'right' },
  diffSection: { marginBottom: 14 },
  diffTitle: { fontSize: 14, fontWeight: '700', color: C.gray900, marginBottom: 10 },
  diffBox: { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red100, borderRadius: 12, padding: 12, marginBottom: 8 },
  diffBoxAfter: { backgroundColor: C.green50, borderColor: C.green100 },
  diffLabelBefore: { fontSize: 11, fontWeight: '700', color: C.red600, marginBottom: 6 },
  diffLabelAfter: { fontSize: 11, fontWeight: '700', color: C.green600, marginBottom: 6 },
  diffTextBefore: { fontSize: 13, color: C.red800 ?? '#991b1b', lineHeight: 20 },
  diffTextAfter: { fontSize: 13, color: C.green700, lineHeight: 20 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 14 },
  restoreBtnText: { fontSize: 15, fontWeight: '600', color: C.white },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
});
