// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleUtilisateur = 'avocat' | 'assistant' | 'associe' | 'administrateur';

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: RoleUtilisateur;
  barreau: string;
  telephone?: string;
  authentif2FA?: boolean;
}

export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  type: 'personne_physique' | 'personne_morale';
  telephone: string;
  email: string;
  ville: string;
  adresse?: string;
  cni?: string;
  rccm?: string;
  formeJuridique?: string;
  referent?: string;
  dateCreation: string;
}

export interface Affaire {
  id: string;
  numero: string;
  intitule: string;
  statut: 'ouverte' | 'en_cours' | 'suspendue' | 'gagnee' | 'perdue' | 'classee';
  domaine: string;
  typeAffaire: string;
  juridiction: string;
  dateOuverture: string;
  dateCloture?: string;
  client: Client;
  avocatResponsable: Utilisateur;
  avocatsAssocies: Utilisateur[];
  montantFacture?: number;
  montantEncaisse?: number;
  risqueImpaye?: 'faible' | 'moyen' | 'eleve';
  prochainRendezVous?: string;
  notesInternes?: string;
}

export interface Audience {
  id: string;
  affaire: Affaire;
  date: string;
  heure: string;
  nature: string;
  juridiction: string;
  statut: 'prevue' | 'tenue' | 'renvoyee';
  notes?: string;
  decision?: string;
  syncStatus: 'synced' | 'pending';
}

export interface Document {
  id: string;
  nom: string;
  type: string;
  taille: string;
  affaireId: string;
  dateAjout: string;
  confidentialite: 'public' | 'confidentiel' | 'secret';
  syncStatus: 'synced' | 'pending';
  url?: string;
}

export interface Facture {
  id: string;
  numero: string;
  affaireId: string;
  montant: number;
  montantPaye: number;
  statut: 'brouillon' | 'envoyee' | 'partielle' | 'payee' | 'en_retard';
  dateEmission: string;
  dateEcheance: string;
  description?: string;
}

export interface Encaissement {
  id: string;
  factureId: string;
  montant: number;
  date: string;
  modePaiement: string;
  reference: string;
}

export interface Notification {
  id: string;
  type: 'audience' | 'paiement' | 'document' | 'systeme';
  titre: string;
  message: string;
  date: string;
  lue: boolean;
  urgente?: boolean;
  lienEcran?: string;
}

export interface StatutAffaire {
  value: string;
  label: string;
  color: string;
}

// ─── Utilisateurs ────────────────────────────────────────────────────────────

export const utilisateurs: Utilisateur[] = [
  {
    id: 'u1',
    nom: 'Nkodo',
    prenom: 'Jean-Pierre',
    email: 'jp.nkodo@cabinet.cm',
    role: 'avocat',
    barreau: 'Barreau de Yaoundé',
    telephone: '+237 655 123 456',
    authentif2FA: true,
  },
  {
    id: 'u2',
    nom: 'Mbarga',
    prenom: 'Hélène',
    email: 'h.mbarga@cabinet.cm',
    role: 'avocat',
    barreau: 'Barreau de Yaoundé',
    telephone: '+237 677 234 567',
  },
  {
    id: 'u3',
    nom: 'Tchio',
    prenom: 'Paul',
    email: 'p.tchio@cabinet.cm',
    role: 'associe',
    barreau: 'Barreau du Centre',
    telephone: '+237 699 345 678',
  },
  {
    id: 'u4',
    nom: 'Elong',
    prenom: 'Sophie',
    email: 's.elong@cabinet.cm',
    role: 'assistant',
    barreau: '',
    telephone: '+237 654 456 789',
  },
];

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients: Client[] = [
  {
    id: 'c1',
    nom: 'Kamga',
    prenom: 'Michel',
    type: 'personne_physique',
    telephone: '+237 699 001 122',
    email: 'michel.kamga@gmail.com',
    ville: 'Yaoundé',
    adresse: 'Bastos, rue 1234',
    dateCreation: '2023-01-15',
  },
  {
    id: 'c2',
    nom: 'CAMTEL SA',
    type: 'personne_morale',
    telephone: '+237 222 234 567',
    email: 'juridique@camtel.cm',
    ville: 'Yaoundé',
    rccm: 'RC/YAO/2001/B/0234',
    formeJuridique: 'SA',
    referent: 'Dir. Juridique M. Onana',
    dateCreation: '2022-06-10',
  },
  {
    id: 'c3',
    nom: 'Nguema',
    prenom: 'Pauline',
    type: 'personne_physique',
    telephone: '+237 677 334 455',
    email: 'p.nguema@yahoo.fr',
    ville: 'Douala',
    dateCreation: '2023-03-20',
  },
  {
    id: 'c4',
    nom: 'Fokou Industrie SARL',
    type: 'personne_morale',
    telephone: '+237 233 445 566',
    email: 'direction@fokou.cm',
    ville: 'Douala',
    rccm: 'RC/DLA/2015/B/1122',
    formeJuridique: 'SARL',
    referent: 'M. Fokou Ernest',
    dateCreation: '2022-09-05',
  },
  {
    id: 'c5',
    nom: 'Atangana',
    prenom: 'Robert',
    type: 'personne_physique',
    telephone: '+237 655 567 890',
    email: 'r.atangana@hotmail.com',
    ville: 'Bafoussam',
    dateCreation: '2023-07-12',
  },
  {
    id: 'c6',
    nom: 'GIC Agricole du Centre',
    type: 'personne_morale',
    telephone: '+237 699 678 901',
    email: 'gicac@agricole.cm',
    ville: 'Yaoundé',
    rccm: 'RC/YAO/2010/B/0567',
    formeJuridique: 'GIE',
    referent: 'Mme Bello Christine',
    dateCreation: '2023-02-28',
  },
];

