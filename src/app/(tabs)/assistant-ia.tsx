import { AppColors as C } from '@/constants/theme';
import { affaires, audiences, documents, type Affaire } from '@/data/mockData';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    ArrowLeft,
    Brain,
    Calendar,
    Check,
    ChevronDown,
    DollarSign,
    FileText,
    Scale,
    Search,
    Send,
    Shield,
    Sparkles
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { Icon: FileText,  text: 'Résume cette affaire',                 cat: 'Analyse' },
  { Icon: Calendar,  text: 'Prépare-moi pour la prochaine audience', cat: 'Audience' },
  { Icon: Scale,     text: 'Textes légaux applicables ?',           cat: 'Législation' },
  { Icon: AlertTriangle, text: 'Analyse les risques juridiques',    cat: 'Risques' },
  { Icon: DollarSign, text: 'Évalue la stratégie financière',       cat: 'Finance' },
  { Icon: Shield,    text: 'Recommandations de défense',            cat: 'Stratégie' },
];

function generateResponse(affaire: Affaire, msg: string): string {
  const lower = msg.toLowerCase();
  const affDocs = documents.filter(d => d.affaireId === affaire.id);
  const affAud = audiences.filter(a => a.affaire.id === affaire.id);

  if (lower.includes('résum') || lower.includes('resume')) {
    return `**📋 Résumé — ${affaire.numero}**\n\n**Intitulé :** ${affaire.intitule}\n\n**Domaine :** ${affaire.domaine} (${affaire.typeAffaire})\n**Juridiction :** ${affaire.juridiction}\n**Ouverture :** ${new Date(affaire.dateOuverture).toLocaleDateString('fr-FR')}\n**Statut :** ${affaire.statut.replace('_', ' ').toUpperCase()}\n\n**Documents :** ${affDocs.length} pièce(s)\n**Audiences :** ${affAud.length}\n\n**Montant facturé :** ${((affaire.montantFacture ?? 0) / 1_000_000).toFixed(2)}M FCFA\n**Montant encaissé :** ${((affaire.montantEncaisse ?? 0) / 1_000_000).toFixed(2)}M FCFA`;
  }
  if (lower.includes('audience') || lower.includes('prépare') || lower.includes('preparez')) {
    return `**📅 Préparation audience — ${affaire.numero}**\n\n**1. Vérifier les pièces**\n• ${affDocs.length} documents au dossier\n• Numéroter et classer chronologiquement\n\n**2. Arguments à développer**\n• Domaine : ${affaire.domaine}\n• Type : ${affaire.typeAffaire}\n\n**3. Documents obligatoires**\n• ✓ Conclusions écrites\n• ✓ Bordereau des pièces\n• ✓ Pouvoirs spéciaux\n\n**Arriver 30 min avant à :** ${affaire.juridiction}`;
  }
  if (lower.includes('risque')) {
    const niveau = affaire.risqueImpaye === 'eleve' ? 'ÉLEVÉ 🚨' : affaire.risqueImpaye === 'moyen' ? 'MOYEN ⚠️' : 'FAIBLE ✅';
    return `**⚠️ Analyse des risques — ${affaire.numero}**\n\n**Risque d'impayé : ${niveau}**\n\nMontant en jeu : ${((affaire.montantFacture ?? 0) / 1_000_000).toFixed(2)}M FCFA\nReste à percevoir : ${(((affaire.montantFacture ?? 0) - (affaire.montantEncaisse ?? 0)) / 1_000_000).toFixed(2)}M FCFA\n\n**Risques procéduraux :**\n• Irrecevabilité : Faible\n• Incompétence : Faible (${affaire.juridiction})\n\n**Documents :** ${affDocs.length < 5 ? '⚠️ Dossier à renforcer' : '✅ Bien documenté'}`;
  }
  if (lower.includes('financ') || lower.includes('recouvr')) {
    const taux = affaire.montantFacture ? Math.round(((affaire.montantEncaisse ?? 0) / affaire.montantFacture) * 100) : 0;
    return `**💰 Analyse financière — ${affaire.numero}**\n\nFacturé : **${((affaire.montantFacture ?? 0) / 1_000_000).toFixed(2)}M FCFA**\nEncaissé : **${((affaire.montantEncaisse ?? 0) / 1_000_000).toFixed(2)}M FCFA**\nTaux : **${taux}%** ${taux >= 80 ? '✅ Excellent' : taux >= 50 ? '⚠️ Moyen' : '❌ Critique'}\n\n**Actions recommandées :**\n1. Relance amiable immédiate\n2. Mise en demeure si échec\n3. Procédure d'injonction de payer\n\n**Base légale :** Acte uniforme OHADA sur recouvrement`;
  }
  if (lower.includes('texte') || lower.includes('loi') || lower.includes('légal') || lower.includes('ohada')) {
    return `**📚 Textes légaux — ${affaire.domaine}**\n\n**Textes principaux :**\n• Code de Procédure Civile et Commerciale du Cameroun\n• ${affaire.domaine === 'Droit des affaires' ? 'Actes uniformes OHADA (AUDSCGIE, AUDCG)' : affaire.domaine === 'Droit du travail' ? 'Code du Travail (Loi n° 92/007 du 14 août 1992)' : 'Code Civil camerounais'}\n• Loi n° 2006/015 du 29 décembre 2006 (organisation judiciaire)\n\n**Juridiction :** ${affaire.juridiction}\n\n_Note : Consulter les textes spécifiques aux faits de votre dossier._`;
  }
  if (lower.includes('recommandation') || lower.includes('stratégie') || lower.includes('défense')) {
    return `**🎯 Recommandations stratégiques — ${affaire.numero}**\n\n**Posture :** ${affaire.typeAffaire === 'Contentieux' ? 'Contentieuse ferme' : 'Conseil préventif'}\n\n**Plan d'action (7 prochains jours) :**\n1. ✅ Audit complet du dossier\n2. ✅ Rencontre avec le client\n3. ✅ Recherches jurisprudentielles\n4. ✅ Calendrier et échéancier\n5. ✅ ${affaire.prochainRendezVous ? 'Préparer audience prochaine' : 'Programmer première audience'}\n\n**Textes :** Code de Procédure Civile\n**Objectif :** ${affaire.typeAffaire === 'Contentieux' ? 'Jugement favorable' : 'Sécurisation juridique'}`;
  }
  return `Je suis là pour vous aider sur **${affaire.intitule}** !\n\nThèmes que je peux traiter :\n• Résumé et analyse\n• Textes légaux applicables\n• Préparation d'audience\n• Analyse des risques\n• Stratégie financière\n• Recommandations de défense\n\nCliquez sur une suggestion ou posez votre question !`;
}

