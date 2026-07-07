import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Search, Plus, Filter, Download, Eye, Lock,
  Globe, ShieldAlert, Camera, Paperclip, WifiOff, ChevronDown, X,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { documents, documentsSupplementaires, affaires, type Document } from '@/data/mockData';

const allDocs: Document[] = [...documents, ...documentsSupplementaires];

const TYPES = ['Tous', 'Assignation', 'Contrat', 'Conclusions', 'Correspondance', 'Rapport', 'PV', 'Plainte', 'Déposition', 'Titre foncier', 'Pièce justificative'];

const CONF_CONFIG: Record<string, { label: string; bg: string; text: string; Icon: any }> = {
  public:       { label: 'Public',        bg: C.green100,  text: C.green700,  Icon: Globe },
  confidentiel: { label: 'Confidentiel',  bg: C.orange100, text: C.orange700, Icon: Lock },
  secret:       { label: 'Secret',        bg: C.red100,    text: C.red700,    Icon: ShieldAlert },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Assignation:  { bg: C.red50,    text: C.red600 },
  Contrat:      { bg: C.blue50,   text: C.blue600 },
  Conclusions:  { bg: C.purple50, text: C.purple600 },
  Rapport:      { bg: C.indigo50, text: C.indigo600 },
  default:      { bg: C.blue50,   text: C.blue600 },
};