// ─── Affaires ─────────────────────────────────────────────────────────────────

export const affaires: Affaire[] = [
  {
    id: 'a1',
    numero: 'AFF-2024-001',
    intitule: 'CAMTEL SA c/ Société Tech Innovations — Rupture contrat de prestation',
    statut: 'en_cours',
    domaine: 'Droit des affaires',
    typeAffaire: 'Contentieux',
    juridiction: 'Tribunal de Grande Instance de Yaoundé — Centre Administratif',
    dateOuverture: '2024-01-10',
    client: clients[1],
    avocatResponsable: utilisateurs[0],
    avocatsAssocies: [utilisateurs[1]],
    montantFacture: 4500000,
    montantEncaisse: 2000000,
    risqueImpaye: 'moyen',
    prochainRendezVous: '2025-07-15T09:00:00',
    notesInternes: 'Client exige résolution rapide. Pression pour arrangement amiable avant jugement.',
  },
  {
    id: 'a2',
    numero: 'AFF-2024-002',
    intitule: 'Kamga Michel c/ Succession Kamga — Partage héritage terrain Bastos',
    statut: 'en_cours',
    domaine: 'Droit civil',
    typeAffaire: 'Contentieux',
    juridiction: 'Tribunal de Première Instance de Yaoundé — Centre Ville',
    dateOuverture: '2024-02-15',
    client: clients[0],
    avocatResponsable: utilisateurs[1],
    avocatsAssocies: [],
    montantFacture: 2200000,
    montantEncaisse: 2200000,
    risqueImpaye: 'faible',
    prochainRendezVous: '2025-07-22T10:30:00',
  },
  {
    id: 'a3',
    numero: 'AFF-2024-003',
    intitule: 'Nguema Pauline c/ Employeur — Licenciement abusif et rappel de salaires',
    statut: 'ouverte',
    domaine: 'Droit du travail',
    typeAffaire: 'Contentieux',
    juridiction: 'Tribunal du Travail de Douala — Bonanjo',
    dateOuverture: '2024-03-01',
    client: clients[2],
    avocatResponsable: utilisateurs[0],
    avocatsAssocies: [],
    montantFacture: 1800000,
    montantEncaisse: 0,
    risqueImpaye: 'eleve',
    notesInternes: 'Dossier urgent. Client sans revenus. Convenir d\'un plan de paiement.',
  },
  {
    id: 'a4',
    numero: 'AFF-2024-004',
    intitule: 'Fokou Industrie SARL — Conseil restructuration dette et négociation bancaire',
    statut: 'en_cours',
    domaine: 'Droit des affaires',
    typeAffaire: 'Conseil',
    juridiction: 'Hors juridiction (conseil)',
    dateOuverture: '2024-04-20',
    client: clients[3],
    avocatResponsable: utilisateurs[2],
    avocatsAssocies: [utilisateurs[0]],
    montantFacture: 6000000,
    montantEncaisse: 4500000,
    risqueImpaye: 'faible',
  },
  {
    id: 'a5',
    numero: 'AFF-2023-015',
    intitule: 'GIC Agricole du Centre c/ MINADER — Annulation décision administrative',
    statut: 'gagnee',
    domaine: 'Droit administratif',
    typeAffaire: 'Contentieux',
    juridiction: 'Cour Suprême du Cameroun — Chambre Administrative',
    dateOuverture: '2023-08-05',
    dateCloture: '2024-05-30',
    client: clients[5],
    avocatResponsable: utilisateurs[2],
    avocatsAssocies: [utilisateurs[0], utilisateurs[1]],
    montantFacture: 8500000,
    montantEncaisse: 8500000,
    risqueImpaye: 'faible',
  },
  {
    id: 'a6',
    numero: 'AFF-2024-005',
    intitule: 'Atangana Robert — Divorce et garde des enfants',
    statut: 'en_cours',
    domaine: 'Droit de la famille',
    typeAffaire: 'Contentieux',
    juridiction: 'Tribunal de Première Instance de Bafoussam',
    dateOuverture: '2024-05-10',
    client: clients[4],
    avocatResponsable: utilisateurs[1],
    avocatsAssocies: [],
    montantFacture: 1500000,
    montantEncaisse: 750000,
    risqueImpaye: 'moyen',
    prochainRendezVous: '2025-07-18T14:00:00',
  },
];

