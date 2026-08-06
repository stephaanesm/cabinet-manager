/**
 * src/app/register.tsx
 * Inscription Avocat avec :
 *   1. Saisie de toutes les informations (Nom, Prénom, Email, Tél, DDN, Mot de passe, Confirmation)
 *   2. Envoi & Saisie du code de vérification OTP par email
 *   3. Pop-up Calendrier pour la date de naissance
 *   4. Validation de la confirmation du mot de passe
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, User, Mail, Lock, Phone, Calendar,
  Eye, EyeOff, ChevronRight, ShieldCheck, KeyRound, ChevronLeft, X, MailCheck, RotateCcw,
} from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';
import api, { extractErrorMessage } from '@/lib/api';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type Step = 'form' | 'otp' | 'success';

export default function RegisterScreen() {
  const router = useRouter();

  // Champs du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // États du flux
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  // Modale Pop-up Calendrier
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(1990);
  const [calMonth, setCalMonth] = useState(0);

  // ── ÉTAPE 1 : Validation des infos & Envoi du code OTP ────────────────────
  const handleValidateFormAndSendCode = async () => {
    setError('');

    // Validation des champs
    if (!nom.trim()) {
      setError('Le nom de famille est obligatoire.');
      return;
    }
    if (!prenom.trim()) {
      setError('Le prénom est obligatoire.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!telephone.trim()) {
      setError('Le numéro de téléphone est obligatoire.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas. Veuillez vérifier.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/send-code', { email: cleanEmail });
      setStep('otp');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  // Renvoyer le code
  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);
    try {
      await api.post('/auth/send-code', { email: email.trim().toLowerCase() });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsResending(false);
    }
  };

  // ── ÉTAPE 2 : Saisie du code OTP & Création définitive du compte ──────────
  const handleVerifyCodeAndRegister = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Veuillez saisir le code de vérification à 6 chiffres.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Vérification du code OTP
      await api.post('/auth/verify-code', {
        email: cleanEmail,
        code: otpCode.trim(),
      });

      // 2. Création du compte en base
      await api.post('/auth/register', {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: cleanEmail,
        telephone: telephone.trim(),
        dateNaissance: dateNaissance.trim() || undefined,
        motDePasse: password,
        role: 'Avocat',
      });

      setStep('success');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  // Fonctions Calendrier
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleSelectDay = (day: number) => {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    const formattedMonth = calMonth + 1 < 10 ? `0${calMonth + 1}` : `${calMonth + 1}`;
    setDateNaissance(`${formattedDay}/${formattedMonth}/${calYear}`);
    setShowCalendar(false);
  };

  // ── ÉCRAN DE SUCCÈS ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <View style={s.successWrap}>
            <View style={s.successBadgeWrap}>
              <View style={s.successIconInner}>
                <ShieldCheck color={C.gray900} size={48} />
              </View>
            </View>
            <Text style={s.successTitle}>Compte Avocat Créé !</Text>
            <Text style={s.successDesc}>
              Votre adresse email <Text style={{ color: C.amber400, fontWeight: '700' }}>{email}</Text> a été vérifiée et votre compte a été créé avec succès.
            </Text>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Se connecter à mon compte</Text>
              <ChevronRight color={C.gray900} size={20} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── ÉTAPE 2 : SAISIE DU CODE DE VÉRIFICATION OTP ──────────────────────────
  if (step === 'otp') {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

              {/* Header */}
              <View style={s.header}>
                <TouchableOpacity onPress={() => { setStep('form'); setError(''); }} style={s.backBtn} activeOpacity={0.7}>
                  <ArrowLeft color={C.gray400} size={20} />
                  <Text style={s.backText}>Modifier mes informations</Text>
                </TouchableOpacity>
              </View>

              {/* OTP Card */}
              <View style={s.otpCard}>
                <View style={s.otpIconWrap}>
                  <MailCheck color={C.amber400} size={36} />
                </View>
                <Text style={s.otpTitle}>Vérifiez votre email</Text>
                <Text style={s.otpDesc}>
                  Un code de vérification à 6 chiffres a été envoyé à :
                </Text>
                <Text style={s.otpEmail}>{email}</Text>
                <Text style={[s.otpDesc, { marginTop: 2 }]}>
                  Vérifiez votre boîte de réception (et vos spams).
                </Text>
              </View>

              {resendSuccess && (
                <View style={s.successToast}>
                  <Text style={s.successToastText}>✓ Nouveau code d'activation envoyé avec succès.</Text>
                </View>
              )}

              {/* Input OTP */}
              <View style={s.form}>
                <View style={s.field}>
                  <View style={s.fieldLabelRow}>
                    <Text style={s.label}>Code de vérification *</Text>
                    <TouchableOpacity onPress={handleResendOtp} disabled={isResending} activeOpacity={0.7}>
                      <Text style={s.resendLink}>
                        {isResending ? 'Envoi...' : 'Renvoyer le code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[s.inputWrap, s.otpInputWrap]}>
                    <KeyRound color={C.amber400} size={22} />
                    <TextInput
                      style={s.otpInput}
                      value={otpCode}
                      onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      placeholderTextColor={C.gray600}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                {error ? (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[s.primaryBtn, isLoading && { opacity: 0.65 }]}
                  onPress={handleVerifyCodeAndRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.gray900} />
                  ) : (
                    <>
                      <Text style={s.primaryBtnText}>Créer un compte</Text>
                      <ChevronRight color={C.gray900} size={20} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ── ÉTAPE 1 : SAISIE DE TOUTES LES INFORMATIONS ───────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
                <ArrowLeft color={C.gray400} size={20} />
                <Text style={s.backText}>Connexion</Text>
              </TouchableOpacity>
              <Text style={s.headerTitle}>Créer un Compte Avocat</Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Title */}
            <View style={s.introWrap}>
              <Text style={s.title}>Rejoignez le Cabinet</Text>
              <Text style={s.subtitle}>
                Remplissez vos informations personnelles. Un code de vérification vous sera envoyé par email.
              </Text>
            </View>

            {/* Formulaire complet */}
            <View style={s.form}>

              {/* Nom */}
              <View style={s.field}>
                <Text style={s.label}>Nom de famille *</Text>
                <View style={s.inputWrap}>
                  <User color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={nom}
                    onChangeText={setNom}
                    placeholder="Ex: Dupont"
                    placeholderTextColor={C.gray500}
                  />
                </View>
              </View>

              {/* Prénom */}
              <View style={s.field}>
                <Text style={s.label}>Prénom *</Text>
                <View style={s.inputWrap}>
                  <User color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={prenom}
                    onChangeText={setPrenom}
                    placeholder="Ex: Jean"
                    placeholderTextColor={C.gray500}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Adresse Email Professionnelle *</Text>
                <View style={s.inputWrap}>
                  <Mail color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="avocat@cabinet.cm"
                    placeholderTextColor={C.gray500}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Téléphone */}
              <View style={s.field}>
                <Text style={s.label}>Numéro de Téléphone *</Text>
                <View style={s.inputWrap}>
                  <Phone color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={telephone}
                    onChangeText={setTelephone}
                    placeholder="+237 6XX XX XX XX"
                    placeholderTextColor={C.gray500}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Date de naissance avec Pop-up Calendrier */}
              <View style={s.field}>
                <Text style={s.label}>Date de Naissance (Optionnel)</Text>
                <TouchableOpacity
                  style={s.inputWrap}
                  onPress={() => setShowCalendar(true)}
                  activeOpacity={0.8}
                >
                  <Calendar color={C.amber400} size={18} />
                  <Text style={[s.input, !dateNaissance && { color: C.gray500 }]}>
                    {dateNaissance || 'Sélectionner une date (JJ/MM/AAAA)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mot de passe */}
              <View style={s.field}>
                <Text style={s.label}>Mot de Passe *</Text>
                <View style={s.inputWrap}>
                  <Lock color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.gray500}
                    secureTextEntry={!showPwd}
                  />
                  <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ padding: 4 }}>
                    {showPwd ? <EyeOff color={C.gray400} size={18} /> : <Eye color={C.gray400} size={18} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* CHAMP : Confirmation du mot de passe */}
              <View style={s.field}>
                <Text style={s.label}>Confirmer le Mot de Passe *</Text>
                <View style={s.inputWrap}>
                  <Lock color={C.gray400} size={18} />
                  <TextInput
                    style={s.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.gray500}
                    secureTextEntry={!showConfirmPwd}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)} style={{ padding: 4 }}>
                    {showConfirmPwd ? <EyeOff color={C.gray400} size={18} /> : <Eye color={C.gray400} size={18} />}
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Bouton Suivant */}
              <TouchableOpacity
                style={[s.primaryBtn, isLoading && { opacity: 0.65 }]}
                onPress={handleValidateFormAndSendCode}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={C.gray900} />
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Continuer</Text>
                    <ChevronRight color={C.gray900} size={20} />
                  </>
                )}
              </TouchableOpacity>

            </View>

            {/* Lien Connexion */}
            <TouchableOpacity style={s.loginLinkWrap} onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={s.loginLinkText}>
                Vous avez déjà un compte ? <Text style={s.loginLinkBold}>Se connecter</Text>
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── MODALE POP-UP CALENDRIER ───────────────────────────────────────── */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.calendarCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Date de Naissance</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)} style={s.closeBtn}>
                <X color={C.gray400} size={20} />
              </TouchableOpacity>
            </View>

            {/* Nav Mois/Année */}
            <View style={s.calendarNavRow}>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else { setCalMonth(m => m - 1); }
                }}
                style={s.navBtn}
              >
                <ChevronLeft color={C.white} size={20} />
              </TouchableOpacity>

              <View style={s.monthYearWrap}>
                <Text style={s.monthYearText}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else { setCalMonth(m => m + 1); }
                }}
                style={s.navBtn}
              >
                <ChevronRight color={C.white} size={20} />
              </TouchableOpacity>
            </View>

            {/* Sélecteur d'Année */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.yearScrollView} contentContainerStyle={s.yearScrollContainer}>
              {Array.from({ length: 70 }, (_, i) => 2010 - i).map((yr) => (
                <TouchableOpacity
                  key={yr}
                  onPress={() => setCalYear(yr)}
                  style={[s.yearChip, yr === calYear && s.yearChipActive]}
                >
                  <Text style={[s.yearChipText, yr === calYear && s.yearChipTextActive]}>{yr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* En-têtes Semaine */}
            <View style={s.daysHeaderRow}>
              {DAYS_OF_WEEK.map((d, i) => (
                <Text key={i} style={s.dayHeaderCell}>{d}</Text>
              ))}
            </View>

            {/* Jours */}
            <View style={s.daysGrid}>
              {Array.from({ length: getFirstDayOffset(calYear, calMonth) }).map((_, i) => (
                <View key={`empty-${i}`} style={s.dayCellEmpty} />
              ))}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                const dayNum = i + 1;
                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    style={s.dayCell}
                    onPress={() => handleSelectDay(dayNum)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.dayCellText}>{dayNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F17' },
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 140, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  backText: { fontSize: 13, color: C.gray400, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  introWrap: { gap: 4 },
  title: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.gray400, lineHeight: 19 },

  form: { gap: 14, marginTop: 8 },
  field: { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', color: C.gray300 },
  resendLink: { fontSize: 12, color: C.amber400, fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: C.white },

  otpCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  otpIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  otpTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  otpDesc: { fontSize: 13, color: C.gray400, textAlign: 'center' },
  otpEmail: { fontSize: 15, fontWeight: '700', color: C.amber400 },

  otpInputWrap: {
    backgroundColor: '#161F30',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  otpInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: C.white,
  },

  errorBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: C.red400, fontSize: 13, textAlign: 'center', fontWeight: '500' },

  successToast: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  successToastText: { color: '#34D399', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.amber500,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: C.amber500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: C.gray900 },

  loginLinkWrap: { alignItems: 'center', marginTop: 14 },
  loginLinkText: { fontSize: 13, color: C.gray400 },
  loginLinkBold: { fontWeight: '700', color: C.amber400 },

  // Succès
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 },
  successBadgeWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.amber500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: C.white, textAlign: 'center' },
  successDesc: { fontSize: 14, color: C.gray400, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  // Modale Calendrier
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#131B2A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  closeBtn: { padding: 4 },

  calendarNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 10 },
  monthYearWrap: { alignItems: 'center' },
  monthYearText: { fontSize: 15, fontWeight: '700', color: C.amber400 },

  yearScrollView: { maxHeight: 36 },
  yearScrollContainer: { gap: 8, paddingHorizontal: 4 },
  yearChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#1E293B' },
  yearChipActive: { backgroundColor: C.amber500 },
  yearChipText: { fontSize: 12, color: C.gray300, fontWeight: '600' },
  yearChipTextActive: { color: C.gray900, fontWeight: '800' },

  daysHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dayHeaderCell: { width: '13%', textAlign: 'center', fontSize: 11, color: C.gray400, fontWeight: '700' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCellEmpty: { width: '14.28%', height: 40 },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellText: { fontSize: 14, color: C.white, fontWeight: '600' },
});
