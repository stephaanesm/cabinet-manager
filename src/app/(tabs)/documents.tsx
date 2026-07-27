import { AppColors as C } from '@/constants/theme';
import { useDocuments } from '@/hooks/useDocuments';
import { Document, DocumentConfidentialite } from '@/services/documents.service';
import {
    AlertCircle, Camera, ChevronDown, Download, Eye,
    FileText, Filter, Globe, Lock, Paperclip,
    Plus, Search, ShieldAlert, X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    RefreshControl, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPES = ['Tous', 'Assignation', 'Contrat', 'Conclusions', 'Correspondance', 'Rapport', 'PV', 'Plainte', 'Déposition', 'Titre foncier', 'Pièce justificative'];

const CONF_CONFIG: Record<DocumentConfidentialite, { label: string; bg: string; text: string; Icon: any }> = {
  public:       { label: 'Public',       bg: C.green100,  text: C.green700,  Icon: Globe },
  confidentiel: { label: 'Confidentiel', bg: C.orange100, text: C.orange700, Icon: Lock },
  secret:       { label: 'Secret',       bg: C.red100,    text: C.red700,    Icon: ShieldAlert },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Assignation:  { bg: C.red50,    text: C.red600 },
  Contrat:      { bg: C.blue50,   text: C.blue600 },
  Conclusions:  { bg: C.purple50, text: C.purple600 },
  Rapport:      { bg: C.indigo50, text: C.indigo600 },
  default:      { bg: C.blue50,   text: C.blue600 },
};

const fmt = (d: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

export default function DocumentsScreen() {
  const [search, setSearch]           = useState('');
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedConf, setSelectedConf] = useState<DocumentConfidentialite | ''>('');
  const [showFilters, setShowFilters]   = useState(false);
  const [showUpload, setShowUpload]     = useState(false);

  const { documents, isLoading, error, total, refetch } = useDocuments({
    typeDocument:    selectedType !== 'Tous' ? selectedType : undefined,
    confidentialite: selectedConf || undefined,
    search:          search.trim() || undefined,
  });

  const activeFilters = (selectedType !== 'Tous' ? 1 : 0) + (selectedConf ? 1 : 0);

  const renderItem = useCallback(({ item: doc }: { item: Document }) => {
    const conf       = CONF_CONFIG[doc.confidentialite];
    const ConfIcon   = conf.Icon;
    const typeColors = TYPE_COLORS[doc.typeDocument ?? ''] ?? TYPE_COLORS.default;

    return (
      <View style={s.card}>
        <View style={[s.docIcon, { backgroundColor: typeColors.bg }]}>
          <FileText color={typeColors.text} size={22} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.docName} numberOfLines={1}>{doc.nom}</Text>
          <Text style={s.docMeta}>
            {doc.typeDocument ?? 'Document'}
            {doc.tailleKo ? ` • ${doc.tailleKo} Ko` : ''}
          </Text>
          <Text style={s.docSub} numberOfLines={1}>
            {doc.dossierId ? `Dossier #${doc.dossierId} • ` : ''}{fmt(doc.createdAt)}
          </Text>
          <View style={s.badgesRow}>
            <View style={[s.confBadge, { backgroundColor: conf.bg }]}>
              <ConfIcon color={conf.text} size={10} />
              <Text style={[s.confText, { color: conf.text }]}>{conf.label}</Text>
            </View>
            {doc.tags && doc.tags.length > 0 && (
              <View style={s.tagBadge}>
                <Text style={s.tagText}>{doc.tags[0]}</Text>
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
  }, []);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Documents</Text>
            <Text style={s.sub}>
              {isLoading ? 'Chargement…' : `${total} document${total !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowUpload(true)} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { val: total,                                                                     label: 'Total',        color: C.white },
            { val: documents.filter(d => d.confidentialite === 'confidentiel').length,       label: 'Confidentiel', color: C.amber400 },
            { val: documents.filter(d => d.confidentialite === 'secret').length,             label: 'Secrets',      color: '#fca5a5' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

      {/* Erreur */}
      {error && !isLoading && (
        <View style={s.errorBanner}>
          <AlertCircle color={C.red500} size={16} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={s.retryBtn}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
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
          <ChevronDown color={C.gray500} size={13} />
          {activeFilters > 0 && (
            <View style={s.filterCount}>
              <Text style={s.filterCountText}>{activeFilters}</Text>
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
          <Text style={s.filterSection}>Confidentialité</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {(['', 'public', 'confidentiel', 'secret'] as const).map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedConf(c)}
                style={[s.typeBtn, selectedConf === c && s.typeBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, selectedConf === c && s.typeBtnTextActive]}>
                  {c === '' ? 'Tous' : CONF_CONFIG[c].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {activeFilters > 0 && (
            <TouchableOpacity onPress={() => { setSelectedType('Tous'); setSelectedConf(''); }}>
              <Text style={s.clearFilters}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={s.resultCount}>
        <Text style={{ fontWeight: '700', color: C.gray900 }}>{documents.length}</Text> document(s) trouvé(s)
      </Text>

      <FlatList
        data={documents}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading && documents.length > 0} onRefresh={refetch} tintColor={C.amber500} />
        }
        ListEmptyComponent={
          isLoading
            ? <View style={s.center}><ActivityIndicator color={C.amber500} size="large" /></View>
            : (
              <View style={s.center}>
                <FileText color={C.gray300} size={48} />
                <Text style={s.emptyTitle}>Aucun document trouvé</Text>
                <Text style={s.emptyDesc}>Modifiez vos filtres ou ajoutez un document.</Text>
              </View>
            )
        }
        renderItem={renderItem}
      />

      {/* Upload Modal */}
      <Modal visible={showUpload} transparent animationType="slide" onRequestClose={() => setShowUpload(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowUpload(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Ajouter un document</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {[
                { Icon: Camera,     label: 'Prendre une photo', sub: 'Numériser un document physique', bg: C.blue100,  color: C.blue600 },
                { Icon: Paperclip,  label: 'Choisir un fichier', sub: 'PDF, Word, image…',              bg: C.green100, color: C.green600 },
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 12, backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red700 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.red100, borderRadius: 8 },
  retryText: { fontSize: 12, color: C.red700, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  filterRow: { paddingHorizontal: 12, marginTop: 8 },
  filterToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
  },
  filterToggleText: { fontSize: 13, fontWeight: '500', color: C.gray700 },
  filterCount: { backgroundColor: C.amber500, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: C.gray900 },
  filtersPanel: {
    backgroundColor: C.white, borderRadius: 14, marginHorizontal: 12, marginTop: 8, padding: 14,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  filterSection: { fontSize: 11, fontWeight: '700', color: C.gray500, textTransform: 'uppercase', marginBottom: 8 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  typeBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  typeBtnText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  typeBtnTextActive: { color: C.gray900 },
  clearFilters: { fontSize: 13, color: C.red600, fontWeight: '500', marginTop: 8 },
  resultCount: { fontSize: 13, color: C.gray500, paddingHorizontal: 14, marginTop: 8, marginBottom: 2 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  center: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: C.gray500 },
  emptyDesc: { fontSize: 13, color: C.gray400 },
  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  docIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  docMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  docSub: { fontSize: 11, color: C.gray400, marginTop: 2 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  confText: { fontSize: 11, fontWeight: '500' },
  tagBadge: { backgroundColor: C.gray100, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { fontSize: 11, color: C.gray600 },
  actionBtn: { width: 34, height: 34, backgroundColor: C.gray100, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.gray900, marginBottom: 4 },
  uploadOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, borderRadius: 14, padding: 14,
  },
  uploadIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  uploadSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  cancelBtn: { marginTop: 12, borderWidth: 1, borderColor: C.gray300, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.gray700 },
});