// ─── Audiences ────────────────────────────────────────────────────────────────

export const audiences: Audience[] = [
  {
    id: 'aud1',
    affaire: affaires[0],
    date: '2025-07-15',
    heure: '09:00',
    nature: 'Audience au fond — plaidoiries',
    juridiction: 'Tribunal de Grande Instance de Yaoundé — Salle 3',
    statut: 'prevue',
    notes: 'Préparer les conclusions en réponse',
    syncStatus: 'synced',
  },
  {
    id: 'aud2',
    affaire: affaires[1],
    date: '2025-07-22',
    heure: '10:30',
    nature: 'Mise en état — communication des pièces',
    juridiction: 'TPI Yaoundé Centre Ville — Salle 1',
    statut: 'prevue',
    syncStatus: 'synced',
  },
  {
    id: 'aud3',
    affaire: affaires[5],
    date: '2025-07-18',
    heure: '14:00',
    nature: 'Audience de conciliation',
    juridiction: 'TPI de Bafoussam — Salle familiale',
    statut: 'prevue',
    notes: 'Tenter une médiation sur la garde alternée',
    syncStatus: 'pending',
  },
  {
    id: 'aud4',
    affaire: affaires[2],
    date: '2025-06-10',
    heure: '08:30',
    nature: 'Tentative de conciliation préalable',
    juridiction: 'Tribunal du Travail de Douala — Bonanjo',
    statut: 'tenue',
    decision: 'Échec de conciliation — renvoi au fond le 15/09/2025',
    syncStatus: 'synced',
  },
  {
    id: 'aud5',
    affaire: affaires[0],
    date: '2025-05-20',
    heure: '11:00',
    nature: 'Renvoi pour dépôt de mémoire',
    juridiction: 'TGI Yaoundé — Salle 3',
    statut: 'renvoyee',
    notes: 'Partie adverse a demandé un délai pour les conclusions',
    syncStatus: 'synced',
  },
  {
    id: 'aud6',
    affaire: affaires[4],
    date: '2024-03-15',
    heure: '09:00',
    nature: 'Délibéré',
    juridiction: 'Cour Suprême — Chambre Administrative',
    statut: 'tenue',
    decision: 'Arrêt n°234/2024 — Annulation de la décision du MINADER',
    syncStatus: 'synced',
  },
];

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents: Document[] = [
  {
    id: 'd1',
    nom: 'Contrat de prestation CAMTEL-TechInnov signé.pdf',
    type: 'Contrat',
    taille: '2.3 MB',
    affaireId: 'a1',
    dateAjout: '2024-01-12',
    confidentialite: 'confidentiel',
    syncStatus: 'synced',
  },
  {
    id: 'd2',
    nom: 'Assignation en justice — CAMTEL c/ Tech Innovations.pdf',
    type: 'Assignation',
    taille: '458 KB',
    affaireId: 'a1',
    dateAjout: '2024-01-15',
    confidentialite: 'confidentiel',
    syncStatus: 'synced',
  },
  {
    id: 'd3',
    nom: 'Conclusions en demande — dépôt 15 mars 2024.docx',
    type: 'Conclusions',
    taille: '187 KB',
    affaireId: 'a1',
    dateAjout: '2024-03-15',
    confidentialite: 'confidentiel',
    syncStatus: 'synced',
  },
  {
    id: 'd4',
    nom: 'Titre foncier N°12345 — Bastos Yaoundé.pdf',
    type: 'Titre foncier',
    taille: '1.1 MB',
    affaireId: 'a2',
    dateAjout: '2024-02-20',
    confidentialite: 'secret',
    syncStatus: 'synced',
  },
  {
    id: 'd5',
    nom: 'Acte de naissance défunt KAMGA Paul.pdf',
    type: 'Pièce justificative',
    taille: '320 KB',
    affaireId: 'a2',
    dateAjout: '2024-02-22',
    confidentialite: 'confidentiel',
    syncStatus: 'synced',
  },
  {
    id: 'd6',
    nom: 'Contrat de travail NGUEMA Pauline — signé.pdf',
    type: 'Contrat',
    taille: '895 KB',
    affaireId: 'a3',
    dateAjout: '2024-03-05',
    confidentialite: 'confidentiel',
    syncStatus: 'pending',
  },
  {
    id: 'd7',
    nom: 'Lettre de licenciement — 12 février 2024.pdf',
    type: 'Correspondance',
    taille: '210 KB',
    affaireId: 'a3',
    dateAjout: '2024-03-05',
    confidentialite: 'confidentiel',
    syncStatus: 'pending',
  },
  {
    id: 'd8',
    nom: 'Rapport expertise comptable Fokou Industrie.pdf',
    type: 'Rapport',
    taille: '3.8 MB',
    affaireId: 'a4',
    dateAjout: '2024-05-02',
    confidentialite: 'secret',
    syncStatus: 'synced',
  },
  {
    id: 'd9',
    nom: 'Décision MINADER attaquée — refus autorisation.pdf',
    type: 'PV',
    taille: '678 KB',
    affaireId: 'a5',
    dateAjout: '2023-08-10',
    confidentialite: 'public',
    syncStatus: 'synced',
  },
  {
    id: 'd10',
    nom: 'Arrêt Cour Suprême n°234-2024.pdf',
    type: 'PV',
    taille: '445 KB',
    affaireId: 'a5',
    dateAjout: '2024-03-20',
    confidentialite: 'public',
    syncStatus: 'synced',
  },
];

