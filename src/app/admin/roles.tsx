import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, ChevronDown, ChevronUp, Check, Lock, Info,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import { roles, permissions, type Role, type RoleKey } from '@/data/adminData';

const ROLE_COLORS: Record<RoleKey, string> = {
  administrateur: '#dc2626',
  associe:        '#7c3aed',
  avocat:         C.blue600,
  assistant:      C.green600,
};

export default function RolesScreen() {
  const [rolesData, setRolesData] = useState<Role[]>(roles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const modules = [...new Set(permissions.map(p => p.module))];

  const openRole = (role: Role) => {
    setSelectedRole(role);
    setEditPerms([...role.permissions]);
    setExpandedModule(null);
  };

  const togglePerm = (pid: string) => {
    if (!selectedRole?.modifiable) return;
    setEditPerms(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  };

  const savePerms = () => {
    if (!selectedRole) return;
    setRolesData(prev =>
      prev.map(r => r.id === selectedRole.id ? { ...r, permissions: editPerms } : r)
    );
    setShowConfirm(false);
    setSelectedRole(null);
    Alert.alert('Succès', 'Permissions mises à jour et journalisées.');
  };

  const hasChanged = selectedRole
    ? JSON.stringify([...editPerms].sort()) !== JSON.stringify([...selectedRole.permissions].sort())
    : false;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#1a0a0a' }}>
        <View style={s.header}>
          <Text style={s.title}>Rôles & Permissions</Text>
          <Text style={s.sub}>Contrôle d'accès basé sur les rôles (RBAC)</Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Info RBAC */}
        <View style={s.infoBanner}>
          <Info color={C.blue600} size={16} />
          <Text style={s.infoText}>
            Les permissions définissent ce que chaque rôle peut faire. Seul l'administrateur peut modifier les rôles. Le rôle <Text style={{ fontWeight: '700' }}>Administrateur</Text> ne peut pas être restreint.
          </Text>
        </View>

        {/* Cartes des rôles */}
        {rolesData.map(role => {
          const color = ROLE_COLORS[role.key];
          const permCount = role.permissions.length;
          return (
            <TouchableOpacity
              key={role.id}
              style={[s.roleCard, { borderLeftColor: color }]}
              onPress={() => openRole(role)}
              activeOpacity={0.8}
            >
              <View style={s.roleCardTop}>
                <View style={[s.roleIcon, { backgroundColor: color }]}>
                  <Shield color={C.white} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.roleNameRow}>
                    <Text style={s.roleName}>{role.label}</Text>
                    {!role.modifiable && (
                      <View style={s.lockedBadge}>
                        <Lock color={C.gray500} size={11} />
                        <Text style={s.lockedText}>Verrouillé</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.roleDesc} numberOfLines={2}>{role.description}</Text>
                </View>
              </View>
              <View style={s.roleCardFooter}>
                <View style={s.roleStatPill}>
                  <Text style={[s.roleStatText, { color }]}>{role.nbUtilisateurs} utilisateur(s)</Text>
                </View>
                <View style={s.roleStatPill}>
                  <Text style={[s.roleStatText, { color }]}>{permCount} permission(s)</Text>
                </View>
                <Text style={s.editLink}>{role.modifiable ? 'Modifier →' : 'Consulter →'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Matrice des permissions */}
        <View style={s.matrixSection}>
          <Text style={s.sectionTitle}>Matrice des permissions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {/* En-têtes */}
              <View style={s.matrixHeader}>
                <Text style={[s.matrixCell, s.matrixLabel]}>Permission</Text>
                {rolesData.map(r => (
                  <Text key={r.id} style={[s.matrixRoleHeader, { color: ROLE_COLORS[r.key] }]} numberOfLines={2}>
                    {r.label}
                  </Text>
                ))}
              </View>
              {modules.map(mod => (
                <View key={mod}>
                  <View style={s.moduleHeader}>
                    <Text style={s.moduleHeaderText}>{mod}</Text>
                  </View>
                  {permissions.filter(p => p.module === mod).map(perm => (
                    <View key={perm.id} style={s.matrixRow}>
                      <Text style={s.matrixCell} numberOfLines={1}>{perm.label}</Text>
                      {rolesData.map(r => (
                        <View key={r.id} style={s.matrixCheckCell}>
                          {r.permissions.includes(perm.id)
                            ? <Check color={ROLE_COLORS[r.key]} size={16} />
                            : <View style={s.matrixDash} />}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Modal édition permissions */}
      <Modal visible={selectedRole !== null} transparent animationType="slide" onRequestClose={() => setSelectedRole(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelectedRole(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            {selectedRole && (
              <>
                <View style={s.sheetTitleRow}>
                  <View style={[s.roleIcon, { backgroundColor: ROLE_COLORS[selectedRole.key] }]}>
                    <Shield color={C.white} size={16} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.sheetTitle}>{selectedRole.label}</Text>
                    <Text style={s.sheetSub}>{editPerms.length} permissions actives</Text>
                  </View>
                  {!selectedRole.modifiable && (
                    <View style={s.lockedBadge}>
                      <Lock color={C.gray500} size={11} />
                      <Text style={s.lockedText}>Non modifiable</Text>
                    </View>
                  )}
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {modules.map(mod => {
                    const modPerms = permissions.filter(p => p.module === mod);
                    const activeCount = modPerms.filter(p => editPerms.includes(p.id)).length;
                    const isExpanded = expandedModule === mod;
                    return (
                      <View key={mod} style={s.modBlock}>
                        <TouchableOpacity
                          style={s.modHeader}
                          onPress={() => setExpandedModule(isExpanded ? null : mod)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.modTitle}>{mod}</Text>
                            <Text style={s.modCount}>{activeCount}/{modPerms.length} permissions actives</Text>
                          </View>
                          <View style={[s.modCountPill, { backgroundColor: activeCount > 0 ? C.green50 : C.gray100 }]}>
                            <Text style={[s.modCountPillText, { color: activeCount > 0 ? C.green600 : C.gray400 }]}>
                              {activeCount}
                            </Text>
                          </View>
                          {isExpanded
                            ? <ChevronUp color={C.gray400} size={16} />
                            : <ChevronDown color={C.gray400} size={16} />}
                        </TouchableOpacity>
                        {isExpanded && modPerms.map(perm => {
                          const active = editPerms.includes(perm.id);
                          return (
                            <TouchableOpacity
                              key={perm.id}
                              style={s.permRow}
                              onPress={() => togglePerm(perm.id)}
                              activeOpacity={selectedRole.modifiable ? 0.8 : 1}
                            >
                              <View style={[
                                s.permCheck,
                                active && { backgroundColor: ROLE_COLORS[selectedRole.key], borderColor: ROLE_COLORS[selectedRole.key] },
                                !selectedRole.modifiable && { opacity: 0.5 },
                              ]}>
                                {active && <Check color={C.white} size={12} />}
                              </View>
                              <Text style={[s.permLabel, !active && { color: C.gray400 }]}>{perm.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={{ gap: 10, marginTop: 12 }}>
                  {selectedRole.modifiable && hasChanged && (
                    <TouchableOpacity
                      style={s.saveBtn}
                      onPress={() => setShowConfirm(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.saveBtnText}>Enregistrer les modifications</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedRole(null)} activeOpacity={0.8}>
                    <Text style={s.closeBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Shield color={C.red600} size={28} style={{ marginBottom: 10 }} />
            <Text style={s.confirmTitle}>Confirmer la modification</Text>
            <Text style={s.confirmText}>
              Cette action sera journalisée dans l'audit. Les utilisateurs avec ce rôle verront leurs accès modifiés immédiatement.
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setShowConfirm(false)} activeOpacity={0.8}>
                <Text style={s.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmOk} onPress={savePerms} activeOpacity={0.85}>
                <Text style={s.confirmOkText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { padding: 16, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: C.white },
  sub: { fontSize: 13, color: '#fca5a5', marginTop: 2 },
  content: { padding: 14, paddingBottom: 100, gap: 14 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.blue50, borderWidth: 1, borderColor: C.blue100, borderRadius: 14, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: C.blue700, lineHeight: 20 },
  roleCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  roleCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  roleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  roleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roleName: { fontSize: 16, fontWeight: '700', color: C.gray900 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gray100, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  lockedText: { fontSize: 11, color: C.gray500, fontWeight: '500' },
  roleDesc: { fontSize: 13, color: C.gray600, lineHeight: 18 },
  roleCardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  roleStatPill: { backgroundColor: C.gray50, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  roleStatText: { fontSize: 12, fontWeight: '600' },
  editLink: { marginLeft: 'auto' as any, fontSize: 13, color: C.gray500, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.gray900, marginBottom: 12 },
  matrixSection: { backgroundColor: C.white, borderRadius: 16, padding: 14, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  matrixHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: C.gray200, paddingBottom: 8, marginBottom: 4 },
  matrixCell: { width: 180, fontSize: 12, color: C.gray700, paddingRight: 10 },
  matrixLabel: { fontWeight: '600' },
  matrixRoleHeader: { width: 80, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  moduleHeader: { backgroundColor: C.gray50, paddingVertical: 6, paddingLeft: 4, marginVertical: 4, borderRadius: 6 },
  moduleHeaderText: { fontSize: 11, fontWeight: '700', color: C.gray600, textTransform: 'uppercase', letterSpacing: 0.5 },
  matrixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.gray50 },
  matrixCheckCell: { width: 80, alignItems: 'center' },
  matrixDash: { width: 12, height: 2, backgroundColor: C.gray200, borderRadius: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: 20 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.gray900 },
  sheetSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  modBlock: { marginBottom: 8, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, overflow: 'hidden' },
  modHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: C.gray50 },
  modTitle: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  modCount: { fontSize: 11, color: C.gray500 },
  modCountPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  modCountPillText: { fontSize: 12, fontWeight: '700' },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: C.gray100 },
  permCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.gray300, alignItems: 'center', justifyContent: 'center' },
  permLabel: { flex: 1, fontSize: 13, color: C.gray900 },
  saveBtn: { backgroundColor: C.red600, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: C.white },
  closeBtn: { borderWidth: 1, borderColor: C.gray200, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontWeight: '500', color: C.gray500 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmBox: { backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', width: '100%' },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: C.gray900, marginBottom: 10 },
  confirmText: { fontSize: 14, color: C.gray600, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '500', color: C.gray600 },
  confirmOk: { flex: 1, backgroundColor: C.red600, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmOkText: { fontSize: 14, fontWeight: '700', color: C.white },
});
