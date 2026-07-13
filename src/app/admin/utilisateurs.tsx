import { AppColors as C } from '@/constants/theme';
import {
    roles,
    utilisateursAdmin,
    type RoleKey,
    type UtilisateurAdmin,
} from '@/data/adminData';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    ChevronRight,
    Lock,
    Mail,
    Phone,
    Plus,
    Search,
    Unlock,
    X,
    XCircle
} from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal, ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROLE_CFG: Record<RoleKey, { label: string; color: string; bg: string }> = {
  administrateur: { label: 'Administrateur', color: '#dc2626', bg: '#fef2f2' },
  associe:        { label: 'Associé',        color: '#7c3aed', bg: '#faf5ff' },
  avocat:         { label: 'Avocat',          color: C.blue600, bg: C.blue50 },
  assistant:      { label: 'Assistant',       color: C.green600, bg: C.green50 },
};

export default function UtilisateursScreen() {
  const [users, setUsers]         = useState<UtilisateurAdmin[]>(utilisateursAdmin);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleKey | 'all'>('all');
  const [selected, setSelected]   = useState<UtilisateurAdmin | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // form nouveau utilisateur
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', role: 'avocat' as RoleKey, fa2: false });

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const match = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(q);
    return match && (roleFilter === 'all' || u.role === roleFilter);
  });

  const toggleActif = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, actif: !u.actif } : u));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, actif: !prev.actif } : null);
  };

  const toggle2FA = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, authentif2FA: !u.authentif2FA } : u));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, authentif2FA: !prev.authentif2FA } : null);
  };

  const resetTentatives = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, tentativesEchouees: 0 } : u));
    Alert.alert('Succès', 'Tentatives réinitialisées');
  };

  const creerUtilisateur = () => {
    if (!form.nom || !form.email) return;
    const nu: UtilisateurAdmin = {
      id: `u${Date.now()}`, nom: form.nom, prenom: form.prenom,
      email: form.email, telephone: form.telephone, role: form.role,
      actif: true, dateCreation: new Date().toISOString().split('T')[0],
      derniereConnexion: null, authentif2FA: form.fa2, tentativesEchouees: 0,
    };
    setUsers(prev => [nu, ...prev]);
    setForm({ nom: '', prenom: '', email: '', telephone: '', role: 'avocat', fa2: false });
    setShowCreate(false);
    Alert.alert('Succès', `Compte créé pour ${nu.prenom} ${nu.nom}`);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return 'Jamais connecté';
    const dt = new Date(d);
    const diff = Date.now() - dt.getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Il y a < 1h';
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(diff / 86400000)}j`;
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1a0a0a' }}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Utilisateurs</Text>
            <Text style={s.sub}>{users.filter(u => u.actif).length} actifs · {users.length} total</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Plus color={C.white} size={22} />
          </TouchableOpacity>
        </View>
        {/* Search */}
        <View style={s.searchWrap}>
          <Search color={C.gray400} size={16} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor={C.gray500}
          />
          {search !== '' && <TouchableOpacity onPress={() => setSearch('')}><X color={C.gray500} size={14} /></TouchableOpacity>}
        </View>
        {/* Role filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
          {([
            { key: 'all', label: `Tous (${users.length})` },
            ...Object.entries(ROLE_CFG).map(([k, v]) => ({
              key: k as RoleKey | 'all',
              label: `${v.label} (${users.filter(u => u.role === k).length})`,
            })),
          ] as { key: RoleKey | 'all'; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setRoleFilter(key)}
              style={[s.filterBtn, roleFilter === key && s.filterBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterText, roleFilter === key && s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: u }) => {
          const rc = ROLE_CFG[u.role];
          return (
            <TouchableOpacity style={[s.card, !u.actif && s.cardInactif]} onPress={() => setSelected(u)} activeOpacity={0.8}>
              <View style={s.cardLeft}>
                <View style={[s.avatar, { backgroundColor: rc.color }]}>
                  <Text style={s.avatarText}>{u.prenom[0]}{u.nom[0]}</Text>
                </View>
                {u.actif
                  ? <View style={s.activeDot} />
                  : <View style={[s.activeDot, { backgroundColor: C.gray400 }]} />}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={s.nameRow}>
                  <Text style={s.userName}>{u.prenom} {u.nom}</Text>
                  {u.tentativesEchouees >= 3 && (
                    <View style={s.warnBadge}><AlertTriangle color={C.red600} size={11} /></View>
                  )}
                  {!u.authentif2FA && u.actif && (
                    <View style={s.no2faBadge}><Text style={s.no2faText}>Sans 2FA</Text></View>
                  )}
                </View>
                <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                <View style={s.metaRow}>
                  <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
                    <Text style={[s.rolePillText, { color: rc.color }]}>{rc.label}</Text>
                  </View>
                  <Text style={s.lastSeen}>{fmtDate(u.derniereConnexion)}</Text>
                </View>
              </View>
              <ChevronRight color={C.gray300} size={16} />
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal détail utilisateur */}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.overlay} onPress={() => setSelected(null)} activeOpacity={1}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            {selected && (() => {
              const rc = ROLE_CFG[selected.role];
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Avatar + nom */}
                  <View style={s.sheetHeader}>
                    <View style={[s.avatarLg, { backgroundColor: rc.color }]}>
                      <Text style={s.avatarLgText}>{selected.prenom[0]}{selected.nom[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetName}>{selected.prenom} {selected.nom}</Text>
                      <View style={[s.rolePill, { backgroundColor: rc.bg, alignSelf: 'flex-start' }]}>
                        <Text style={[s.rolePillText, { color: rc.color }]}>{rc.label}</Text>
                      </View>
                    </View>
                    <View style={[s.statusPill, selected.actif ? s.statusActive : s.statusInactive]}>
                      {selected.actif
                        ? <CheckCircle color={C.green600} size={13} />
                        : <XCircle color={C.gray500} size={13} />}
                      <Text style={[s.statusText, { color: selected.actif ? C.green600 : C.gray500 }]}>
                        {selected.actif ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>

                  {/* Infos */}
                  <View style={s.infoBox}>
                    {[
                      { Icon: Mail,     val: selected.email },
                      { Icon: Phone,    val: selected.telephone },
                      { Icon: Calendar, val: `Créé le ${new Date(selected.dateCreation).toLocaleDateString('fr-FR')}` },
                      { Icon: Clock,    val: `Dernière connexion : ${fmtDate(selected.derniereConnexion)}` },
                    ].map(({ Icon, val }) => (
                      <View key={val} style={s.infoRow}>
                        <Icon color={C.gray400} size={15} />
                        <Text style={s.infoText} numberOfLines={1}>{val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Sécurité */}
                  <View style={s.secCard}>
                    <Text style={s.secTitle}>Sécurité du compte</Text>
                    <View style={s.secRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.secLabel}>Vérification 2FA</Text>
                        <Text style={s.secSub}>{selected.authentif2FA ? 'Activée' : 'Non activée'}</Text>
                      </View>
                      <Switch
                        value={selected.authentif2FA}
                        onValueChange={() => toggle2FA(selected.id)}
                        trackColor={{ false: C.gray200, true: C.green200 }}
                        thumbColor={selected.authentif2FA ? C.green600 : C.gray400}
                      />
                    </View>
                    {selected.tentativesEchouees > 0 && (
                      <View style={s.tentativesRow}>
                        <AlertTriangle color={C.red500} size={14} />
                        <Text style={s.tentativesText}>
                          {selected.tentativesEchouees} tentative(s) échouée(s)
                        </Text>
                        <TouchableOpacity onPress={() => resetTentatives(selected.id)} style={s.resetBtn}>
                          <Text style={s.resetText}>Réinitialiser</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Permissions héritées */}
                  <View style={s.permCard}>
                    <Text style={s.secTitle}>Permissions héritées du rôle</Text>
                    {(() => {
                      const role = roles.find(r => r.key === selected.role);
                      if (!role) return null;
                      const modules = [...new Set(role.permissions.map(pid => {
                        const { permission } = (() => {
                          const perm = require('@/data/adminData').permissions.find((p: any) => p.id === pid);
                          return { permission: perm };
                        })();
                        return permission?.module ?? '';
                      }))].filter(Boolean);
                      return modules.map(mod => (
                        <View key={mod} style={s.permModule}>
                          <Text style={s.permModuleName}>{mod}</Text>
                        </View>
                      ));
                    })()}
                  </View>

                  {/* Actions */}
                  <View style={{ gap: 10, marginTop: 8, paddingBottom: 20 }}>
                    <TouchableOpacity
                      style={[s.actionBtn, selected.actif ? s.actionBtnDanger : s.actionBtnSuccess]}
                      onPress={() => { toggleActif(selected.id); }}
                      activeOpacity={0.85}
                    >
                      {selected.actif
                        ? <><Lock color={C.red700} size={16} /><Text style={s.actionBtnDangerText}>Désactiver le compte</Text></>
                        : <><Unlock color={C.green700} size={16} /><Text style={s.actionBtnSuccessText}>Réactiver le compte</Text></>}
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

      {/* Modal création */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={s.overlay} onPress={() => setShowCreate(false)} activeOpacity={1}>
          <TouchableOpacity style={[s.sheet, { maxHeight: '75%' }]} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Nouveau compte utilisateur</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'nom',       label: 'Nom *',       ph: 'DUPONT' },
                { key: 'prenom',    label: 'Prénom *',    ph: 'Jean' },
                { key: 'email',     label: 'Email *',     ph: 'email@cabinet.cm' },
                { key: 'telephone', label: 'Téléphone',   ph: '+237 6XX XX XX XX' },
              ].map(f => (
                <View key={f.key} style={s.formField}>
                  <Text style={s.formLabel}>{f.label}</Text>
                  <TextInput
                    style={s.formInput}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.ph}
                    placeholderTextColor={C.gray400}
                  />
                </View>
              ))}
              <View style={s.formField}>
                <Text style={s.formLabel}>Rôle</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(Object.keys(ROLE_CFG) as RoleKey[]).map(r => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setForm(prev => ({ ...prev, role: r }))}
                      style={[s.roleOption, form.role === r && { backgroundColor: ROLE_CFG[r].bg, borderColor: ROLE_CFG[r].color }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.roleOptionText, form.role === r && { color: ROLE_CFG[r].color }]}>
                        {ROLE_CFG[r].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={s.switchRow}>
                <View>
                  <Text style={s.formLabel}>Activer la 2FA</Text>
                  <Text style={s.formSub}>Recommandé pour la sécurité</Text>
                </View>
                <Switch
                  value={form.fa2}
                  onValueChange={v => setForm(prev => ({ ...prev, fa2: v }))}
                  trackColor={{ false: C.gray200, true: C.green200 }}
                  thumbColor={form.fa2 ? C.green600 : C.gray400}
                />
              </View>
              <TouchableOpacity style={s.createBtn} onPress={creerUtilisateur} activeOpacity={0.85}>
                <Text style={s.createBtnText}>Créer le compte</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowCreate(false)} activeOpacity={0.8}>
                <Text style={s.closeBtnText}>Annuler</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Import manquant ─────────────────────────────────────────────────────────
import { Clock } from 'lucide-react-native';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: '#fca5a5', marginTop: 2 },
  addBtn: { width: 40, height: 40, backgroundColor: C.red600, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, marginHorizontal: 14, marginBottom: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.white },
  filtersRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.07)' },
  filterBtnActive: { backgroundColor: C.red600, borderColor: C.red600 },
  filterText: { fontSize: 12, fontWeight: '500', color: C.gray400 },
  filterTextActive: { color: C.white },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  card: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  cardInactif: { opacity: 0.6 },
  cardLeft: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '700', fontSize: 15 },
  activeDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: C.green500, borderWidth: 2, borderColor: C.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  warnBadge: { backgroundColor: C.red100, borderRadius: 10, padding: 3 },
  no2faBadge: { backgroundColor: C.orange100, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  no2faText: { fontSize: 10, color: C.orange700, fontWeight: '600' },
  userEmail: { fontSize: 12, color: C.gray500, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: { fontSize: 11, fontWeight: '600' },
  lastSeen: { fontSize: 11, color: C.gray400 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.gray900, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarLg: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { color: C.white, fontWeight: '700', fontSize: 20 },
  sheetName: { fontSize: 18, fontWeight: '700', color: C.gray900, marginBottom: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  statusActive: { backgroundColor: C.green50 },
  statusInactive: { backgroundColor: C.gray100 },
  statusText: { fontSize: 12, fontWeight: '600' },
  infoBox: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, gap: 10, marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, color: C.gray700, flex: 1 },
  secCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 14, padding: 14, marginBottom: 14 },
  secTitle: { fontSize: 14, fontWeight: '700', color: C.gray900, marginBottom: 12 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secLabel: { fontSize: 14, fontWeight: '500', color: C.gray900 },
  secSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  tentativesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.red50, borderRadius: 10, padding: 10, marginTop: 10 },
  tentativesText: { flex: 1, fontSize: 13, color: C.red700 },
  resetBtn: { backgroundColor: C.red100, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  resetText: { fontSize: 12, color: C.red700, fontWeight: '600' },
  permCard: { backgroundColor: C.gray50, borderRadius: 14, padding: 14, marginBottom: 14 },
  permModule: { backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: C.red500 },
  permModuleName: { fontSize: 13, fontWeight: '500', color: C.gray700 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  actionBtnDanger: { backgroundColor: C.red50, borderWidth: 1, borderColor: C.red200 },
  actionBtnDangerText: { fontSize: 15, fontWeight: '600', color: C.red700 },
  actionBtnSuccess: { backgroundColor: C.green50, borderWidth: 1, borderColor: C.green200 },
  actionBtnSuccessText: { fontSize: 15, fontWeight: '600', color: C.green700 },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', color: C.gray900, marginBottom: 6 },
  formSub: { fontSize: 11, color: C.gray500, marginTop: 2 },
  formInput: { borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.gray900 },
  roleOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, backgroundColor: C.white },
  roleOptionText: { fontSize: 12, fontWeight: '500', color: C.gray600 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  createBtn: { backgroundColor: C.red600, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  createBtnText: { fontSize: 15, fontWeight: '600', color: C.white },
});