export const documentsSupplementaires: Document[] = [
  {
    id: 'd11',
    nom: 'Plainte pénale — formulaire rempli.pdf',
    type: 'Plainte',
    taille: '180 KB',
    affaireId: 'a3',
    dateAjout: '2024-04-01',
    confidentialite: 'confidentiel',
    syncStatus: 'pending',
  },
  {
    id: 'd12',
    nom: 'Attestation témoin Mme Bassong.docx',
    type: 'Déposition',
    taille: '95 KB',
    affaireId: 'a2',
    dateAjout: '2024-04-10',
    confidentialite: 'confidentiel',
    syncStatus: 'synced',
  },
];

// ─── Factures ─────────────────────────────────────────────────────────────────

export const factures: Facture[] = [
  {
    id: 'f1',
    numero: 'FACT-2024-001',
    affaireId: 'a1',
    montant: 2500000,
    montantPaye: 2000000,
    statut: 'partielle',
    dateEmission: '2024-01-20',
    dateEcheance: '2024-02-20',
    description: 'Provision ouverture dossier + diligences initiales',
  },
  {
    id: 'f2',
    numero: 'FACT-2024-002',
    affaireId: 'a1',
    montant: 2000000,
    montantPaye: 0,
    statut: 'en_retard',
    dateEmission: '2024-04-01',
    dateEcheance: '2024-05-01',
    description: 'Honoraires instructions + audiences',
  },
  {
    id: 'f3',
    numero: 'FACT-2024-003',
    affaireId: 'a2',
    montant: 2200000,
    montantPaye: 2200000,
    statut: 'payee',
    dateEmission: '2024-02-28',
    dateEcheance: '2024-03-28',
    description: 'Honoraires forfaitaires succession',
  },
  {
    id: 'f4',
    numero: 'FACT-2024-004',
    affaireId: 'a3',
    montant: 800000,
    montantPaye: 0,
    statut: 'envoyee',
    dateEmission: '2024-03-10',
    dateEcheance: '2024-04-10',
    description: 'Ouverture dossier travail + conciliation',
  },
  {
    id: 'f5',
    numero: 'FACT-2024-005',
    affaireId: 'a3',
    montant: 1000000,
    montantPaye: 0,
    statut: 'en_retard',
    dateEmission: '2024-05-01',
    dateEcheance: '2024-06-01',
    description: 'Honoraires instruction 2ème phase',
  },
  {
    id: 'f6',
    numero: 'FACT-2024-006',
    affaireId: 'a4',
    montant: 3000000,
    montantPaye: 3000000,
    statut: 'payee',
    dateEmission: '2024-04-25',
    dateEcheance: '2024-05-25',
    description: 'Conseil restructuration dette — Phase 1',
  },
  {
    id: 'f7',
    numero: 'FACT-2024-007',
    affaireId: 'a4',
    montant: 3000000,
    montantPaye: 1500000,
    statut: 'partielle',
    dateEmission: '2024-06-10',
    dateEcheance: '2024-07-10',
    description: 'Conseil restructuration dette — Phase 2',
  },
  {
    id: 'f8',
    numero: 'FACT-2024-008',
    affaireId: 'a6',
    montant: 1500000,
    montantPaye: 750000,
    statut: 'partielle',
    dateEmission: '2024-05-15',
    dateEcheance: '2024-06-15',
    description: 'Honoraires divorce et garde',
  },
];

