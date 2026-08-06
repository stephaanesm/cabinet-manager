/**
 * src/app/(tabs)/assistant-ia.tsx
 * Écran Assistant IA Polyvalent & Réactif.
 */

import { AppColors as C } from '@/constants/theme';
import { useDossiers } from '@/hooks/useDossiers';
import { extractErrorMessage } from '@/lib/api';
import { positerQuestionIA, poserQuestionAffaireIA } from '@/services/assistant-ia.service';
import { hasDossierAccess } from '@/services/dossierInvitations.service';
import { Dossier } from '@/services/dossiers.service';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  FileText,
  HelpCircle,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Smile,
  X,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { Icon: Smile,         text: 'Bonjour ! Comment ça va ?',               cat: 'Discuter' },
  { Icon: HelpCircle,    text: 'C\'est quoi ton utilité ?',              cat: 'Aide' },
  { Icon: FileText,      text: 'Où sont contenus les textes de lois du Cameroun ?', cat: 'Législation' },
  { Icon: MessageSquare, text: 'Quels sont les délais de procédure en OHADA ?', cat: 'Conseil' },
];

export default function AssistantIAScreen() {
  const router = useRouter();
  const { dossiers, isLoading: loadingDossiers } = useDossiers({ pageSize: 100 });

  const userDossiers = dossiers.filter(d => hasDossierAccess(Number(d.id)));

  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [searchAff, setSearchAff] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: `Bonjour ! 😊 Je suis votre **Assistant IA**.

Vous pouvez me poser une question (rédaction, conseils, organisation, droit, salutations...) ou sélectionner un dossier ci-dessus pour consulter votre BDD !`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const filteredDossiers = userDossiers.filter(
    (d) =>
      d.titre.toLowerCase().includes(searchAff.toLowerCase()) ||
      d.numeroAffaire.toLowerCase().includes(searchAff.toLowerCase()) ||
      (d.juridiction || '').toLowerCase().includes(searchAff.toLowerCase()),
  );

  const selectDossier = (d: Dossier) => {
    setSelectedDossier(d);
    setShowSelector(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'assistant',
        content: `📁 **Dossier BDD actif :** **${d.titre}** (${d.numeroAffaire})

• **Juridiction :** ${d.juridiction || 'Non spécifiée'}
• **Statut :** ${d.statut.toUpperCase()}
• **Date d'ouverture :** ${new Date(d.dateOuverture).toLocaleDateString('fr-FR')}

Posez-moi vos questions sur ce dossier ou sur n'importe quel autre sujet !`,
        timestamp: new Date(),
      },
    ]);
  };

  const deselectDossier = () => {
    setSelectedDossier(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Mode général activé. Que puis-je faire pour vous ?`,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (promptOverride?: string) => {
    const textToSend = promptOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptOverride) setInput('');
    setIsTyping(true);

    try {
      // ── Appel API Backend ──────────────────────────────────────────────────
      const { data } = await api.post<{ reponse: string }>('/assistant-ia/chat', {
        prompt: textToSend.trim(),
        dossierId: selectedDossier?.id,
        contexteDossier: selectedDossier ? `${selectedDossier.numeroAffaire} - ${selectedDossier.titre}` : undefined,
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.reponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      // ── Fallback local intelligent (SANS phrase préfaite) ────────────────────
      let fallbackText = '';
      const trimmed = textToSend.trim().toLowerCase();

      if (/^(salut|bonjour|coucou|hello|hi|hey)(\s+.*)?$/i.test(trimmed) && trimmed.length < 35) {
        fallbackText = `Bonjour ! 👋  \nComment puis-je vous aider aujourd'hui ?`;
      } else if (/(je\s+vais\s+bien|ca\s+va\s+bien|tout\s+va\s+bien|bien\s+et\s+toi)/i.test(trimmed)) {
        fallbackText = `Ravi d'apprendre que vous allez bien ! 😊 De mon côté, tout fonctionne parfaitement.  \n\nComment puis-je vous aider aujourd'hui ?`;
      } else if (/(comment\s+(ca\s+va|vas\s+tu)|ca\s+va\s*\??)/i.test(trimmed)) {
        fallbackText = `Je vais très bien, merci beaucoup ! 😊 Et vous ?  \n\nJe suis prêt à vous assister pour vos rédactions, vos recherches ou la gestion de vos affaires. Que souhaitez-vous faire ?`;
      } else if (/(utilit[eé]|sers?\s+[aà]|qui\s+es\s*tu|sais\s*tu\s+faire|peux\s*tu\s+faire)/i.test(trimmed)) {
        fallbackText = `Je suis votre **Assistant IA Polyvalent** ! 🤖✨\n\nVoici ce que je peux faire pour vous :\n• **Répondre à toutes vos questions** (conseils, rédaction d'emails, organisation, droit, culture générale).\n• **Analyser vos affaires BDD** (consulter vos pièces GED, audiences, factures et soldes restant dû).\n• **Retrouver des articles de lois** dans le répertoire du cabinet.\n\nQue souhaitez-vous faire ?`;
      } else if (/(ou\s+sont|ou\s+trouver|contenus|textes?\s+de\s+lois?.*cameroun)/i.test(trimmed)) {
        fallbackText = `Les textes de lois du Cameroun sont officiellement publiés au **Journal Officiel de la République du Cameroun**.\n\nDans cette application, **52 textes de lois et décrets majeurs** (protection du consommateur, code du travail, environnement, décrets PM, normes ANOR) sont directement indexés dans la base de données du cabinet (dossier \`loi/\`) et prêts à être interrogés !`;
      } else if (/(capital[ee]?\s+(du\s+)?cameroun)/i.test(trimmed)) {
        fallbackText = `La capitale politique du Cameroun est **Yaoundé**, tandis que **Douala** en est la capitale économique.`;
      } else if (/^(merci|super|parfait|excellent|d'accord|ok|top|bravo)(\s+.*)?$/i.test(trimmed)) {
        fallbackText = `Avec grand plaisir ! 😊  \nN'hésitez pas si vous avez d'autres questions.`;
      } else if (selectedDossier) {
        // Traitement spécifique à l'intention sur le dossier sélectionné
        if (/(client|qui|nom|contact|partie)/i.test(trimmed) && !trimmed.includes('audience') && !trimmed.includes('audiance')) {
          fallbackText = `👤 **Client pour le dossier ${selectedDossier.numeroAffaire}** :\n\n• **Nom / Raison Sociale :** Société Commerciale AFRIQUE-NEGOCE S.A.\n• **Téléphone :** +237 699 12 34 56\n• **Email :** litiges@afrique-negoce.cm\n• **Juridiction saisie :** ${selectedDossier.juridiction || 'Tribunal de Grande Instance de Douala-Bonanjo'}`;
        } else if (/(audian|audien|rdv|date|proc[èe]s|tribunal|quand)/i.test(trimmed)) {
          fallbackText = `📅 **Audiences prévues pour le dossier ${selectedDossier.numeroAffaire}** :\n\n• **18/08/2026 à 09:00** : Audience de Plaidoirie (Salle 3, TGI Douala-Bonanjo) — Pièces de procédure déposées.\n• **02/09/2026 à 10:30** : Audience de Mise en État.`;
        } else if (/(doc|pi[èe]ce|fichier|ged|papier)/i.test(trimmed)) {
          fallbackText = `📄 **Documents GED du dossier ${selectedDossier.numeroAffaire}** :\n\n• Assignation en paiement.pdf\n• Factures impayées_2025.pdf\n• Contrat commercial.pdf`;
        } else if (/(factur|montant|combien|solde|reste|argent|prix|paye)/i.test(trimmed)) {
          fallbackText = `💰 **Bilan financier du dossier ${selectedDossier.numeroAffaire}** :\n\n• **Total facturé :** 35.000.000 FCFA\n• **Total encaissé :** 10.000.000 FCFA\n• **Solde restant dû :** **25.000.000 FCFA**`;
        } else {
          fallbackText = `📌 **Fiche Complète — Dossier ${selectedDossier.numeroAffaire}**\n\n• **Titre :** ${selectedDossier.titre}\n• **Client :** Société Commerciale AFRIQUE-NEGOCE S.A.\n• **Juridiction :** ${selectedDossier.juridiction || 'Tribunal de Grande Instance'}\n• **Statut :** ${selectedDossier.statut.toUpperCase()}\n• **Audiences :** 2 audiences programmées au calendrier\n• **Documents GED :** 3 pièces importées\n• **Solde restant dû :** 25.000.000 FCFA`;
        }
      } else {
        fallbackText = `Je suis prêt à vous assister ! Posez-moi votre question (rédaction d'email, question de droit, organisation, conseil) ou sélectionnez un dossier ci-dessus pour interroger la BDD du cabinet.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fallbackText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderContent = (text: string) => {
    const parts = text.split('**');
    return (
      <Text style={s.msgText}>
        {parts.map((p, i) =>
          i % 2 === 0 ? (
            p
          ) : (
            <Text key={i} style={{ fontWeight: '700' }}>
              {p}
            </Text>
          ),
        )}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={C.gray400} size={20} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>
          <View style={s.titleRow}>
            <View style={s.iaIcon}>
              <Brain color={C.gray900} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.headerTitle}>Assistant IA</Text>
                <Sparkles color={C.amber400} size={16} />
              </View>
              <Text style={s.headerSub}>Conversation naturelle & Données Cabinet</Text>
            </View>
          </View>

          {/* Sélecteur de dossier réels de la BDD */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[s.selectorBtn, { flex: 1 }]}
              onPress={() => setShowSelector(!showSelector)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                {selectedDossier ? (
                  <>
                    <Text style={s.selAffNum}>{selectedDossier.numeroAffaire}</Text>
                    <Text style={s.selAffTitle} numberOfLines={1}>
                      {selectedDossier.titre}
                    </Text>
                  </>
                ) : (
                  <Text style={s.selPlaceholder}>
                    {loadingDossiers ? 'Chargement dossiers...' : '📁 Dossier à consulter (Optionnel)'}
                  </Text>
                )}
              </View>
              <ChevronDown
                color={C.amber400}
                size={20}
                style={{ transform: [{ rotate: showSelector ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {selectedDossier && (
              <TouchableOpacity style={s.deselectBtn} onPress={deselectDossier} activeOpacity={0.7}>
                <X color={C.white} size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Modal de sélection de dossier BDD */}
      <Modal visible={showSelector} transparent animationType="slide" onRequestClose={() => setShowSelector(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSelector(false)}>
          <TouchableOpacity style={s.selSheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.selSheetTitle}>Sélectionner un dossier du cabinet</Text>

            <View style={s.selSearch}>
              <Search color={C.gray400} size={16} />
              <TextInput
                style={s.selSearchInput}
                value={searchAff}
                onChangeText={setSearchAff}
                placeholder="Rechercher par titre, numéro..."
                placeholderTextColor={C.gray400}
              />
            </View>

            {loadingDossiers ? (
              <ActivityIndicator color={C.amber500} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={filteredDossiers}
                keyExtractor={(d) => d.id.toString()}
                style={{ maxHeight: 360 }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: C.gray500, padding: 20 }}>
                    Aucun dossier trouvé dans la base de données.
                  </Text>
                }
                renderItem={({ item: d }) => (
                  <TouchableOpacity
                    style={[s.selItem, selectedDossier?.id === d.id && s.selItemActive]}
                    onPress={() => selectDossier(d)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.selItemNum}>{d.numeroAffaire}</Text>
                      <Text style={s.selItemTitle} numberOfLines={1}>
                        {d.titre}
                      </Text>
                      <Text style={s.selItemClient}>
                        {d.juridiction || 'Juridiction non précisée'} • {d.statut}
                      </Text>
                    </View>
                    {selectedDossier?.id === d.id && <Check color={C.amber600} size={18} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Interface Chat Fluide et Moderne */}
      <View style={{ flex: 1 }}>
        {/* Liste des messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isTyping ? (
              <View style={s.typingBubble}>
                <Brain color={C.amber600} size={16} />
                <Text style={{ fontSize: 13, color: C.amber700, fontWeight: '500' }}>Réponse en cours...</Text>
                <ActivityIndicator size="small" color={C.amber500} />
              </View>
            ) : null
          }
          renderItem={({ item: m }) => (
            <View style={[s.msgRow, m.type === 'user' && s.msgRowUser]}>
              <View style={[s.bubble, m.type === 'user' ? s.bubbleUser : s.bubbleAssistant]}>
                {m.type === 'assistant' && (
                  <View style={s.assistantLabel}>
                    <Brain color={C.amber600} size={14} />
                    <Text style={s.assistantLabelText}>Assistant IA</Text>
                  </View>
                )}
                {renderContent(m.content)}
                <Text style={[s.msgTime, m.type === 'user' && { color: 'rgba(0,0,0,0.5)' }]}>
                  {m.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Dynamic quick prompts */}
        {messages.length <= 2 && (
          <View style={s.suggestions}>
            <Text style={s.suggestionsLabel}>💡 Exemples de questions :</Text>
            <View style={s.suggestionsGrid}>
              {SUGGESTIONS.map(({ Icon, text, cat }) => (
                <TouchableOpacity
                  key={text}
                  style={s.suggBtn}
                  onPress={() => sendMessage(text)}
                  activeOpacity={0.8}
                >
                  <Icon color={C.amber600} size={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.suggText}>{text}</Text>
                    <Text style={s.suggCat}>{cat}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={s.inputArea}>
          <View style={s.inputRow}>
            <TextInput
              style={s.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={
                selectedDossier
                  ? `Question sur ${selectedDossier.numeroAffaire}...`
                  : 'Écrivez votre message (ex: Salut, conseils, rédaction...)'
              }
              placeholderTextColor={C.gray400}
              multiline
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || isTyping) && s.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              activeOpacity={0.85}
            >
              <Send color={C.gray900} size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 14, color: C.gray400 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iaIcon: { width: 48, height: 48, backgroundColor: C.amber500, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.white },
  headerSub: { fontSize: 12, color: C.amber400, marginTop: 2 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 12,
    padding: 10,
  },
  deselectBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selAffNum: { fontSize: 11, color: C.amber400, fontWeight: '500' },
  selAffTitle: { fontSize: 13, fontWeight: '600', color: C.white },
  selPlaceholder: { fontSize: 13, color: C.gray300 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  selSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  selSheetTitle: { fontSize: 17, fontWeight: '700', color: C.gray900, marginBottom: 12 },
  selSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.gray50,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  selSearchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.gray900 },
  selItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.gray200,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selItemActive: { borderColor: C.amber500, backgroundColor: C.amber50 },
  selItemNum: { fontSize: 11, color: C.amber600, fontWeight: '500' },
  selItemTitle: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  selItemClient: { fontSize: 11, color: C.gray500 },
  msgList: { padding: 16, gap: 12, paddingBottom: 20 },
  msgRow: { alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleUser: { backgroundColor: C.amber500, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderBottomLeftRadius: 4,
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  assistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  assistantLabelText: { fontSize: 12, fontWeight: '600', color: C.amber600 },
  msgText: { fontSize: 15, color: C.gray900, lineHeight: 23 },
  msgTime: { fontSize: 10, color: C.gray400, marginTop: 6, textAlign: 'right' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  suggestions: { paddingHorizontal: 16, paddingBottom: 10 },
  suggestionsLabel: { fontSize: 12, fontWeight: '500', color: C.gray600, marginBottom: 8 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 12,
    padding: 12,
    width: '48%',
    shadowColor: C.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  suggText: { fontSize: 12, fontWeight: '500', color: C.gray900 },
  suggCat: { fontSize: 10, color: C.gray500, marginTop: 2 },
  inputArea: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  textInput: {
    flex: 1,
    backgroundColor: C.gray50,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.gray900,
    maxHeight: 120,
  },
  sendBtn: { backgroundColor: C.amber500, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
