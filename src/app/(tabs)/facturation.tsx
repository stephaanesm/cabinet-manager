import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DollarSign, Plus, AlertTriangle, ChevronRight, CheckCircle,
  Clock, Send, FileText, TrendingUp, Search, X,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { factures, affaires, encaissements, type Facture } from '@/data/mockData';
import { useRouter } from 'expo-router';

const STATUT: Record<Facture['statut'], { label: string; bg: string; text: string; Icon: any }> = {
  brouillon: { label: 'Brouillon',          bg: C.gray100,   text: C.gray600,   Icon: FileText },
  envoyee:   { label: 'Envoyée',            bg: C.blue100,   text: C.blue700,   Icon: Send },
  partielle: { label: 'Paiement partiel',   bg: C.orange100, text: C.orange700, Icon: Clock },
  payee:     { label: 'Payée',              bg: C.green100,  text: C.green700,  Icon: CheckCircle },
  en_retard: { label: 'En retard',          bg: C.red100,    text: C.red700,    Icon: AlertTriangle },
};
const FILTER_ORDER: (Facture['statut'] | 'all')[] = ['all', 'en_retard', 'partielle', 'envoyee', 'payee', 'brouillon'];

export default function FacturationScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState<Facture['statut'] | 'all'>('all');
  const [selected, setSelected] = useState<Facture | null>(null);

  const totalFacture  = factures.reduce((s, f) => s + f.montant, 0);
  const totalEncaisse = factures.reduce((s, f) => s + f.montantPaye, 0);
  const totalImpaye   = totalFacture - totalEncaisse;
  const tauxRecouvrement = totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 100) : 0;
  const facturesRetard = factures.filter(f => f.statut === 'en_retard');

  const getAffaire = (id: string) => affaires.find(a => a.id === id);
  const getEnc = (id: string) => encaissements.filter(e => e.factureId === id);
  const fmtM = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  const fmtD = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

  const filtered = factures.filter(f => {
    const a = getAffaire(f.affaireId);
    const q = search.toLowerCase();
    return (f.numero.toLowerCase().includes(q)
      || (a?.intitule.toLowerCase().includes(q) ?? false)
      || (a?.client.nom.toLowerCase().includes(q) ?? false))
      && (statut === 'all' || f.statut === statut);
  });

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Facturation</Text>
            <Text style={s.sub}>Suivi des honoraires et paiements</Text>
          </View>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={s.kpiGrid}>
          {[
            { label: 'Total facturé',     val: `${(totalFacture / 1_000_000).toFixed(1)}M`,  color: C.white },
            { label: 'Total encaissé',    val: `${(totalEncaisse / 1_000_000).toFixed(1)}M`, color: '#86efac' },
            { label: 'Impayé',            val: `${(totalImpaye / 1_000_000).toFixed(1)}M`,   color: '#fca5a5' },
            { label: 'Taux recouvrement', val: `${tauxRecouvrement}%`, color: tauxRecouvrement >= 75 ? '#86efac' : tauxRecouvrement >= 50 ? C.amber400 : '#fca5a5' },
          ].map(k => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Alert retard */}
      {facturesRetard.length > 0 && (
        <View style={s.alertCard}>
          <AlertTriangle color={C.red600} size={20} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.alertTitle}>{facturesRetard.length} facture(s) en retard</Text>
            {facturesRetard.slice(0, 2).map(f => {
              const a = getAffaire(f.affaireId);
              return (
                <Text key={f.id} style={s.alertItem}>
                  • {f.numero} — {a?.client.nom} : {fmtM(f.montant - f.montantPaye)} impayé
                </Text>
              );
            })}
          </View>
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Search color={C.gray400} size={18} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une facture..."
          placeholderTextColor={C.gray400}
        />
        {search !== '' && <TouchableOpacity onPress={() => setSearch('')}><X color={C.gray400} size={16} /></TouchableOpacity>}
      </View>

      {/* Statut filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={s.filtersContent}>
        {FILTER_ORDER.map(st => (
          <TouchableOpacity
            key={st}
            onPress={() => setStatut(st)}
            style={[s.filterBtn, statut === st && s.filterBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.filterText, statut === st && s.filterTextActive]}>
              {st === 'all' ? `Toutes (${factures.length})` : `${STATUT[st].label} (${factures.filter(f => f.statut === st).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <DollarSign color={C.gray300} size={48} />
            <Text style={s.emptyText}>Aucune facture trouvée</Text>
          </View>
        }
        renderItem={({ item: f }) => {
          const a = getAffaire(f.affaireId);
          const cfg = STATUT[f.statut];
          const Icon = cfg.Icon;
          const reste = f.montant - f.montantPaye;
          const pct = f.montant > 0 ? Math.round((f.montantPaye / f.montant) * 100) : 0;
          const borderColor = f.statut === 'en_retard' ? C.red500 : f.statut === 'payee' ? C.green500 : f.statut === 'partielle' ? C.orange500 : C.gray200;

          return (
            <TouchableOpacity
              style={[s.card, { borderLeftColor: borderColor }]}
              onPress={() => setSelected(f)}
              activeOpacity={0.8}
            >
              <View style={s.cardTop}>
                <View>
                  <Text style={s.factNum}>{f.numero}</Text>
                  <Text style={s.factClient}>{a?.client.nom ?? '—'}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Icon color={cfg.text} size={10} />
                  <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>
              {a && <Text style={s.factAffaire} numberOfLines={1}>{a.intitule}</Text>}
              <View style={s.amountsRow}>
                <View>
                  <Text style={s.amtLabel}>Total</Text>
                  <Text style={s.amtVal}>{fmtM(f.montant)}</Text>
                </View>
                <View>
                  <Text style={s.amtLabel}>Encaissé</Text>
                  <Text style={[s.amtVal, { color: C.green600 }]}>{fmtM(f.montantPaye)}</Text>
                </View>
                {reste > 0 && (
                  <View>
                    <Text style={s.amtLabel}>Reste</Text>
                    <Text style={[s.amtVal, { color: C.red600 }]}>{fmtM(reste)}</Text>
                  </View>
                )}
              </View>
              <View style={s.progressBg}>
                <View style={[s.progressFill, {
                  width: `${pct}%` as any,
                  backgroundColor: pct >= 100 ? C.green500 : pct >= 50 ? C.amber500 : C.red500,
                }]} />
              </View>
              <View style={s.datesRow}>
                <Text style={s.dateText}>Émission : {fmtD(f.dateEmission)}</Text>
                <Text style={[s.dateText, f.statut === 'en_retard' && { color: C.red600, fontWeight: '600' }]}>
                  Échéance : {fmtD(f.dateEcheance)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Modal */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            {selected && (() => {
              const a = getAffaire(selected.affaireId);
              const cfg = STATUT[selected.statut];
              const enc = getEnc(selected.id);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.sheetTopRow}>
                    <View>
                      <Text style={s.sheetFactNum}>{selected.numero}</Text>
                      {a && <Text style={s.sheetClient}>{a.client.nom} — {a.intitule.slice(0, 35)}</Text>}
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <View style={s.amtBox}>
                    {[
                      { label: 'Montant total', val: fmtM(selected.montant), color: C.gray900 },
                      { label: 'Encaissé', val: fmtM(selected.montantPaye), color: C.green600 },
                      ...(selected.montant - selected.montantPaye > 0 ? [{ label: 'Reste à percevoir', val: fmtM(selected.montant - selected.montantPaye), color: C.red600 }] : []),
                    ].map((r, i) => (
                      <View key={i} style={[s.amtRow, i > 0 && { paddingTop: 10, borderTopWidth: 1, borderTopColor: C.gray200 }]}>
                        <Text style={s.amtLabelBig}>{r.label}</Text>
                        <Text style={[s.amtValBig, { color: r.color }]}>{r.val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.datesGrid}>
                    <View style={s.dateCard}>
                      <Text style={s.dateLabelSm}>Date émission</Text>
                      <Text style={s.dateValSm}>{fmtD(selected.dateEmission)}</Text>
                    </View>
                    <View style={[s.dateCard, selected.statut === 'en_retard' && { backgroundColor: C.red50 }]}>
                      <Text style={s.dateLabelSm}>Date échéance</Text>
                      <Text style={[s.dateValSm, selected.statut === 'en_retard' && { color: C.red700 }]}>{fmtD(selected.dateEcheance)}</Text>
                    </View>
                  </View>
                  {enc.length > 0 && (
                    <View style={s.encSection}>
                      <Text style={s.encTitle}>Historique des paiements</Text>
                      {enc.map(e => (
                        <View key={e.id} style={s.encRow}>
                          <View>
                            <Text style={s.encDate}>{fmtD(e.date)}</Text>
                            <Text style={s.encMode}>{e.modePaiement} • {e.reference}</Text>
                          </View>
                          <Text style={s.encMontant}>{fmtM(e.montant)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {selected.statut !== 'payee' && (
                      <TouchableOpacity style={s.primaryBtn} onPress={() => { Alert.alert('Paiement enregistré'); setSelected(null); }} activeOpacity={0.85}>
                        <Text style={s.primaryBtnText}>Enregistrer un paiement</Text>
                      </TouchableOpacity>
                    )}
                    {a && (
                      <TouchableOpacity style={s.secondaryBtn} onPress={() => { setSelected(null); router.push({ pathname: '/affaire/[id]', params: { id: a.id } }); }} activeOpacity={0.8}>
                        <Text style={s.secondaryBtnText}>Voir l'affaire</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)} activeOpacity={0.8}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  addBtn: { width: 40, height: 40, backgroundColor: C.amber500, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  kpiCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10 },
  kpiLabel: { fontSize: 11, color: C.gray400, marginBottom: 4 },
  kpiVal: { fontSize: 18, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.red50, borderWidth: 1, borderColor: C.red100, borderRadius: 14, margin: 12, marginTop: 8, padding: 14 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#7f1d1d', marginBottom: 4 },
  alertItem: { fontSize: 12, color: C.red700, marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, marginHorizontal: 12, paddingHorizontal: 12, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  filtersContent: { paddingHorizontal: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  filterTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, borderLeftWidth: 4, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  factNum: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  factClient: { fontSize: 12, color: C.gray500, marginTop: 2 },
  factAffaire: { fontSize: 12, color: C.gray600, marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  amtLabel: { fontSize: 11, color: C.gray500 },
  amtVal: { fontSize: 13, fontWeight: '700', color: C.gray900, marginTop: 2 },
  progressBg: { height: 6, backgroundColor: C.gray100, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { fontSize: 11, color: C.gray400 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', padding: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sheetFactNum: { fontSize: 20, fontWeight: '700', color: C.gray900 },
  sheetClient: { fontSize: 13, color: C.gray600, marginTop: 4, maxWidth: 220 },
  amtBox: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, marginBottom: 14, gap: 8 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtLabelBig: { fontSize: 14, color: C.gray600 },
  amtValBig: { fontSize: 16, fontWeight: '700' },
  datesGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dateCard: { flex: 1, backgroundColor: C.blue50, borderRadius: 12, padding: 12 },
  dateLabelSm: { fontSize: 11, color: C.gray500, marginBottom: 4 },
  dateValSm: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  encSection: { marginBottom: 14 },
  encTitle: { fontSize: 15, fontWeight: '600', color: C.gray900, marginBottom: 10 },
  encRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.green50, borderRadius: 10, padding: 10, marginBottom: 6 },
  encDate: { fontSize: 13, fontWeight: '500', color: C.gray900 },
  encMode: { fontSize: 11, color: C.gray500, marginTop: 2 },
  encMontant: { fontSize: 14, fontWeight: '700', color: C.green600 },
  primaryBtn: { backgroundColor: C.amber500, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  secondaryBtn: { backgroundColor: C.gray100, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '500', color: C.gray700 },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: C.gray500 },
});
