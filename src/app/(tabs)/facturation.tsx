import { AppColors as C } from '@/constants/theme';
import { useFactures } from '@/hooks/useFactures';
import { Facture, FactureStatut, getSoldeRestant, getTauxRecouvrement } from '@/services/facturation.service';
import { useRouter } from 'expo-router';
import {
    AlertTriangle, CheckCircle, Clock,
    DollarSign, FileText, Plus, Search, Send, X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    RefreshControl, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUT_CFG: Record<FactureStatut, { label: string; bg: string; text: string; Icon: any }> = {
  brouillon: { label: 'Brouillon',        bg: C.gray100,   text: C.gray600,   Icon: FileText },
  envoyee:   { label: 'Envoyée',          bg: C.blue100,   text: C.blue700,   Icon: Send },
  partielle: { label: 'Paiement partiel', bg: C.orange100, text: C.orange700, Icon: Clock },
  payee:     { label: 'Payée',            bg: C.green100,  text: C.green700,  Icon: CheckCircle },
  en_retard: { label: 'En retard',        bg: C.red100,    text: C.red700,    Icon: AlertTriangle },
};
const FILTER_ORDER: (FactureStatut | 'all')[] = ['all', 'en_retard', 'partielle', 'envoyee', 'payee', 'brouillon'];

const fmtM = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
const fmtD = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

export default function FacturationScreen() {
  const router = useRouter();
  const [search, setSearch]   = useState('');
  const [statut, setStatut]   = useState<FactureStatut | 'all'>('all');
  const [selected, setSelected] = useState<Facture | null>(null);

  const {
    factures, isLoading, error, total,
    totalFacture, totalEncaisse, totalImpaye, tauxRecouvrement,
    refetch, envoyer, encaisser,
  } = useFactures({ statut: statut !== 'all' ? statut : undefined });

  const facturesRetard = factures.filter(f => f.statut === 'en_retard');

  const filtered = search.trim()
    ? factures.filter(f =>
        f.numeroFacture.toLowerCase().includes(search.toLowerCase()) ||
        (f.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : factures;

  const countByStatut = useCallback((s: FactureStatut) =>
    factures.filter(f => f.statut === s).length, [factures]);

  const renderItem = useCallback(({ item: f }: { item: Facture }) => {
    const cfg   = STATUT_CFG[f.statut];
    const Icon  = cfg.Icon;
    const reste = getSoldeRestant(f);
    const pct   = getTauxRecouvrement(f);
    const borderColor =
      f.statut === 'en_retard' ? C.red500 :
      f.statut === 'payee'     ? C.green500 :
      f.statut === 'partielle' ? C.orange500 : C.gray200;

    return (
      <TouchableOpacity
        style={[s.card, { borderLeftColor: borderColor }]}
        onPress={() => setSelected(f)}
        activeOpacity={0.8}
      >
        <View style={s.cardTop}>
          <View>
            <Text style={s.factNum}>{f.numeroFacture}</Text>
            <Text style={s.factMeta}>Dossier #{f.dossierId} • Client #{f.clientId}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Icon color={cfg.text} size={10} />
            <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {f.description && (
          <Text style={s.factDesc} numberOfLines={1}>{f.description}</Text>
        )}

        <View style={s.amountsRow}>
          <View>
            <Text style={s.amtLabel}>Total TTC</Text>
            <Text style={s.amtVal}>{fmtM(Number(f.montantTtc))}</Text>
          </View>
          <View>
            <Text style={s.amtLabel}>Encaissé</Text>
            <Text style={[s.amtVal, { color: C.green600 }]}>{fmtM(Number(f.montantEncaisse))}</Text>
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
          {f.dateEcheance && (
            <Text style={[s.dateText, f.statut === 'en_retard' && { color: C.red600, fontWeight: '600' }]}>
              Échéance : {fmtD(f.dateEcheance)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Facturation</Text>
            <Text style={s.sub}>
              {isLoading ? 'Chargement…' : `${total} facture${total !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={s.kpiGrid}>
          {[
            { label: 'Total facturé',     val: totalFacture  > 0 ? `${(totalFacture  / 1_000_000).toFixed(1)}M` : '0',  color: C.white },
            { label: 'Total encaissé',    val: totalEncaisse > 0 ? `${(totalEncaisse / 1_000_000).toFixed(1)}M` : '0',  color: '#86efac' },
            { label: 'Impayé',            val: totalImpaye   > 0 ? `${(totalImpaye   / 1_000_000).toFixed(1)}M` : '0',  color: '#fca5a5' },
            { label: 'Taux recouvrement', val: `${tauxRecouvrement}%`,
              color: tauxRecouvrement >= 75 ? '#86efac' : tauxRecouvrement >= 50 ? C.amber400 : '#fca5a5' },
          ].map(k => (
            <View key={k.label} style={s.kpiCard}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiVal, { color: k.color }]}>{k.val}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Erreur */}
      {error && !isLoading && (
        <View style={s.errorBanner}>
          <AlertTriangle color={C.red500} size={16} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={s.retryBtn}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Alert retard */}
      {facturesRetard.length > 0 && (
        <View style={s.alertCard}>
          <AlertTriangle color={C.red600} size={20} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.alertTitle}>{facturesRetard.length} facture(s) en retard</Text>
            {facturesRetard.slice(0, 2).map(f => (
              <Text key={f.id} style={s.alertItem}>
                • {f.numeroFacture} : {fmtM(getSoldeRestant(f))} impayé
              </Text>
            ))}
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
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}><X color={C.gray400} size={16} /></TouchableOpacity>
        )}
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
              {st === 'all'
                ? `Toutes (${total})`
                : `${STATUT_CFG[st].label} (${countByStatut(st)})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading && factures.length > 0} onRefresh={refetch} tintColor={C.amber500} />
        }
        ListEmptyComponent={
          isLoading
            ? <View style={s.center}><ActivityIndicator color={C.amber500} size="large" /></View>
            : <View style={s.center}><DollarSign color={C.gray300} size={48} /><Text style={s.emptyText}>Aucune facture</Text></View>
        }
        renderItem={renderItem}
      />

      {/* Detail Modal */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            {selected && (() => {
              const cfg   = STATUT_CFG[selected.statut];
              const reste = getSoldeRestant(selected);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={s.sheetTopRow}>
                    <View>
                      <Text style={s.sheetFactNum}>{selected.numeroFacture}</Text>
                      <Text style={s.sheetMeta}>Dossier #{selected.dossierId}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  <View style={s.amtBox}>
                    {[
                      { label: 'Montant HT',      val: fmtM(Number(selected.montantHt)),      color: C.gray900 },
                      { label: 'TVA',              val: `${selected.tauxTva}%`,                color: C.gray600 },
                      { label: 'Montant TTC',      val: fmtM(Number(selected.montantTtc)),     color: C.gray900 },
                      { label: 'Encaissé',         val: fmtM(Number(selected.montantEncaisse)), color: C.green600 },
                      ...(reste > 0 ? [{ label: 'Reste à percevoir', val: fmtM(reste), color: C.red600 }] : []),
                    ].map((r, i) => (
                      <View key={i} style={[s.amtRow, i > 0 && { paddingTop: 8, borderTopWidth: 1, borderTopColor: C.gray200 }]}>
                        <Text style={s.amtLabelBig}>{r.label}</Text>
                        <Text style={[s.amtValBig, { color: r.color }]}>{r.val}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.datesGrid}>
                    <View style={s.dateCard}>
                      <Text style={s.dateLabelSm}>Émission</Text>
                      <Text style={s.dateValSm}>{fmtD(selected.dateEmission)}</Text>
                    </View>
                    {selected.dateEcheance && (
                      <View style={[s.dateCard, selected.statut === 'en_retard' && { backgroundColor: C.red50 }]}>
                        <Text style={s.dateLabelSm}>Échéance</Text>
                        <Text style={[s.dateValSm, selected.statut === 'en_retard' && { color: C.red700 }]}>
                          {fmtD(selected.dateEcheance)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {selected.description && (
                    <View style={s.descBox}>
                      <Text style={s.descText}>{selected.description}</Text>
                    </View>
                  )}

                  <View style={{ gap: 10, marginTop: 8 }}>
                    {selected.statut === 'brouillon' && (
                      <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={async () => {
                          try {
                            await envoyer(selected.id);
                            setSelected(null);
                          } catch {
                            Alert.alert('Erreur', 'Impossible d\'envoyer la facture');
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={s.primaryBtnText}>Envoyer la facture</Text>
                      </TouchableOpacity>
                    )}
                    {['envoyee', 'partielle', 'en_retard'].includes(selected.statut) && (
                      <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => {
                          Alert.prompt(
                            'Enregistrer un paiement',
                            'Montant (FCFA)',
                            async (text) => {
                              const montant = parseFloat(text ?? '0');
                              if (!montant || montant <= 0) return;
                              try {
                                await encaisser(selected.id, { montant });
                                setSelected(null);
                              } catch {
                                Alert.alert('Erreur', 'Impossible d\'enregistrer le paiement');
                              }
                            },
                            'plain-text',
                            '',
                            'numeric',
                          );
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={s.primaryBtnText}>Enregistrer un paiement</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={s.secondaryBtn}
                      onPress={() => {
                        setSelected(null);
                        router.push({ pathname: '/affaire/[id]', params: { id: selected.dossierId } });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.secondaryBtnText}>Voir le dossier</Text>
                    </TouchableOpacity>
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 12, backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red700 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.red100, borderRadius: 8 },
  retryText: { fontSize: 12, color: C.red700, fontWeight: '600' },
  alertCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.red50, borderWidth: 1, borderColor: C.red100,
    borderRadius: 14, margin: 12, marginTop: 8, padding: 14,
  },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#7f1d1d', marginBottom: 4 },
  alertItem: { fontSize: 12, color: C.red700, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, marginHorizontal: 12, paddingHorizontal: 12,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  filtersContent: { paddingHorizontal: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  filterBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  filterTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  center: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 14, borderLeftWidth: 4,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  factNum: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  factMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  factDesc: { fontSize: 12, color: C.gray600, marginBottom: 10 },
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
  sheetMeta: { fontSize: 13, color: C.gray600, marginTop: 4 },
  amtBox: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, marginBottom: 14, gap: 8 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtLabelBig: { fontSize: 14, color: C.gray600 },
  amtValBig: { fontSize: 16, fontWeight: '700' },
  datesGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dateCard: { flex: 1, backgroundColor: C.blue50, borderRadius: 12, padding: 12 },
  dateLabelSm: { fontSize: 11, color: C.gray500, marginBottom: 4 },
  dateValSm: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  descBox: { backgroundColor: C.gray50, borderRadius: 10, padding: 10, marginBottom: 14 },
  descText: { fontSize: 13, color: C.gray700 },
  primaryBtn: { backgroundColor: C.amber500, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  secondaryBtn: { backgroundColor: C.gray100, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '500', color: C.gray700 },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: C.gray500 },
});