export default function DocumentsScreen() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedAffaireId, setSelectedAffaireId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const pending = allDocs.filter(d => d.syncStatus === 'pending').length;

  const filtered = allDocs.filter(doc => {
    const q = search.toLowerCase();
    return (doc.nom.toLowerCase().includes(q) || doc.type.toLowerCase().includes(q))
      && (selectedType === 'Tous' || doc.type === selectedType)
      && (!selectedAffaireId || doc.affaireId === selectedAffaireId);
  });

  const affaireLabel = (id: string) => {
    const a = affaires.find(a => a.id === id);
    return a ? `${a.numero} — ${a.intitule.slice(0, 28)}${a.intitule.length > 28 ? '…' : ''}` : id;
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Documents</Text>
            <Text style={s.sub}>Gestion électronique des dossiers</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowUpload(true)} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { val: allDocs.length, label: 'Total', color: C.white },
            { val: pending, label: 'En attente', color: C.amber400 },
            { val: allDocs.filter(d => d.confidentialite === 'secret').length, label: 'Secrets', color: '#fca5a5' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Offline banner */}
      {pending > 0 && (
        <View style={s.offlineBanner}>
          <WifiOff color={C.amber600} size={16} />
          <Text style={s.offlineText}><Text style={{ fontWeight: '700' }}>{pending} document(s)</Text> en attente de synchronisation.</Text>
          <TouchableOpacity><Text style={s.syncBtn}>Sync</Text></TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <Search color={C.gray400} size={18} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un document..."
          placeholderTextColor={C.gray400}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}><X color={C.gray400} size={16} /></TouchableOpacity>
        )}
      </View>

      {/* Filter toggle */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={s.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.8}
        >
          <Filter color={C.gray700} size={15} />
          <Text style={s.filterToggleText}>Filtres</Text>
          <ChevronDown
            color={C.gray500}
            size={13}
            style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
          />
          {(selectedType !== 'Tous' || selectedAffaireId !== '') && (
            <View style={s.filterCount}>
              <Text style={s.filterCountText}>
                {(selectedType !== 'Tous' ? 1 : 0) + (selectedAffaireId ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={s.filtersPanel}>
          <Text style={s.filterSection}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedType(t)}
                style={[s.typeBtn, selectedType === t && s.typeBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, selectedType === t && s.typeBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.filterSection}>Affaire</Text>
          <ScrollView style={{ maxHeight: 100 }} showsVerticalScrollIndicator>
            {[{ id: '', label: 'Toutes les affaires' }, ...affaires.map(a => ({ id: a.id, label: `${a.numero} — ${a.intitule.slice(0, 35)}` }))].map(({ id, label }) => (
              <TouchableOpacity key={id} onPress={() => setSelectedAffaireId(id)} style={s.affaireRow} activeOpacity={0.8}>
                <View style={[s.radio, selectedAffaireId === id && s.radioActive]} />
                <Text style={s.affaireLabel} numberOfLines={1}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {(selectedType !== 'Tous' || selectedAffaireId) && (
            <TouchableOpacity onPress={() => { setSelectedType('Tous'); setSelectedAffaireId(''); }}>
              <Text style={s.clearFilters}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Result count */}
      <Text style={s.resultCount}>
        <Text style={{ fontWeight: '700', color: C.gray900 }}>{filtered.length}</Text> document(s) trouvé(s)
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <FileText color={C.gray300} size={48} />
            <Text style={s.emptyTitle}>Aucun document trouvé</Text>
            <Text style={s.emptyDesc}>Modifiez vos filtres ou ajoutez un document.</Text>
          </View>
        }
        renderItem={({ item: doc }) => {
          const conf = CONF_CONFIG[doc.confidentialite];
          const ConfIcon = conf.Icon;
          const typeColors = TYPE_COLORS[doc.type] ?? TYPE_COLORS.default;

          return (
            <View style={s.card}>
              <View style={[s.docIcon, { backgroundColor: typeColors.bg }]}>
                <FileText color={typeColors.text} size={22} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.docName} numberOfLines={1}>{doc.nom}</Text>
                <Text style={s.docMeta}>{doc.type} • {doc.taille}</Text>
                <Text style={s.docSub} numberOfLines={1}>
                  {affaireLabel(doc.affaireId)} •{' '}
                  {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(doc.dateAjout))}
                </Text>
                <View style={s.badgesRow}>
                  <View style={[s.confBadge, { backgroundColor: conf.bg }]}>
                    <ConfIcon color={conf.text} size={10} />
                    <Text style={[s.confText, { color: conf.text }]}>{conf.label}</Text>
                  </View>
                  {doc.syncStatus === 'pending' && (
                    <View style={s.syncBadge}>
                      <WifiOff color={C.amber700} size={10} />
                      <Text style={s.syncBadgeText}>Non syncronisé</Text>
                    </View>
                  )}
                  {doc.syncStatus === 'synced' && (
                    <View style={s.syncedBadge}>
                      <Text style={s.syncedText}>✓ Sync</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Aperçu', doc.nom)} activeOpacity={0.8}>
                  <Eye color={C.gray600} size={16} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Téléchargement', doc.nom)} activeOpacity={0.8}>
                  <Download color={C.gray600} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Upload Modal */}
      <Modal visible={showUpload} transparent animationType="slide" onRequestClose={() => setShowUpload(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowUpload(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Ajouter un document</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {[
                { Icon: Camera, label: 'Prendre une photo', sub: 'Numériser un document physique', bg: C.blue100, color: C.blue600 },
                { Icon: Paperclip, label: 'Choisir un fichier', sub: 'PDF, Word, image…', bg: C.green100, color: C.green600 },
              ].map(({ Icon, label, sub, bg, color }) => (
                <TouchableOpacity
                  key={label}
                  style={s.uploadOption}
                  onPress={() => { Alert.alert(label); setShowUpload(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.uploadIconWrap, { backgroundColor: bg }]}>
                    <Icon color={color} size={20} />
                  </View>
                  <View>
                    <Text style={s.uploadLabel}>{label}</Text>
                    <Text style={s.uploadSub}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowUpload(false)} activeOpacity={0.8}>
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
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
  sub: { fontSize: 13, color: C.amber400, marginTop: 2 },
  addBtn: { width: 40, height: 40, backgroundColor: C.amber500, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.gray400, marginTop: 2 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 12, marginHorizontal: 12, marginTop: 8, padding: 12 },
  offlineText: { flex: 1, fontSize: 12, color: '#92400e' },
  syncBtn: { fontSize: 12, fontWeight: '600', color: C.amber700, textDecorationLine: 'underline' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  filterRow: { paddingHorizontal: 12, marginTop: 8 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  filterToggleText: { fontSize: 13, fontWeight: '500', color: C.gray700 },
  filterCount: { backgroundColor: C.amber500, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: C.gray900 },
  filtersPanel: { backgroundColor: C.white, borderRadius: 14, marginHorizontal: 12, marginTop: 8, padding: 14, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  filterSection: { fontSize: 11, fontWeight: '700', color: C.gray500, textTransform: 'uppercase', marginBottom: 8 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  typeBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  typeBtnText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  typeBtnTextActive: { color: C.gray900 },
  affaireRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.gray300 },
  radioActive: { borderColor: C.amber500, backgroundColor: C.amber500 },
  affaireLabel: { fontSize: 13, color: C.gray700, flex: 1 },
  clearFilters: { fontSize: 13, color: C.red600, fontWeight: '500', marginTop: 8 },
  resultCount: { fontSize: 13, color: C.gray500, paddingHorizontal: 14, marginTop: 8, marginBottom: 2 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: C.gray500 },
  emptyDesc: { fontSize: 13, color: C.gray400 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  docIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  docMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  docSub: { fontSize: 11, color: C.gray400, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  confText: { fontSize: 11, fontWeight: '500' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amber100, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  syncBadgeText: { fontSize: 11, color: C.amber700, fontWeight: '500' },
  syncedBadge: { backgroundColor: C.green100, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  syncedText: { fontSize: 11, color: C.green700, fontWeight: '500' },
  actionBtn: { width: 34, height: 34, backgroundColor: C.gray100, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.gray900, marginBottom: 4 },
  uploadOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, borderRadius: 14, padding: 14 },
  uploadIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  uploadSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  cancelBtn: { marginTop: 12, borderWidth: 1, borderColor: C.gray300, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.gray700 },
});
