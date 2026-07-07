import { AppColors as C } from '@/constants/theme';
import { affaires, audiences, documents, factures } from '@/data/mockData';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    DollarSign,
    FileText,
    Users,
} from 'lucide-react-native';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'resume' | 'audiences' | 'documents' | 'finances' | 'historique';
const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: 'resume',    label: 'Résumé',    Icon: FileText },
  { id: 'audiences', label: 'Audiences', Icon: Calendar },
  { id: 'documents', label: 'Documents', Icon: FileText },
  { id: 'finances',  label: 'Finances',  Icon: DollarSign },
  { id: 'historique',label: 'Historique',Icon: Clock },
];

const STATUT_AUD: Record<string, { bg: string; text: string; label: string }> = {
  prevue:   { bg: C.blue100,   text: C.blue700,   label: 'Prévue' },
  tenue:    { bg: C.green100,  text: C.green700,  label: 'Tenue' },
  renvoyee: { bg: C.orange100, text: C.orange700, label: 'Renvoyée' },
};

const fmtM = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
const fmtD = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
const fmtDs = (d: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));

export default function AffaireDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('resume');

  const affaire = affaires.find(a => a.id === id);
  if (!affaire) {
    return (
      <View style={{ flex: 1, backgroundColor: C.gray900, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.white, fontSize: 18 }}>Affaire introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.amber500 }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const affAud = audiences.filter(a => a.affaire.id === affaire.id);
  const affDocs = documents.filter(d => d.affaireId === affaire.id);
  const affFact = factures.filter(f => f.affaireId === affaire.id);

  const pct = affaire.montantFacture && affaire.montantFacture > 0
    ? Math.round(((affaire.montantEncaisse ?? 0) / affaire.montantFacture) * 100) : 0;

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.gray900 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft color={C.gray400} size={20} />
            <Text style={s.backText}>Retour</Text>
          </TouchableOpacity>
          <Text style={s.affNum}>{affaire.numero}</Text>
          <Text style={s.affTitle}>{affaire.intitule}</Text>
          <Text style={s.affClient}>{affaire.client.nom}</Text>
          <View style={s.tagsRow}>
            <View style={s.tag}><Text style={s.tagText}>{affaire.domaine}</Text></View>
            <View style={s.tag}><Text style={s.tagText}>{affaire.typeAffaire}</Text></View>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
          {TABS.map(tab => {
            const Icon = tab.Icon;
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[s.tabBtn, active && s.tabBtnActive]}
                activeOpacity={0.8}
              >
                <Icon color={active ? C.amber500 : C.gray500} size={15} />
                <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Tab content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {activeTab === 'resume' && (
          <>
            {/* Infos générales */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Informations générales</Text>
              {[
                { label: 'Statut', val: affaire.statut.replace('_', ' ').toUpperCase() },
                { label: "Date d'ouverture", val: fmtD(affaire.dateOuverture) },
                { label: 'Juridiction', val: affaire.juridiction },
              ].map(({ label, val }) => (
                <View key={label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoVal} numberOfLines={2}>{val}</Text>
                </View>
              ))}
              {affaire.risqueImpaye && (
                <View style={[s.infoRow, { paddingTop: 10, borderTopWidth: 1, borderTopColor: C.gray100 }]}>
                  <Text style={s.infoLabel}>Risque d'impayé</Text>
                  <View style={[s.riskBadge, affaire.risqueImpaye === 'eleve' ? { backgroundColor: C.red100 } : affaire.risqueImpaye === 'moyen' ? { backgroundColor: C.orange100 } : { backgroundColor: C.green100 }]}>
                    <Text style={[s.riskText, affaire.risqueImpaye === 'eleve' ? { color: C.red700 } : affaire.risqueImpaye === 'moyen' ? { color: C.orange700 } : { color: C.green700 }]}>
                      {affaire.risqueImpaye === 'eleve' ? 'Élevé' : affaire.risqueImpaye === 'moyen' ? 'Moyen' : 'Faible'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Équipe */}
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <Users color={C.gray700} size={18} />
                <Text style={s.cardTitle}>Équipe juridique</Text>
              </View>
              <Text style={s.subLabel}>Avocat responsable</Text>
              <View style={s.teamRow}>
                <View style={s.initials}>
                  <Text style={s.initialsText}>{affaire.avocatResponsable.prenom[0]}{affaire.avocatResponsable.nom[0]}</Text>
                </View>
                <View>
                  <Text style={s.teamName}>{affaire.avocatResponsable.prenom} {affaire.avocatResponsable.nom}</Text>
                  <Text style={s.teamSub}>{affaire.avocatResponsable.barreau}</Text>
                </View>
              </View>
              {affaire.avocatsAssocies.length > 0 && (
                <>
                  <Text style={[s.subLabel, { marginTop: 10 }]}>Avocats associés</Text>
                  {affaire.avocatsAssocies.map(av => (
                    <View key={av.id} style={[s.teamRow, { marginTop: 6 }]}>
                      <View style={[s.initials, { backgroundColor: C.gray100, width: 36, height: 36, borderRadius: 18 }]}>
                        <Text style={[s.initialsText, { color: C.gray600, fontSize: 12 }]}>{av.prenom[0]}{av.nom[0]}</Text>
                      </View>
                      <Text style={s.teamName}>{av.prenom} {av.nom}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Client */}
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <Building2 color={C.gray700} size={18} />
                <Text style={s.cardTitle}>Client</Text>
              </View>
              {[
                { label: 'Nom', val: `${affaire.client.nom}${affaire.client.prenom ? ' ' + affaire.client.prenom : ''}` },
                { label: 'Type', val: affaire.client.type === 'personne_physique' ? 'Personne physique' : 'Personne morale' },
                { label: 'Téléphone', val: affaire.client.telephone },
                { label: 'Email', val: affaire.client.email },
                { label: 'Ville', val: affaire.client.ville },
              ].map(({ label, val }) => (
                <View key={label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoVal} numberOfLines={1}>{val}</Text>
                </View>
              ))}
            </View>

            {affaire.notesInternes && (
              <View style={s.notesCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle color={C.amber600} size={18} />
                  <Text style={s.notesTitle}>Notes internes</Text>
                </View>
                <Text style={s.notesText}>{affaire.notesInternes}</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'audiences' && (
          <>
            <View style={s.tabHeader}>
              <Text style={s.tabHeaderTitle}>{affAud.length} audience(s)</Text>
              <TouchableOpacity><Text style={s.addLink}>+ Ajouter</Text></TouchableOpacity>
            </View>
            {affAud.length === 0 ? (
              <View style={s.empty}>
                <Calendar color={C.gray400} size={48} />
                <Text style={s.emptyText}>Aucune audience enregistrée</Text>
              </View>
            ) : affAud.map(aud => {
              const sc = STATUT_AUD[aud.statut];
              return (
                <View key={aud.id} style={s.card}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={s.audDateBox}>
                      <Text style={s.audDay}>{new Date(aud.date).getDate()}</Text>
                      <Text style={s.audMon}>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(aud.date))}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={s.audNature}>{aud.nature}</Text>
                        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text style={[s.statusText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                      </View>
                      <Text style={s.audHeure}>{aud.heure}</Text>
                      <Text style={s.audJur}>{aud.juridiction}</Text>
                      {aud.notes && <View style={s.noteBox}><Text style={s.noteText}>{aud.notes}</Text></View>}
                      {aud.decision && <View style={s.decisionBox}><Text style={s.decisionText}>Décision : {aud.decision}</Text></View>}
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'documents' && (
          <>
            <View style={s.tabHeader}>
              <Text style={s.tabHeaderTitle}>{affDocs.length} document(s)</Text>
              <TouchableOpacity><Text style={s.addLink}>+ Ajouter</Text></TouchableOpacity>
            </View>
            {affDocs.length === 0 ? (
              <View style={s.empty}>
                <FileText color={C.gray400} size={48} />
                <Text style={s.emptyText}>Aucun document</Text>
              </View>
            ) : affDocs.map(doc => (
              <View key={doc.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={s.docIcon}>
                  <FileText color={C.blue600} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.docName} numberOfLines={1}>{doc.nom}</Text>
                  <Text style={s.docMeta}>{doc.type} • {doc.taille}</Text>
                  <Text style={s.docDate}>{fmtDs(doc.dateAjout)}</Text>
                </View>
                {doc.syncStatus === 'synced' && <Text style={{ color: C.green600, fontSize: 14 }}>✓</Text>}
              </View>
            ))}
          </>
        )}

        {activeTab === 'finances' && (
          <>
            {/* Résumé */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Résumé financier</Text>
              {[
                { label: 'Montant facturé', val: fmtM(affaire.montantFacture ?? 0), color: C.gray900 },
                { label: 'Montant encaissé', val: fmtM(affaire.montantEncaisse ?? 0), color: C.green600 },
              ].map(({ label, val, color }) => (
                <View key={label} style={s.amtRow}>
                  <Text style={s.amtLabel}>{label}</Text>
                  <Text style={[s.amtVal, { color }]}>{val}</Text>
                </View>
              ))}
              <View style={[s.amtRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.gray100 }]}>
                <Text style={[s.amtLabel, { fontWeight: '600' }]}>Reste à percevoir</Text>
                <Text style={[s.amtVal, { color: C.orange600 }]}>{fmtM((affaire.montantFacture ?? 0) - (affaire.montantEncaisse ?? 0))}</Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.infoLabel}>Taux d'encaissement</Text>
                  <Text style={{ fontWeight: '600', color: C.gray900 }}>{pct}%</Text>
                </View>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? C.green500 : pct >= 50 ? C.amber500 : C.red500 }]} />
                </View>
              </View>
            </View>

            {/* Factures */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Factures ({affFact.length})</Text>
              {affFact.length === 0 ? <Text style={s.emptyText}>Aucune facture</Text> : affFact.map(f => (
                <View key={f.id} style={s.factRow}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View>
                      <Text style={s.factNum}>{f.numero}</Text>
                      <Text style={s.factDate}>Émise le {fmtDs(f.dateEmission)}</Text>
                    </View>
                    <View style={[s.statusBadge, f.statut === 'payee' ? { backgroundColor: C.green100 } : f.statut === 'en_retard' ? { backgroundColor: C.red100 } : { backgroundColor: C.orange100 }]}>
                      <Text style={[s.statusText, f.statut === 'payee' ? { color: C.green700 } : f.statut === 'en_retard' ? { color: C.red700 } : { color: C.orange700 }]}>
                        {f.statut === 'payee' ? 'Payée' : f.statut === 'en_retard' ? 'En retard' : 'Partielle'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.factMeta}>Montant : <Text style={{ fontWeight: '600', color: C.gray900 }}>{fmtM(f.montant)}</Text></Text>
                    {f.montantPaye > 0 && <Text style={s.factMeta}>Payé : <Text style={{ fontWeight: '600', color: C.green600 }}>{fmtM(f.montantPaye)}</Text></Text>}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'historique' && (
          <>
            {/* Counters */}
            <View style={s.histCounters}>
              {[
                { val: affAud.length,  label: 'Audiences', color: C.blue600 },
                { val: affDocs.length, label: 'Documents', color: C.purple600 },
                { val: affFact.length, label: 'Factures',  color: C.green600 },
              ].map(({ val, label, color }) => (
                <View key={label} style={s.histCounter}>
                  <Text style={[s.histCounterVal, { color }]}>{val}</Text>
                  <Text style={s.histCounterLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Timeline */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Journal d'activité</Text>
              <View style={{ position: 'relative', paddingLeft: 32, marginTop: 12 }}>
                <View style={s.timelineLine} />

                {/* Ouverture */}
                <View style={s.timelineItem}>
                  <View style={[s.timelineDot, { backgroundColor: C.amber500 }]}><Text style={{ color: C.white, fontSize: 10 }}>✦</Text></View>
                  <View style={s.timelineContent}>
                    <Text style={s.tlTitle}>Affaire ouverte</Text>
                    <Text style={s.tlDate}>{fmtDs(affaire.dateOuverture)}</Text>
                    <View style={s.tlCard}>
                      <Text style={s.tlCardText}>Dossier créé par {affaire.avocatResponsable.prenom} {affaire.avocatResponsable.nom}</Text>
                      <Text style={[s.tlCardText, { color: C.amber700 }]}>{affaire.domaine} • {affaire.typeAffaire}</Text>
                    </View>
                  </View>
                </View>

                {affDocs.map(doc => (
                  <View key={`d-${doc.id}`} style={s.timelineItem}>
                    <View style={[s.timelineDot, { backgroundColor: C.purple100 }]}><Text style={{ fontSize: 12 }}>📄</Text></View>
                    <View style={s.timelineContent}>
                      <Text style={s.tlTitle}>Document ajouté</Text>
                      <Text style={s.tlDate}>{fmtDs(doc.dateAjout)}</Text>
                      <View style={[s.tlCard, { backgroundColor: C.purple50 }]}>
                        <Text style={[s.tlCardText, { color: C.purple600, fontWeight: '600' }]} numberOfLines={1}>{doc.nom}</Text>
                        <Text style={[s.tlCardText, { color: C.purple600 }]}>{doc.type} • {doc.taille}</Text>
                      </View>
                    </View>
                  </View>
                ))}

                {affAud.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(aud => (
                  <View key={`a-${aud.id}`} style={s.timelineItem}>
                    <View style={[s.timelineDot, { backgroundColor: aud.statut === 'tenue' ? C.green100 : aud.statut === 'renvoyee' ? C.orange100 : C.blue100 }]}>
                      <Text style={{ fontSize: 12 }}>{aud.statut === 'tenue' ? '✅' : aud.statut === 'renvoyee' ? '↩️' : '📅'}</Text>
                    </View>
                    <View style={s.timelineContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.tlTitle}>Audience {STATUT_AUD[aud.statut]?.label.toLowerCase()}</Text>
                        <View style={[s.statusBadge, { backgroundColor: STATUT_AUD[aud.statut]?.bg }]}>
                          <Text style={[s.statusText, { color: STATUT_AUD[aud.statut]?.text }]}>{STATUT_AUD[aud.statut]?.label}</Text>
                        </View>
                      </View>
                      <Text style={s.tlDate}>{fmtDs(aud.date)} à {aud.heure}</Text>
                      <View style={[s.tlCard, { backgroundColor: C.blue50 }]}>
                        <Text style={[s.tlCardText, { color: C.blue700, fontWeight: '600' }]}>{aud.nature}</Text>
                        <Text style={[s.tlCardText, { color: C.blue600 }]}>{aud.juridiction}</Text>
                        {aud.decision && <Text style={[s.tlCardText, { color: C.green700, fontWeight: '500' }]}>Décision : {aud.decision}</Text>}
                      </View>
                    </View>
                  </View>
                ))}

                {affFact.map(f => (
                  <View key={`f-${f.id}`} style={s.timelineItem}>
                    <View style={[s.timelineDot, { backgroundColor: C.green100 }]}><Text style={{ fontSize: 12 }}>💰</Text></View>
                    <View style={s.timelineContent}>
                      <Text style={s.tlTitle}>Facture émise</Text>
                      <Text style={s.tlDate}>{fmtDs(f.dateEmission)}</Text>
                      <View style={[s.tlCard, { backgroundColor: C.green50 }]}>
                        <Text style={[s.tlCardText, { color: C.green700, fontWeight: '600' }]}>{f.numero}</Text>
                        <Text style={[s.tlCardText, { color: C.green600 }]}>{fmtM(f.montant)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.traceNote}>
              <Text style={s.traceText}>🔒 Toutes les actions sont journalisées et horodatées conformément aux exigences de traçabilité.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray50 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontSize: 14, color: C.gray400 },
  affNum: { fontSize: 13, color: C.amber400, fontWeight: '500', marginBottom: 4 },
  affTitle: { fontSize: 19, fontWeight: '700', color: C.white, lineHeight: 26, marginBottom: 6 },
  affClient: { fontSize: 14, color: C.gray300, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: C.amber400, fontWeight: '500' },
  tabsContent: { paddingHorizontal: 12, paddingBottom: 8, gap: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.amber500 },
  tabText: { fontSize: 13, fontWeight: '500', color: C.gray500 },
  tabTextActive: { color: C.amber500 },
  content: { padding: 14, paddingBottom: 60, gap: 14 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray50 },
  infoLabel: { fontSize: 13, color: C.gray500, flex: 1 },
  infoVal: { fontSize: 13, fontWeight: '500', color: C.gray900, flex: 2, textAlign: 'right' },
  riskBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskText: { fontSize: 13, fontWeight: '500' },
  subLabel: { fontSize: 12, color: C.gray500, marginBottom: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  initials: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.blue100, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 14, fontWeight: '700', color: C.blue600 },
  teamName: { fontSize: 14, fontWeight: '500', color: C.gray900 },
  teamSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  notesCard: { backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 16, padding: 16 },
  notesTitle: { fontSize: 15, fontWeight: '600', color: C.amber900 },
  notesText: { fontSize: 14, color: C.amber800, lineHeight: 22 },
  tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tabHeaderTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  addLink: { fontSize: 14, color: C.amber600, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: C.gray500 },
  audDateBox: { backgroundColor: C.blue50, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 52 },
  audDay: { fontSize: 22, fontWeight: '700', color: C.blue600 },
  audMon: { fontSize: 11, color: C.blue600, marginTop: 2 },
  audNature: { fontSize: 14, fontWeight: '600', color: C.gray900, flex: 1 },
  audHeure: { fontSize: 13, color: C.gray600, marginTop: 2 },
  audJur: { fontSize: 12, color: C.gray500, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  noteBox: { backgroundColor: C.amber50, borderRadius: 8, padding: 8, marginTop: 8 },
  noteText: { fontSize: 12, color: C.amber900 },
  decisionBox: { backgroundColor: C.green50, borderRadius: 8, padding: 8, marginTop: 6 },
  decisionText: { fontSize: 12, color: C.green700, fontWeight: '500' },
  docIcon: { width: 48, height: 48, backgroundColor: C.blue50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 13, fontWeight: '600', color: C.gray900 },
  docMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  docDate: { fontSize: 11, color: C.gray400, marginTop: 2 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  amtLabel: { fontSize: 14, color: C.gray600 },
  amtVal: { fontSize: 16, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: C.gray100, borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  factRow: { backgroundColor: C.gray50, borderRadius: 12, padding: 12, marginTop: 10 },
  factNum: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  factDate: { fontSize: 12, color: C.gray500, marginTop: 2 },
  factMeta: { fontSize: 13, color: C.gray600 },
  histCounters: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  histCounter: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: C.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  histCounterVal: { fontSize: 24, fontWeight: '700' },
  histCounterLabel: { fontSize: 12, color: C.gray500, marginTop: 4 },
  timelineLine: { position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, backgroundColor: C.gray100 },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: -16 },
  timelineContent: { flex: 1, paddingTop: 4 },
  tlTitle: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  tlDate: { fontSize: 12, color: C.gray500, marginTop: 2, marginBottom: 6 },
  tlCard: { backgroundColor: C.amber50, borderRadius: 10, padding: 10, gap: 4 },
  tlCardText: { fontSize: 12, color: C.amber800, lineHeight: 18 },
  traceNote: { backgroundColor: C.gray100, borderRadius: 12, padding: 12 },
  traceText: { fontSize: 12, color: C.gray500, textAlign: 'center' },
});
