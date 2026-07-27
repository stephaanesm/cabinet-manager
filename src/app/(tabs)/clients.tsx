import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search, Plus, Phone, Mail, MapPin, User,
  ChevronRight, X, AlertCircle,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { useClients } from '@/hooks/useClients';
import { Client } from '@/services/clients.service';

export default function ClientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);

  const { clients, isLoading, error, total, refetch } = useClients({
    search: search.trim() ? search.trim() : undefined,
  });

  const initials = (c: Client) => {
    const parts = c.nomComplet.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return c.nomComplet.slice(0, 2).toUpperCase() || '?';
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Clients</Text>
            <Text style={s.sub}>{total} client{total > 1 ? 's' : ''} au total</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/nouveau-client')} activeOpacity={0.8}>
            <Plus color={C.gray900} size={22} />
          </TouchableOpacity>
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
      </SafeAreaView>

      {error && !isLoading && (
        <View style={s.errorBanner}>
          <AlertCircle color={C.red500} size={16} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={s.retryBtn}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={clients}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading && clients.length > 0} onRefresh={refetch} tintColor={C.amber500} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}><ActivityIndicator color={C.amber500} size="large" /></View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>Aucun client trouvé dans la base de données</Text>
            </View>
          )
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity style={s.card} onPress={() => setSelected(c)} activeOpacity={0.8}>
            <View style={[s.avatar, { backgroundColor: C.amber500 }]}>
              <Text style={s.avatarText}>{initials(c)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={s.clientName} numberOfLines={1}>{c.nomComplet}</Text>
                <User color={C.amber500} size={13} />
              </View>
              {c.email ? <Text style={s.clientEmail} numberOfLines={1}>{c.email}</Text> : null}
              {c.telephone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Phone color={C.gray400} size={11} />
                  <Text style={s.clientMeta}>{c.telephone}</Text>
                </View>
              ) : null}
            </View>
            <ChevronRight color={C.gray300} size={18} />
          </TouchableOpacity>
        )}
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
                  <View style={[s.avatarLg, { backgroundColor: C.amber500 }]}>
                    <Text style={s.avatarLgText}>{initials(selected)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.sheetName}>{selected.nomComplet}</Text>
                  </View>
                </View>

                {/* Contact */}
                <View style={s.contactBox}>
                  {selected.telephone ? (
                    <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`tel:${selected.telephone}`)}>
                      <Phone color={C.gray400} size={16} />
                      <Text style={s.contactLink}>{selected.telephone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {selected.email ? (
                    <TouchableOpacity style={s.contactRow} onPress={() => Linking.openURL(`mailto:${selected.email}`)}>
                      <Mail color={C.gray400} size={16} />
                      <Text style={[s.contactLink, { flex: 1 }]} numberOfLines={1}>{selected.email}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={{ marginTop: 8 }}>
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, marginBottom: 12,
    shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: C.gray900 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 12,
    backgroundColor: C.red50, borderRadius: 12, borderWidth: 1, borderColor: C.red200,
  },
  errorText: { flex: 1, fontSize: 13, color: C.red700 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.red100, borderRadius: 8 },
  retryText: { fontSize: 12, color: C.red700, fontWeight: '600' },
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
  contactBox: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, marginBottom: 16, gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactLink: { fontSize: 14, color: C.blue600, fontWeight: '500' },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
});
