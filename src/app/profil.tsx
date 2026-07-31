/**
 * src/app/profil.tsx
 * Écran Profil Utilisateur & Changement de Mot de Passe
 * Design Executive Prestige (Bleu Nuit, Or Amber, Cartes sécurisées)
 */

import { AppColors as C } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { changePassword } from '@/services/users.service';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogOut,
  Mail, Shield, User,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfilScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Formulaire de changement de mot de passe
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [showAncien, setShowAncien] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleChangePassword = async () => {
    if (!ancienMdp || !nouveauMdp || !confirmMdp) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs du mot de passe.');
      return;
    }
    if (nouveauMdp.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (nouveauMdp !== confirmMdp) {
      Alert.alert('Erreur', 'Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        ancienMotDePasse: ancienMdp,
        nouveauMotDePasse: nouveauMdp,
      });
      setAncienMdp('');
      setNouveauMdp('');
      setConfirmMdp('');
      Alert.alert('✅ Succès', 'Votre mot de passe a été modifié avec succès.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de modifier le mot de passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <ArrowLeft color={C.gray400} size={20} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profil & Sécurité</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Carte Avatar & Infos Utilisateur */}
          <View style={s.profileCard}>
            <View style={s.avatarWrap}>
              <Text style={s.avatarText}>{initials(user?.nom || 'Avocat')}</Text>
            </View>
            <Text style={s.userName}>{user?.nom || 'Maître Avocat'}</Text>
            <Text style={s.userEmail}>{user?.email || 'avocat@cabinet.cm'}</Text>
            <View style={s.roleBadge}>
              <Shield color={C.amber400} size={13} />
              <Text style={s.roleBadgeText}>{user?.role || 'Administrateur'}</Text>
            </View>
          </View>

          {/* Informations Générales */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Informations du Compte</Text>
            <View style={s.infoRow}>
              <User color={C.amber600} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Nom complet</Text>
                <Text style={s.infoVal}>{user?.nom || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <Mail color={C.amber600} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Adresse Email</Text>
                <Text style={s.infoVal}>{user?.email || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <Shield color={C.amber600} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Authentification 2FA</Text>
                <Text style={s.infoVal}>
                  {user?.authentif2faActif ? 'Activée ✅' : 'Désactivée (Recommandée)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Formulaire Changement de Mot de Passe */}
          <View style={s.sectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <KeyRound color={C.amber600} size={20} />
              <Text style={s.sectionTitle}>Changer le mot de passe</Text>
            </View>

            {/* Mot de passe actuel */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Mot de passe actuel *</Text>
              <View style={s.passWrap}>
                <TextInput
                  style={s.passInput}
                  value={ancienMdp}
                  onChangeText={setAncienMdp}
                  placeholder="••••••••"
                  placeholderTextColor={C.gray400}
                  secureTextEntry={!showAncien}
                />
                <TouchableOpacity onPress={() => setShowAncien(!showAncien)} style={{ paddingHorizontal: 12 }}>
                  {showAncien ? <EyeOff color={C.gray400} size={18} /> : <Eye color={C.gray400} size={18} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Nouveau mot de passe */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Nouveau mot de passe *</Text>
              <View style={s.passWrap}>
                <TextInput
                  style={s.passInput}
                  value={nouveauMdp}
                  onChangeText={setNouveauMdp}
                  placeholder="6 caractères minimum"
                  placeholderTextColor={C.gray400}
                  secureTextEntry={!showNouveau}
                />
                <TouchableOpacity onPress={() => setShowNouveau(!showNouveau)} style={{ paddingHorizontal: 12 }}>
                  {showNouveau ? <EyeOff color={C.gray400} size={18} /> : <Eye color={C.gray400} size={18} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmer le mot de passe */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Confirmer le nouveau mot de passe *</Text>
              <View style={s.passWrap}>
                <TextInput
                  style={s.passInput}
                  value={confirmMdp}
                  onChangeText={setConfirmMdp}
                  placeholder="••••••••"
                  placeholderTextColor={C.gray400}
                  secureTextEntry={!showNouveau}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color={C.gray900} />
              ) : (
                <>
                  <CheckCircle2 color={C.gray900} size={18} />
                  <Text style={s.saveBtnText}>Mettre à jour le mot de passe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bouton Déconnexion */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut color={C.red600} size={18} />
            <Text style={s.logoutBtnText}>Se déconnecter de l'application</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.gray900,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 13, color: C.gray400 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center', backgroundColor: C.gray900, borderRadius: 20,
    padding: 20, shadowColor: C.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.amber500,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: C.gray900 },
  userName: { fontSize: 18, fontWeight: '700', color: C.white, marginBottom: 2 },
  userEmail: { fontSize: 13, color: C.gray400, marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: C.amber400 },
  sectionCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: C.gray200,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  infoLabel: { fontSize: 11, color: C.gray500 },
  infoVal: { fontSize: 13, fontWeight: '600', color: C.gray900, marginTop: 1 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray800 },
  passWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, backgroundColor: C.gray50, paddingHorizontal: 12,
  },
  passInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: C.gray900 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.amber500, borderRadius: 12, paddingVertical: 14, marginTop: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: C.gray900 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.red50, borderWidth: 1, borderColor: C.red200,
    borderRadius: 14, paddingVertical: 14, marginTop: 6,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: C.red600 },
});
