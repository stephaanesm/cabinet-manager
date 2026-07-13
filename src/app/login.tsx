import { AppColors as C } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Eye, EyeOff, Lock, Settings, Shield } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'credentials' | '2fa';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code2fa, setCode2fa] = useState('');
  const [use2fa, setUse2fa] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentials = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (use2fa) {
        setStep('2fa');
      } else {
        router.replace('/(tabs)');
      }
    }, 800);
  };

  const handle2FA = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (code2fa.length === 6) {
        router.replace('/(tabs)');
      } else {
        setError('Code invalide. Veuillez réessayer.');
      }
    }, 600);
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={s.logoWrap}>
              <View style={s.logoBox}>
                <Lock color={C.gray900} size={40} />
              </View>
              <Text style={s.appTitle}>Cabinet Manager</Text>
              <Text style={s.appSub}>Gestion d'Affaires Juridiques</Text>
            </View>

            {step === 'credentials' ? (
              <View style={s.form}>
                <View style={s.field}>
                  <Text style={s.label}>Email</Text>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="nom@cabinet.cm"
                    placeholderTextColor={C.gray500}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Mot de passe</Text>
                  <View style={s.passWrap}>
                    <TextInput
                      style={[s.input, { flex: 1, borderWidth: 0 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={C.gray500}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                      {showPassword
                        ? <EyeOff color={C.gray400} size={20} />
                        : <Eye color={C.gray400} size={20} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2FA toggle */}
                <View style={s.toggleRow}>
                  <Shield color={C.amber400} size={18} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.toggleTitle}>Vérification en 2 étapes</Text>
                    <Text style={s.toggleSub}>Recommandé pour la sécurité</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setUse2fa(!use2fa)}
                    style={[s.switch, use2fa && s.switchOn]}
                    activeOpacity={0.8}
                  >
                    <View style={[s.switchThumb, use2fa && s.switchThumbOn]} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.forgotBtn}>
                  <Text style={s.forgotText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>

                {error !== '' && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

                <TouchableOpacity
                  style={[s.primaryBtn, isLoading && s.btnDisabled]}
                  onPress={handleCredentials}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading
                    ? <ActivityIndicator color={C.gray900} />
                    : <>
                        <Text style={s.primaryBtnText}>Se connecter</Text>
                        <ChevronRight color={C.gray900} size={18} />
                      </>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.form}>
                <TouchableOpacity onPress={() => setStep('credentials')} style={s.backBtn}>
                  <ArrowLeft color={C.gray400} size={18} />
                  <Text style={s.backText}>Retour</Text>
                </TouchableOpacity>

                <View style={s.tfaCard}>
                  <View style={s.tfaIconWrap}>
                    <Shield color={C.amber400} size={28} />
                  </View>
                  <Text style={s.tfaTitle}>Vérification en 2 étapes</Text>
                  <Text style={s.tfaDesc}>
                    Un code à 6 chiffres a été envoyé par SMS au numéro associé à votre compte.
                  </Text>
                </View>

                <View style={s.field}>
                  <Text style={[s.label, { textAlign: 'center' }]}>Entrez le code reçu</Text>
                  <TextInput
                    style={[s.input, s.codeInput]}
                    value={code2fa}
                    onChangeText={t => setCode2fa(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="_ _ _ _ _ _"
                    placeholderTextColor={C.gray600}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                {error !== '' && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

                <TouchableOpacity
                  style={[s.primaryBtn, (isLoading || code2fa.length < 6) && s.btnDisabled]}
                  onPress={handle2FA}
                  disabled={isLoading || code2fa.length < 6}
                  activeOpacity={0.85}
                >
                  {isLoading
                    ? <ActivityIndicator color={C.gray900} />
                    : <Text style={s.primaryBtnText}>Vérifier et accéder</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={s.resendBtn}>
                  <Text style={s.forgotText}>Renvoyer le code (dans 45s)</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.footer}>
              <Text style={s.footerText}>Cabinet d'Avocats • Cameroun</Text>
              <Text style={s.footerVersion}>Version 1.0.0 • Données chiffrées TLS</Text>
              {/* Accès Administrateur */}
              <TouchableOpacity
                style={s.adminLink}
                onPress={() => router.replace('/admin' as any)}
                activeOpacity={0.7}
              >
                <Settings color={C.red500} size={14} />
                <Text style={s.adminLinkText}>Accès Administrateur</Text>
              </TouchableOpacity>
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  logoWrap: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logoBox: {
    width: 80, height: 80,
    backgroundColor: C.amber500,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: C.amber500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  appTitle: { fontSize: 28, fontWeight: '700', color: C.white, marginBottom: 4 },
  appSub: { fontSize: 14, color: C.amber400 },
  form: { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: C.gray300 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.white,
  },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12, overflow: 'hidden',
  },
  eyeBtn: { paddingHorizontal: 12 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 12,
  },
  toggleTitle: { fontSize: 14, fontWeight: '500', color: C.white },
  toggleSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
  switch: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: C.gray600,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  switchOn: { backgroundColor: C.amber500 },
  switchThumb: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.white,
  },
  switchThumbOn: { alignSelf: 'flex-end' },
  forgotBtn: { alignSelf: 'flex-start' },
  forgotText: { fontSize: 14, color: C.amber400 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, padding: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: C.amber500,
    borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.amber500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: C.gray900 },
  btnDisabled: { opacity: 0.6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, color: C.gray400 },
  tfaCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 20, padding: 20, alignItems: 'center',
  },
  tfaIconWrap: {
    width: 56, height: 56,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  tfaTitle: { fontSize: 18, fontWeight: '700', color: C.white, marginBottom: 8 },
  tfaDesc: { fontSize: 14, color: C.gray400, textAlign: 'center', lineHeight: 20 },
  codeInput: {
    textAlign: 'center', fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 12, color: C.white,
  },
  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  footer: { alignItems: 'center', marginTop: 32 },
  footerText: { fontSize: 13, color: C.gray400 },
  footerVersion: { fontSize: 11, color: C.gray600, marginTop: 4 },
  adminLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 6 },
  adminLinkText: { fontSize: 12, color: C.red500, fontWeight: '500' },
});