// ─── Encaissements ────────────────────────────────────────────────────────────

export const encaissements: Encaissement[] = [
  {
    id: 'enc1',
    factureId: 'f1',
    montant: 2000000,
    date: '2024-01-25',
    modePaiement: 'Virement bancaire',
    reference: 'VIR-20240125-CAMTEL',
  },
  {
    id: 'enc2',
    factureId: 'f3',
    montant: 2200000,
    date: '2024-03-05',
    modePaiement: 'Chèque',
    reference: 'CHQ-BCA-00234',
  },
  {
    id: 'enc3',
    factureId: 'f6',
    montant: 3000000,
    date: '2024-04-28',
    modePaiement: 'Mobile Money',
    reference: 'MTN-20240428-FOKOU',
  },
  {
    id: 'enc4',
    factureId: 'f7',
    montant: 1500000,
    date: '2024-06-15',
    modePaiement: 'Virement bancaire',
    reference: 'VIR-20240615-FOKOU2',
  },
  {
    id: 'enc5',
    factureId: 'f8',
    montant: 750000,
    date: '2024-05-20',
    modePaiement: 'Espèces',
    reference: 'ESP-20240520',
  },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'audience',
    titre: 'Audience dans 8 jours',
    message: 'Audience au fond — CAMTEL c/ Tech Innovations le 15/07/2025 à 09h00 au TGI Yaoundé.',
    date: new Date(Date.now() - 30 * 60000).toISOString(),
    lue: false,
    urgente: false,
    lienEcran: 'audiences',
  },
  {
    id: 'n2',
    type: 'paiement',
    titre: 'Facture en retard — Action requise',
    message: 'FACT-2024-002 (CAMTEL SA) est en retard de paiement. Montant impayé : 2 000 000 FCFA.',
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    lue: false,
    urgente: true,
    lienEcran: 'facturation',
  },
  {
    id: 'n3',
    type: 'paiement',
    titre: 'Facture en retard — Nguema Pauline',
    message: 'FACT-2024-005 dépasse son échéance de 36 jours. 1 000 000 FCFA impayés.',
    date: new Date(Date.now() - 5 * 3600000).toISOString(),
    lue: false,
    urgente: true,
    lienEcran: 'facturation',
  },
  {
    id: 'n4',
    type: 'audience',
    titre: 'Audience demain — Atangana Robert',
    message: 'Audience de conciliation à Bafoussam le 18/07/2025 à 14h00.',
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    lue: false,
    urgente: false,
    lienEcran: 'audiences',
  },
  {
    id: 'n5',
    type: 'document',
    titre: 'Document en attente de synchronisation',
    message: '3 documents non synchronisés dans l\'affaire Nguema Pauline.',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    lue: true,
    urgente: false,
    lienEcran: 'documents',
  },
  {
    id: 'n6',
    type: 'systeme',
    titre: 'Synchronisation réussie',
    message: 'Toutes vos données ont été synchronisées avec le serveur avec succès.',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    lue: true,
    urgente: false,
  },
  {
    id: 'n7',
    type: 'audience',
    titre: 'Audience dans 15 jours — Kamga Michel',
    message: 'Mise en état au TPI Yaoundé Centre Ville le 22/07/2025 à 10h30.',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    lue: true,
    urgente: false,
    lienEcran: 'audiences',
  },
];

// ─── Statuts Affaires ─────────────────────────────────────────────────────────

export const statutsAffaires: StatutAffaire[] = [
  { value: 'ouverte', label: 'Ouverte', color: 'blue' },
  { value: 'en_cours', label: 'En cours', color: 'orange' },
  { value: 'suspendue', label: 'Suspendue', color: 'gray' },
  { value: 'gagnee', label: 'Gagnée', color: 'green' },
  { value: 'perdue', label: 'Perdue', color: 'red' },
  { value: 'classee', label: 'Classée', color: 'gray' },
];