export default function AssistantIAScreen() {
  const router = useRouter();
  const [selectedAffaire, setSelectedAffaire] = useState<Affaire | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [searchAff, setSearchAff] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const filteredAff = affaires.filter(a =>
    a.intitule.toLowerCase().includes(searchAff.toLowerCase())
    || a.numero.toLowerCase().includes(searchAff.toLowerCase())
    || a.client.nom.toLowerCase().includes(searchAff.toLowerCase())
  );

  const selectAffaire = (a: Affaire) => {
    setSelectedAffaire(a);
    setShowSelector(false);
    setMessages([{
      id: '0',
      type: 'assistant',
      content: `Bonjour ! J'ai analysé l'affaire **${a.intitule}** (${a.numero}).\n\n📊 **Contexte :** ${documents.filter(d => d.affaireId === a.id).length} document(s) · ${audiences.filter(au => au.affaire.id === a.id).length} audience(s) · ${a.domaine}\n\nComment puis-je vous assister ?`,
      timestamp: new Date(),
    }]);
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedAffaire) return;
    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const q = input;
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const resp = generateResponse(selectedAffaire, q);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'assistant', content: resp, timestamp: new Date() }]);
      setIsTyping(false);
    }, 1200);
  };

  const renderContent = (text: string) => {
    const parts = text.split('**');
    return (
      <Text style={s.msgText}>
        {parts.map((p, i) => i % 2 === 0 ? p : <Text key={i} style={{ fontWeight: '700' }}>{p}</Text>)}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={C.gray400} size={20} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>
          <View style={s.titleRow}>
            <View style={s.iaIcon}><Brain color={C.gray900} size={22} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.headerTitle}>Assistant IA Juridique</Text>
                <Sparkles color={C.amber400} size={16} />
              </View>
              <Text style={s.headerSub}>Basé sur le droit camerounais et OHADA</Text>
            </View>
          </View>
          {/* Sélecteur d'affaire */}
          <TouchableOpacity style={s.selectorBtn} onPress={() => setShowSelector(!showSelector)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              {selectedAffaire ? (
                <>
                  <Text style={s.selAffNum}>{selectedAffaire.numero}</Text>
                  <Text style={s.selAffTitle} numberOfLines={1}>{selectedAffaire.intitule}</Text>
                  <Text style={s.selAffClient} numberOfLines={1}>{selectedAffaire.client.nom}</Text>
                </>
              ) : (
                <Text style={s.selPlaceholder}>Sélectionner une affaire</Text>
              )}
            </View>
            <ChevronDown color={C.amber400} size={20} style={{ transform: [{ rotate: showSelector ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Affaire selector modal */}
      <Modal visible={showSelector} transparent animationType="slide" onRequestClose={() => setShowSelector(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSelector(false)}>
          <TouchableOpacity style={s.selSheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.selSheetTitle}>Sélectionner une affaire</Text>
            <View style={s.selSearch}>
              <Search color={C.gray400} size={16} />
              <TextInput
                style={s.selSearchInput}
                value={searchAff}
                onChangeText={setSearchAff}
                placeholder="Rechercher..."
                placeholderTextColor={C.gray400}
              />
            </View>
            <FlatList
              data={filteredAff}
              keyExtractor={a => a.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item: a }) => (
                <TouchableOpacity
                  style={[s.selItem, selectedAffaire?.id === a.id && s.selItemActive]}
                  onPress={() => selectAffaire(a)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.selItemNum}>{a.numero}</Text>
                    <Text style={s.selItemTitle} numberOfLines={1}>{a.intitule}</Text>
                    <Text style={s.selItemClient}>{a.client.nom} • {a.domaine}</Text>
                  </View>
                  {selectedAffaire?.id === a.id && <Check color={C.amber600} size={18} />}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {!selectedAffaire ? (
        /* Empty state */
        <View style={s.emptyState}>
          <View style={s.emptyIcon}><Brain color={C.gray900} size={40} /></View>
          <Text style={s.emptyTitle}>Assistant IA Juridique</Text>
          <Text style={s.emptyDesc}>Sélectionnez une affaire pour commencer à analyser votre dossier avec l'IA.</Text>
          <TouchableOpacity style={s.startBtn} onPress={() => setShowSelector(true)} activeOpacity={0.85}>
            <Text style={s.startBtnText}>Sélectionner une affaire</Text>
          </TouchableOpacity>
          <View style={s.capabilitiesBox}>
            <Text style={s.capTitle}>💡 L'assistant IA peut vous aider à :</Text>
            {['Analyser les aspects juridiques', 'Identifier les textes légaux (OHADA)', 'Préparer vos audiences', 'Évaluer les risques juridiques', 'Optimiser le recouvrement'].map(c => (
              <Text key={c} style={s.capItem}>• {c}</Text>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={isTyping ? (
              <View style={s.typingBubble}>
                <Brain color={C.amber600} size={14} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[0, 1, 2].map(i => <View key={i} style={[s.dot, { opacity: 0.6 + i * 0.2 }]} />)}
                </View>
              </View>
            ) : null}
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

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <View style={s.suggestions}>
              <Text style={s.suggestionsLabel}>💡 Suggestions :</Text>
              <View style={s.suggestionsGrid}>
                {SUGGESTIONS.map(({ Icon, text, cat }) => (
                  <TouchableOpacity key={text} style={s.suggBtn} onPress={() => setInput(text)} activeOpacity={0.8}>
                    <Icon color={C.amber600} size={13} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.suggText}>{text}</Text>
                      <Text style={s.suggCat}>{cat}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Disclaimer + Input */}
          <View style={s.inputArea}>
            <View style={s.disclaimer}>
              <AlertTriangle color={C.amber700} size={11} />
              <Text style={s.disclaimerText}>Les analyses sont informatives et ne constituent pas un avis juridique opposable.</Text>
            </View>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="Posez votre question juridique..."
                placeholderTextColor={C.gray400}
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!input.trim() || isTyping) && s.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!input.trim() || isTyping}
                activeOpacity={0.85}
              >
                <Send color={C.gray900} size={18} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  headerSub: { fontSize: 12, color: C.amber400, marginTop: 2 },
  selectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 12, padding: 12,
  },
  selAffNum: { fontSize: 11, color: C.amber400, fontWeight: '500', marginBottom: 2 },
  selAffTitle: { fontSize: 13, fontWeight: '600', color: C.white },
  selAffClient: { fontSize: 11, color: C.gray400, marginTop: 2 },
  selPlaceholder: { fontSize: 14, color: C.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  selSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  selSheetTitle: { fontSize: 17, fontWeight: '700', color: C.gray900, marginBottom: 12 },
  selSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  selSearchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.gray900 },
  selItem: { padding: 12, borderRadius: 10, borderWidth: 2, borderColor: C.gray200, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  selItemActive: { borderColor: C.amber500, backgroundColor: C.amber50 },
  selItemNum: { fontSize: 11, color: C.amber600, fontWeight: '500' },
  selItemTitle: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  selItemClient: { fontSize: 11, color: C.gray500 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 80, height: 80, backgroundColor: C.amber500, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.gray900, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: C.gray600, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  startBtn: { backgroundColor: C.amber500, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, marginBottom: 24 },
  startBtnText: { fontSize: 15, fontWeight: '600', color: C.gray900 },
  capabilitiesBox: { backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 14, padding: 16, alignSelf: 'stretch' },
  capTitle: { fontSize: 13, fontWeight: '600', color: C.amber900, marginBottom: 8 },
  capItem: { fontSize: 13, color: C.amber800, lineHeight: 22 },
  msgList: { padding: 14, gap: 10, paddingBottom: 20 },
  msgRow: { alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '88%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: C.amber500 },
  bubbleAssistant: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  assistantLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  assistantLabelText: { fontSize: 12, fontWeight: '600', color: C.amber600 },
  msgText: { fontSize: 14, color: C.gray900, lineHeight: 22 },
  msgTime: { fontSize: 11, color: C.gray400, marginTop: 6, textAlign: 'right' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 16, padding: 12, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber500 },
  suggestions: { paddingHorizontal: 14, paddingBottom: 8 },
  suggestionsLabel: { fontSize: 12, fontWeight: '500', color: C.gray600, marginBottom: 8 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggBtn: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 10, padding: 10, width: '48%', shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  suggText: { fontSize: 12, fontWeight: '500', color: C.gray900 },
  suggCat: { fontSize: 10, color: C.gray500, marginTop: 2 },
  inputArea: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200, padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 10, padding: 8, marginBottom: 10 },
  disclaimerText: { fontSize: 11, color: C.amber800, flex: 1, lineHeight: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.gray900, maxHeight: 120 },
  sendBtn: { backgroundColor: C.amber500, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
