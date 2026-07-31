/**
 * src/lib/notificationsManager.ts
 * Gestionnaire intelligent des rappels d'événements (Audiences, Rendez-vous, Réunions)
 * Déclenche des alerte-écrans pop-up directes et notifications à 30 minutes et 15 minutes avant l'échéance.
 */

import { Alert } from 'react-native';
import api from './api';

export interface EventReminder {
  id: string | number;
  titre: string;
  dateStr: string;  // YYYY-MM-DD
  heureStr: string; // HH:mm
  juridiction?: string | null;
}

const notified30MinSet = new Set<string>();
const notified15MinSet = new Set<string>();

/**
 * Vérifie si des événements approchent (à 30 min ou 15 min) et émet une alerte pop-up directe
 */
export async function checkUpcomingEventReminders(events: EventReminder[]): Promise<void> {
  const now = new Date();

  for (const evt of events) {
    if (!evt.dateStr || !evt.heureStr) continue;

    try {
      const [year, month, day] = evt.dateStr.slice(0, 10).split('-').map(Number);
      const [hours, minutes]  = evt.heureStr.split(':').map(Number);

      const evtDate = new Date(year, month - 1, day, hours, minutes);
      const diffMs  = evtDate.getTime() - now.getTime();
      const diffMin = Math.round(diffMs / (60 * 1000));

      const eventKey = `${evt.id}_${evt.dateStr.slice(0, 10)}_${evt.heureStr}`;

      // Rappel à 30 minutes (entre 16 min et 30 min)
      if (diffMin > 15 && diffMin <= 30 && !notified30MinSet.has(eventKey)) {
        notified30MinSet.add(eventKey);

        const titreAlert = `⏰ Rappel 30 min : ${evt.titre}`;
        const msgAlert   = `L'événement "${evt.titre}" ${evt.juridiction ? `(${evt.juridiction})` : ''} débute dans environ 30 minutes (${evt.heureStr}) !`;

        Alert.alert(titreAlert, msgAlert);

        try {
          await api.post('/notifications', { titre: titreAlert, message: msgAlert, type: 'rappel' });
        } catch {
          // Ignorer si backend indisponible
        }
      }

      // Rappel urgent à 15 minutes ou immédiatement (entre 0 min et 15 min)
      if (diffMin >= 0 && diffMin <= 15 && !notified15MinSet.has(eventKey)) {
        notified15MinSet.add(eventKey);

        const titreAlert = `🚨 Rappel Imminent (15 min) : ${evt.titre}`;
        const msgAlert   = `Attention : L'événement "${evt.titre}" ${evt.juridiction ? `(${evt.juridiction})` : ''} commence dans ${diffMin === 0 ? 'moins d\'une minute' : `${diffMin} minute(s)`} !`;

        Alert.alert(titreAlert, msgAlert);

        try {
          await api.post('/notifications', { titre: titreAlert, message: msgAlert, type: 'rappel' });
        } catch {
          // Ignorer si backend indisponible
        }
      }
    } catch {
      // Ignorer les erreurs de format date/heure
    }
  }
}
