/**
 * src/app/register.tsx
 * Page d'inscription — crée un compte utilisateur dans le cabinet.
 * Accessible uniquement depuis la page de connexion.
 */
import { AppColors as C } from '@/constants/theme';
import { extractErrorMessage } from '@/hooks/useAuth';
import api from '@/lib/api';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Briefcase, ChevronRight, Eye, EyeOff, Mail, User,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Role = 'Avocat' | 'Assistant' | 'Associe';

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'Avocat',     label: 'Avocat',     desc: 'Accès aux dossiers assignés' },
  { value: 'Assistant',  label: 'Assistant',  desc: 'Support et gestion documentaire' },
  { value: 'Associe',    label: 'Associé',    desc: 'Accès étendu au cabinet' },
];

export default function RegisterScreen() {
  const router = useRouter();

  const [nom, setNom]               = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [role, setRole]             = useState<Role>('Avocat');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const validate = (): string | null => {
    if (!nom.trim())   return 'Le nom complet est requis.';
    if (!email.trim()) return 'L\'adresse email est requise.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Adresse email invalide.';
    if (password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
    if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.';
    if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.';
    if (password !== confirmPwd) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/register', { nom: nom.trim(), email: email.trim().toLowerCase(), motDePasse: password, role });
      setSuccess(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <View style={s.successWrap}>
            <View style={s.successIcon}>
              <User color={C.gray900} size={40} />
            </View>
            <Text style={s.successTitle}>Compte créé avec succès !</Text>
            <Text style={s.successDesc}>
              Votre demande a été enregistrée. Un administrateur du cabinet activera votre compte.
              Vous recevrez une notification par email.
            </Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/login')} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Retour à la connexion</Text>
              <ChevronRight color={C.gray900} size={18} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                <ArrowLeft color={C.gray400} size={20} />
              </TouchableOpacity>
              <View style={s.logoBox}>
                <Briefcase color={C.gray900} size={32} />
              </View>
              <Text style={s.title}>Créer un compte</Text>
              <Text style={s.subtitle}>Rejoignez votre cabinet sur Cabinet Manager</Text>
            </View>

            <View style={s.form}>

              {/* Nom */}
              <View style={s.field}>
                <Text style={s.label}>Nom complet</Text>
                <View style={s.inputRow}>
                  <User color={C.gray500} size={18} style={s.inputIcon} />
                  <TextInput
                    style={s.inputFlex}
                    value={nom}
                    onChangeText={setNom}
                    placeholder="Jean Dupont"
                    placeholderTextColor={C.gray500}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Adresse email</Text>
                <View style={s.inputRow}>
                  <Mail color={C.gray500} size={18} style={s.inputIcon} />
                  <TextInput
                    style={s.inputFlex}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nom@cabinet.cm"
                    placeholderTextColor={C.gray500}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Rôle */}
              <View style={s.field}>
                <Text style={s.label}>Rôle dans le cabinet</Text>
                <View style={s.roleGrid}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[s.roleCard, role === r.value && s.roleCardActive]}
                      onPress={() => setRole(r.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.roleLabel, role === r.value && s.roleLabelActive]}>{r.label}</Text>
                      <Text style={[s.roleDesc, role === r.value && s.roleDescActive]}>{r.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mot de passe */}
              <View style={s.field}>
                <Text style={s.label}>Mot de passe</Text>
                <View style={s.passWrap}>
                  <TextInput
                    style={s.passInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.gray500}
                    secureTextEntry={!showPwd}
                    autoComplete="new-password"
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={s.eyeBtn}>
                    {showPwd ? <EyeOff color={C.gray400} size={20} /> : <Eye color={C.gray400} size={20} />}
                  </TouchableOpacity>
                </View>
                <Text style={s.hint}>8+ caractères, 1 majuscule, 1 chiffre</Text>
              </View>

              {/* Confirmation */}
              <View style={s.field}>
                <Text style={s.label}>Confirmer le mot de passe</Text>
                <View style={s.passWrap}>
                  <TextInput
                    style={s.passInput}
                    value={confirmPwd}
                    onChangeText={setConfirmPwd}
                    placeholder="••••••••"
                    placeholderTextColor={C.gray500}
                    secureTextEntry={!showConfirm}
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eyeBtn}>
                    {showConfirm ? <EyeOff color={C.gray400} size={20} /> : <Eye color={C.gray400} size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Erreur */}
              {error !== '' && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Bouton */}
              <TouchableOpacity
                style={[s.primaryBtn, (isLoading || !nom || !email || !password || !confirmPwd) && s.btnDisabled]}
                onPress={handleRegister}
                disabled={isLoading || !nom || !email || !password || !confirmPwd}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color={C.gray900} />
                  : <>
                      <Text style={s.primaryBtnText}>Créer mon compte</Text>
                      <ChevronRight color={C.gray900} size={18} />
                    </>}
              </TouchableOpacity>

              {/* Lien vers login */}
              <View style={s.loginRow}>
                <Text style={s.loginText}>Déjà un compte ? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text style={s.loginLink}>Se connecter</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray900 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginTop: 8, marginBottom: 32 },
  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 16 },
  logoBox: {
    width: 72, height: 72, backgroundColor: C.amber500, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: C.amber500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  title: { fontSize: 26, fontWeight: '700', color: C.white, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.gray400, textAlign: 'center' },

  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: C.gray300 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  inputIcon: { marginRight: 10 },
  inputFlex: { flex: 1, fontSize: 15, color: C.white },

  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 12, overflow: 'hidden',
  },
  passInput: { flex: 1, fontSize: 15, color: C.white, paddingHorizontal: 16, paddingVertical: 14 },
  eyeBtn: { paddingHorizontal: 14 },
  hint: { fontSize: 12, color: C.gray500, marginTop: 2 },

  roleGrid: { gap: 8 },
  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  roleCardActive: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: C.amber500,
  },
  roleLabel: { fontSize: 14, fontWeight: '600', color: C.gray300 },
  roleLabelActive: { color: C.amber400 },
  roleDesc: { fontSize: 12, color: C.gray500, marginTop: 2 },
  roleDescActive: { color: C.amber600 },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 14,
  },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: C.amber500, borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.amber500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: C.gray900 },
  btnDisabled: { opacity: 0.5 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: C.gray400 },
  loginLink: { fontSize: 14, color: C.amber400, fontWeight: '600' },

  // Success state
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 20 },
  successIcon: {
    width: 96, height: 96, backgroundColor: C.amber500, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.amber500, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: C.white, textAlign: 'center' },
  successDesc: { fontSize: 15, color: C.gray400, textAlign: 'center', lineHeight: 22 },
});
