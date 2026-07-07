import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search, Plus, Phone, Mail, MapPin, Building2, User,
  ChevronRight, Briefcase, X,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { clients, affaires, type Client } from '@/data/mockData';

type TypeFilter = 'all' | 'personne_physique' | 'personne_morale';

export default function ClientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<Client | null>(null);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const fullName = `${c.nom} ${c.prenom ?? ''} ${c.email} ${c.ville}`.toLowerCase();
    return fullName.includes(q) && (typeFilter === 'all' || c.type === typeFilter);
  });

  const getAffaires = (id: string) => affaires.filter(a => a.client.id === id);
  const initials = (c: Client) => ((c.prenom?.[0] ?? '') + c.nom[0]).toUpperCase() || '?';
  const avatarGrad = (type: string) => type === 'personne_morale' ? C.blue600 : C.amber500;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Clients</Text>
            <Text style={s.sub}>Répertoire du cabinet</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/nouveau-client')} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Total', value: clients.length, color: C.white },
            { label: 'Entreprises', value: clients.filter(c => c.type === 'personne_morale').length, color: '#93c5fd' },
            { label: 'Particuliers', value: clients.filter(c => c.type === 'personne_physique').length, color: C.amber400 },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Search color={C.gray400} size={18} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un client..."
            placeholderTextColor={C.gray400}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color={C.gray400} size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter */}
        <View style={s.typeRow}>
          {([
            { key: 'all', label: `Tous (${clients.length})` },
            { key: 'personne_morale', label: `Entreprises (${clients.filter(c => c.type === 'personne_morale').length})` },
            { key: 'personne_physique', label: `Particuliers (${clients.filter(c => c.type === 'personne_physique').length})` },
          ] as { key: TypeFilter; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTypeFilter(key)}
              style={[s.typeBtn, typeFilter === key && s.typeBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.typeBtnText, typeFilter === key && s.typeBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucun client trouvé</Text>
          </View>
        }
        renderItem={({ item: c }) => {
          const cAffaires = getAffaires(c.id);
          const actives = cAffaires.filter(a => a.statut === 'en_cours' || a.statut === 'ouverte').length;
          return (
            <TouchableOpacity style={s.card} onPress={() => setSelected(c)} activeOpacity={0.8}>
              <View style={[s.avatar, { backgroundColor: avatarGrad(c.type) }]}>
                <Text style={s.avatarText}>{initials(c)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={s.clientName} numberOfLines={1}>
                    {c.nom}{c.prenom ? ` ${c.prenom}` : ''}
                  </Text>
                  {c.type === 'personne_morale'
                    ? <Building2 color={C.blue500} size={13} />
                    : <User color={C.amber500} size={13} />}
                </View>
                <Text style={s.clientEmail} numberOfLines={1}>{c.email}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin color={C.gray400} size={11} />
                    <Text style={s.clientMeta}>{c.ville}</Text>
                  </View>
                  {cAffaires.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Briefcase color={C.amber600} size={11} />
                      <Text style={[s.clientMeta, { color: C.amber600, fontWeight: '500' }]}>
                        {cAffaires.length} affaire(s){actives > 0 ? ` · ${actives} actives` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight color={C.gray300} size={18} />
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={() => router.push('/nouveau-client')} activeOpacity={0.85}>
        <Plus color={C.gray900} size={28} />
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.modalOverlay} onPress={() => setSelected(null)} activeOpacity={1}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar + Name */}
                <View style={s.sheetHeader}>
                  <View style={[s.avatarLg, { backgroundColor: avatarGrad(selected.type) }]}>
                    <Text style={s.avatarLgText}>{initials(selected)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.sheetName}>
                      {selected.nom}{selected.prenom ? ` ${selected.prenom}` : ''}
                    </Text>
                    <View style={[s.typePill, selected.type === 'personne_morale' ? s.typePillBlue : s.typePillAmber]}>
                      {selected.type === 'personne_morale'
                        ? <Building2 color={C.blue700} size={11} />
                        : <User color={C.amber700} size={11} />}
                      <Text style={[s.typePillText, selected.type === 'personne_morale' ? { color: C.blue700 } : { color: C.amber700 }]}>
                        {selected.type === 'personne_morale' ? 'Personne morale' : 'Personne physique'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact */}
                <View style={s.contactBox}>
                  <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`tel:${selected.telephone}`)}>
                    <Phone color={C.gray400} size={16} />
                    <Text style={s.contactLink}>{selected.telephone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`mailto:${selected.email}`)}>
                    <Mail color={C.gray400} size={16} />
                    <Text style={[s.contactLink, { flex: 1 }]} numberOfLines={1}>{selected.email}</Text>
                  </TouchableOpacity>
                  <View style={s.contactRow}>
                    <MapPin color={C.gray400} size={16} />
                    <Text style={s.contactText}>{selected.ville}, Cameroun</Text>
                  </View>
                </View>

                {/* Affaires liées */}
                {(() => {
                  const cAffaires = getAffaires(selected.id);
                  return cAffaires.length > 0 ? (
                    <View style={s.affSection}>
                      <Text style={s.sheetSectionTitle}>Affaires ({cAffaires.length})</Text>
                      {cAffaires.map(a => (
                        <TouchableOpacity
                          key={a.id}
                          style={s.affRow}
                          onPress={() => {
                            setSelected(null);
                            router.push({ pathname: '/affaire/[id]', params: { id: a.id } });
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.affTitle} numberOfLines={1}>{a.intitule}</Text>
                            <Text style={s.affMeta}>{a.numero} • {a.domaine}</Text>
                          </View>
                          <View style={[s.affStatusBadge, a.statut === 'en_cours' ? { backgroundColor: C.orange100 } : a.statut === 'gagnee' ? { backgroundColor: C.green100 } : { backgroundColor: C.gray100 }]}>
                            <Text style={[s.affStatusText, a.statut === 'en_cours' ? { color: C.orange700 } : a.statut === 'gagnee' ? { color: C.green700 } : { color: C.gray700 }]}>
                              {a.statut.replace('_', ' ')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null;
                })()}

                {/* Actions */}
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85}>
                    <Text style={s.primaryBtnText}>+ Créer une affaire pour ce client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)} activeOpacity={0.8}>
                    <Text style={s.closeBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.gray400, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, marginBottom: 8,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  typeBtnActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  typeBtnText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  typeBtnTextActive: { color: C.gray900 },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: C.gray500 },
  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '700', fontSize: 16 },
  clientName: { fontSize: 14, fontWeight: '600', color: C.gray900, flex: 1 },
  clientEmail: { fontSize: 12, color: C.gray500 },
  clientMeta: { fontSize: 12, color: C.gray400 },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    width: 56, height: 56, backgroundColor: C.amber500, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber600, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', padding: 20,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarLg: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { color: C.white, fontWeight: '700', fontSize: 22 },
  sheetName: { fontSize: 20, fontWeight: '700', color: C.gray900, marginBottom: 6 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  typePillBlue: { backgroundColor: C.blue100 },
  typePillAmber: { backgroundColor: C.amber100 },
  typePillText: { fontSize: 12, fontWeight: '500' },
  contactBox: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, marginBottom: 16, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactLink: { fontSize: 14, color: C.blue600, fontWeight: '500' },
  contactText: { fontSize: 14, color: C.gray700 },
  affSection: { marginBottom: 16 },
  sheetSectionTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginBottom: 10 },
  affRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gray50, borderRadius: 12, padding: 12, marginBottom: 8 },
  affTitle: { fontSize: 13, fontWeight: '500', color: C.gray900 },
  affMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  affStatusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  affStatusText: { fontSize: 11, fontWeight: '500' },
  primaryBtn: { backgroundColor: C.amber500, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
});
