/**
 * src/app/(tabs)/facturation.tsx
 * Écran de gestion de la facturation et des encaissements.
 * Inclus : Création de facture, suivi des retards, encaissements, envoi et téléchargement.
 */

import { AppColors as C } from '@/constants/theme';
import { useDossiers } from '@/hooks/useDossiers';
import { useFactures } from '@/hooks/useFactures';
import { extractErrorMessage } from '@/lib/api';
import {
  Facture, FactureStatut, getSoldeRestant, getTauxRecouvrement,
} from '@/services/facturation.service';
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

  // Modal Nouvelle Facture
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [factDossierId, setFactDossierId]     = useState<number | undefined>(undefined);
  const [factMontantHt, setFactMontantHt]     = useState('');
  const [factTva, setFactTva]                 = useState('19.25');
  const [factEcheance, setFactEcheance]       = useState('');
  const [factDesc, setFactDesc]               = useState('');
  const [creatingFact, setCreatingFact]       = useState(false);

  // Modal Encaissement
  const [encAmount, setEncAmount] = useState('');
  const [encMode, setEncMode]     = useState('virement');
  const [encRef, setEncRef]       = useState('');
  const [encaisseLoading, setEncaisseLoading] = useState(false);

  const {
    factures, isLoading, error, total,
    totalFacture, totalEncaisse, totalImpaye, tauxRecouvrement,
    refetch, create, envoyer, encaisser,
  } = useFactures({ statut: statut !== 'all' ? statut : undefined });

  const { dossiers } = useDossiers({ pageSize: 50 });

  const facturesRetard = factures.filter(f => f.statut === 'en_retard');

  const filtered = search.trim()
    ? factures.filter(f =>
        f.numeroFacture.toLowerCase().includes(search.toLowerCase()) ||
        (f.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : factures;

  const countByStatut = useCallback((s: FactureStatut) =>
    factures.filter(f => f.statut === s).length, [factures]);

  // Handlers Création Facture
  const handleOpenCreateModal = () => {
    if (dossiers.length > 0) setFactDossierId(Number(dossiers[0].id));
    setFactMontantHt('');
    setFactTva('19.25');
    const defaultEch = new Date();
    defaultEch.setDate(defaultEch.getDate() + 30);
    setFactEcheance(defaultEch.toISOString().slice(0, 10));
    setFactDesc('');
    setShowCreateModal(true);
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
      await create({
        dossierId: Number(dossierSelected.id),
        clientId: Number(dossierSelected.clientId),
        montantHt: Number(factMontantHt),
        tauxTva: Number(factTva) || 19.25,
        dateEcheance: factEcheance || undefined,
        description: factDesc.trim() || undefined,
      });

      setShowCreateModal(false);
      refetch();
      Alert.alert('Succès', 'Facture créée avec succès.');
    } catch (e) {
      Alert.alert('Erreur', extractErrorMessage(e));
    } finally {
      setCreatingFact(false);
    }
  };

  // Handlers Envoi & Encaissement
  const handleEnvoyer = async (f: Facture) => {
    try {
      await envoyer(f.id);
      setSelected(null);
      Alert.alert('Succès', `La facture ${f.numeroFacture} a été marquée comme envoyée.`);
    } catch (e) {
      Alert.alert('Erreur', extractErrorMessage(e));
    }
  };

  const handleEncaisser = async (f: Facture) => {
    const amt = Number(encAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Erreur', 'Saisissez un montant valide.');
      return;
    }
    setEncaisseLoading(true);
    try {
      await encaisser(f.id, { montant: amt, modePaiement: encMode, reference: encRef || undefined });
      setSelected(null);
      setEncAmount(''); setEncRef('');
      Alert.alert('Succès', 'Encaissement enregistré avec succès.');
    } catch (e) {
      Alert.alert('Erreur', extractErrorMessage(e));
    } finally {
      setEncaisseLoading(false);
    }
  };

  const renderItem = useCallback(({ item: f }: { item: Facture }) => {
    const cfg   = STATUT_CFG[f.statut];
    const Icon  = cfg.Icon;
    const reste = getSoldeRestant(f);
    const pct   = getTauxRecouvrement(f);
    const borderColor =
      f.statut === 'en_retard' ? C.red500 :
      f.statut === 'payee'     ? C.green500 :
      f.statut === 'partielle' ? C.amber500 : C.gray200;

    return (
      <TouchableOpacity
        style={[s.card, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}
        onPress={() => { setSelected(f); setEncAmount(String(reste)); }}
        activeOpacity={0.85}
      >
        <View style={s.cardHeader}>
          <Text style={s.numFact}>{f.numeroFacture}</Text>
          <View style={[s.badge, { backgroundColor: cfg.bg }]}>
            <Icon color={cfg.text} size={11} />
            <Text style={[s.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {f.description ? <Text style={s.descText} numberOfLines={1}>{f.description}</Text> : null}

        <View style={s.amountsRow}>
          <View>
            <Text style={s.amtLabel}>Montant TTC</Text>
            <Text style={s.amtTtc}>{fmtM(Number(f.montantTtc))}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.amtLabel}>Reste dû</Text>
            <Text style={[s.amtReste, reste > 0 ? { color: C.red600 } : { color: C.green600 }]}>
              {fmtM(reste)}
            </Text>
          </View>
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
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.navy900 }}>
        {/* Header Executive */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Facturation</Text>
            <Text style={s.sub}>
              {isLoading ? 'Chargement…' : `${total} facture${total !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={handleOpenCreateModal} activeOpacity={0.8}>
            <Plus color={C.gray900} size={18} />
            <Text style={s.addBtnText}>Nouvelle Facture</Text>
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
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search color={C.gray400} size={16} />
          <TextInput
            style={s.searchInput}
            placeholder="Numéro ou description..."
            placeholderTextColor={C.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTER_ORDER.map(st => {
          const active = statut === st;
          const count  = st === 'all' ? total : countByStatut(st);
          const label  = st === 'all' ? 'Toutes' : STATUT_CFG[st].label;
          return (
            <TouchableOpacity
              key={st}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setStatut(st)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.amber500} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.center}><ActivityIndicator color={C.amber500} size="large" /></View>
          ) : (
            <View style={s.center}>
              <DollarSign color={C.gray400} size={44} />
              <Text style={s.emptyText}>Aucune facture trouvée</Text>
            </View>
          )
        }
      />

      {/* ── MODAL NOUVELLE FACTURE ── */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCreateModal(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Nouvelle Facture d'Honoraires</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Dossier */}
              <View style={{ marginBottom: 12 }}>
                <Text style={s.fieldLabel}>Dossier / Affaire concernée *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {dossiers.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => setFactDossierId(Number(d.id))}
                      style={[s.dossierChip, Number(factDossierId) === Number(d.id) && s.dossierChipActive]}
                    >
                      <Text style={[s.dossierChipText, Number(factDossierId) === Number(d.id) && s.dossierChipTextActive]}>
                        {d.numeroAffaire} — {d.titre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Montant HT & TVA */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <Text style={s.fieldLabel}>Montant Hors Taxe (FCFA) *</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={factMontantHt}
                    onChangeText={setFactMontantHt}
                    keyboardType="numeric"
                    placeholder="ex: 500000"
                    placeholderTextColor={C.gray400}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>TVA (%)</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={factTva}
                    onChangeText={setFactTva}
                    keyboardType="numeric"
                    placeholder="19.25"
                    placeholderTextColor={C.gray400}
                  />
                </View>
              </View>

              {/* Calcul TTC aperçu */}
              {factMontantHt && !isNaN(Number(factMontantHt)) ? (
                <View style={s.calcSummaryBox}>
                  <Text style={s.calcSummaryText}>
                    Montant TTC estimé : <Text style={{ fontWeight: '800', color: C.amber900 }}>{fmtM(Number(factMontantHt) * (1 + (Number(factTva) || 19.25) / 100))}</Text>
                  </Text>
                </View>
              ) : null}

              {/* Échéance */}
              <View style={{ marginBottom: 12 }}>
                <Text style={s.fieldLabel}>Date d'échéance (YYYY-MM-DD)</Text>
                <TextInput
                  style={s.fieldInput}
                  value={factEcheance}
                  onChangeText={setFactEcheance}
                  placeholder="2026-10-15"
                  placeholderTextColor={C.gray400}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 12 }}>
                <Text style={s.fieldLabel}>Description des prestations</Text>
                <TextInput
                  style={[s.fieldInput, { height: 75, textAlignVertical: 'top' }]}
                  value={factDesc}
                  onChangeText={setFactDesc}
                  multiline
                  numberOfLines={3}
                  placeholder="ex: Honoraires de diligence, Rédaction conclusions..."
                  placeholderTextColor={C.gray400}
                />
              </View>

              <TouchableOpacity
                style={[s.saveBtn, creatingFact && { opacity: 0.6 }]}
                onPress={handleCreateFacture}
                disabled={creatingFact}
                activeOpacity={0.85}
              >
                {creatingFact ? <ActivityIndicator color={C.gray900} /> : <Text style={s.saveBtnText}>Créer la facture</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreateModal(false)} activeOpacity={0.8}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL DÉTAILS / ENCAISSEMENT ── */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
            <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
              <View style={s.handle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <View>
                  <Text style={s.sheetTitle}>{selected.numeroFacture}</Text>
                  <Text style={s.sheetSub}>Dossier #{selected.dossierId}</Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
                  <X color={C.gray600} size={18} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.sheetAmtCard}>
                  <View style={s.sheetAmtRow}>
                    <Text style={s.sheetAmtLabel}>Montant HT :</Text>
                    <Text style={s.sheetAmtVal}>{fmtM(Number(selected.montantHt))}</Text>
                  </View>
                  <View style={s.sheetAmtRow}>
                    <Text style={s.sheetAmtLabel}>TVA ({selected.tauxTva}%) :</Text>
                    <Text style={s.sheetAmtVal}>{fmtM(Number(selected.montantTtc) - Number(selected.montantHt))}</Text>
                  </View>
                  <View style={[s.sheetAmtRow, { borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: 6, marginTop: 4 }]}>
                    <Text style={[s.sheetAmtLabel, { fontWeight: '700', color: C.gray900 }]}>Total TTC :</Text>
                    <Text style={[s.sheetAmtVal, { fontWeight: '700', color: C.gray900 }]}>{fmtM(Number(selected.montantTtc))}</Text>
                  </View>
                  <View style={s.sheetAmtRow}>
                    <Text style={s.sheetAmtLabel}>Encaissé :</Text>
                    <Text style={[s.sheetAmtVal, { color: C.green600 }]}>{fmtM(Number(selected.montantEncaisse))}</Text>
                  </View>
                  <View style={s.sheetAmtRow}>
                    <Text style={[s.sheetAmtLabel, { fontWeight: '700' }]}>Reste dû :</Text>
                    <Text style={[s.sheetAmtVal, { fontWeight: '700', color: getSoldeRestant(selected) > 0 ? C.red600 : C.green600 }]}>
                      {fmtM(getSoldeRestant(selected))}
                    </Text>
                  </View>
                </View>

                {selected.statut === 'brouillon' && (
                  <TouchableOpacity style={s.envoyerBtn} onPress={() => handleEnvoyer(selected)}>
                    <Send color={C.white} size={16} />
                    <Text style={s.envoyerBtnText}>Marquer comme envoyée</Text>
                  </TouchableOpacity>
                )}

                {getSoldeRestant(selected) > 0 && (
                  <View style={s.encSection}>
                    <Text style={s.encTitle}>Enregistrer un encaissement</Text>
                    <TextInput
                      style={s.fieldInput}
                      placeholder="Montant (FCFA)"
                      keyboardType="numeric"
                      value={encAmount}
                      onChangeText={setEncAmount}
                    />
                    <View style={s.modesRow}>
                      {['virement', 'especes', 'cheque', 'mobile_money'].map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[s.modeChip, encMode === m && s.modeChipActive]}
                          onPress={() => setEncMode(m)}
                        >
                          <Text style={[s.modeText, encMode === m && s.modeTextActive]}>
                            {m === 'especes' ? 'Espèces' : m === 'mobile_money' ? 'MoMo' : m.charAt(0).toUpperCase() + m.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={[s.fieldInput, { marginTop: 8 }]}
                      placeholder="Référence paiement (optionnel)"
                      value={encRef}
                      onChangeText={setEncRef}
                    />
                    <TouchableOpacity
                      style={[s.saveBtn, encaisseLoading && { opacity: 0.6 }]}
                      onPress={() => handleEncaisser(selected)}
                      disabled={encaisseLoading}
                    >
                      {encaisseLoading ? <ActivityIndicator color={C.gray900} /> : <Text style={s.saveBtnText}>Valider le paiement</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: C.navy900,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.white },
  sub: { fontSize: 12, color: C.amber400, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.amber500, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  kpiGrid: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14, gap: 6, backgroundColor: C.navy900 },
  kpiCard: { flex: 1, backgroundColor: C.navy800, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: C.navy700 },
  kpiLabel: { fontSize: 9, color: C.gray400, marginBottom: 2 },
  kpiVal: { fontSize: 13, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, padding: 12,
    backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red700 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.red100, borderRadius: 8 },
  retryText: { fontSize: 12, color: C.red700, fontWeight: '600' },
  alertCard: {
    flexDirection: 'row', alignItems: 'flex-start', margin: 12, padding: 12,
    backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: C.red700, marginBottom: 4 },
  alertItem: { fontSize: 12, color: C.red600, marginTop: 2 },
  searchRow: { paddingHorizontal: 14, paddingTop: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: C.gray200,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.gray900, padding: 0 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  filterChipActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  filterText: { fontSize: 12, color: C.gray600, fontWeight: '500' },
  filterTextActive: { color: C.gray900, fontWeight: '700' },
  list: { padding: 14, paddingBottom: 60, gap: 10 },
  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 14, gap: 8,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    borderWidth: 1, borderColor: C.gray200,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numFact: { fontSize: 14, fontWeight: '700', color: C.gray900 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  descText: { fontSize: 12, color: C.gray500 },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtLabel: { fontSize: 11, color: C.gray400 },
  amtTtc: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  amtReste: { fontSize: 15, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: C.gray100, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  dateText: { fontSize: 11, color: C.gray400 },
  center: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: C.gray500 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.gray900 },
  sheetSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
  closeBtn: { padding: 6, backgroundColor: C.gray100, borderRadius: 12 },
  dossierChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  dossierChipActive: { backgroundColor: C.amber100, borderColor: C.amber400 },
  dossierChipText: { fontSize: 12, color: C.gray700 },
  dossierChipTextActive: { color: C.amber900, fontWeight: '700' },
  calcSummaryBox: { backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 10, padding: 10, marginBottom: 12 },
  calcSummaryText: { fontSize: 13, color: C.amber900 },
  sheetAmtCard: { backgroundColor: C.gray50, borderRadius: 12, padding: 12, gap: 6, marginBottom: 16 },
  sheetAmtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sheetAmtLabel: { fontSize: 13, color: C.gray500 },
  sheetAmtVal: { fontSize: 13, color: C.gray900, fontWeight: '500' },
  envoyerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.blue600, borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  envoyerBtnText: { fontSize: 14, fontWeight: '600', color: C.white },
  encSection: { gap: 10 },
  encTitle: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.gray900 },
  modesRow: { flexDirection: 'row', gap: 6 },
  modeChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: C.gray100 },
  modeChipActive: { backgroundColor: C.amber500 },
  modeText: { fontSize: 11, color: C.gray600, fontWeight: '500' },
  modeTextActive: { color: C.gray900, fontWeight: '700' },
  saveBtn: { backgroundColor: C.amber500, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  cancelBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
});
