/**
 * src/components/DateTimePickerModal.tsx
 * Modal Pop-up interactif pour la sélection intuitive de la Date & de l'Heure.
 *
 * Fonctionnalités :
 *  1. Pop-up Calendrier visuel avec grille du mois.
 *  2. Désactivation stricte des dates passées (impossible de sélectionner une date antérieure à aujourd'hui).
 *  3. Pop-up Sélection d'heure intuitive (Grille des heures & minutes :00, :15, :30, :45).
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react-native';
import { AppColors as C } from '@/constants/theme';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const HOURS = Array.from({ length: 14 }, (_, i) => String(i + 7).padStart(2, '0')); // 07:00 -> 20:00
const MINUTES = ['00', '15', '30', '45'];

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDateStr: string; // Format YYYY-MM-DD
  selectedTimeStr: string; // Format HH:mm
  onSelectDate: (dateStr: string) => void;
  onSelectTime: (timeStr: string) => void;
  minDateToday?: boolean; // Bloque les dates passées
}

export function DateTimePickerModal({
  visible,
  onClose,
  selectedDateStr,
  selectedTimeStr,
  onSelectDate,
  onSelectTime,
  minDateToday = true,
}: DateTimePickerModalProps) {
  const [tab, setTab] = useState<'date' | 'time'>('date');

  // Date du jour pour comparaison
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  // Mois affiché dans le calendrier
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDateStr && selectedDateStr.length === 10) {
      const parsed = new Date(selectedDateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Matrice des jours du mois
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);

    // Jour de la semaine (0 = Dim, 1 = Lun ... 6 = Sam -> Convertir en 0 = Lun ... 6 = Dim)
    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const totalDays = lastDay.getDate();
    const days: Array<{ dateStr: string; dayNum: number; isPast: boolean; isCurrentMonth: boolean }> = [];

    // Jours vides au début
    for (let i = 0; i < startDayIndex; i++) {
      days.push({ dateStr: '', dayNum: 0, isPast: true, isCurrentMonth: false });
    }

    // Jours du mois courant
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = minDateToday && dateObj < today;

      days.push({ dateStr, dayNum: d, isPast, isCurrentMonth: true });
    }

    return days;
  }, [year, month, today, minDateToday]);

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Heure & minutes sélectionnées
  const [curHour, curMin] = useMemo(() => {
    const parts = (selectedTimeStr || '09:00').split(':');
    return [parts[0] || '09', parts[1] || '00'];
  }, [selectedTimeStr]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />

          {/* En-tête avec onglets Date / Heure */}
          <View style={s.tabsHeader}>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'date' && s.tabBtnActive]}
              onPress={() => setTab('date')}
              activeOpacity={0.8}
            >
              <Calendar color={tab === 'date' ? C.amber500 : C.gray400} size={18} />
              <Text style={[s.tabText, tab === 'date' && s.tabTextActive]}>
                {selectedDateStr || 'Choisir Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, tab === 'time' && s.tabBtnActive]}
              onPress={() => setTab('time')}
              activeOpacity={0.8}
            >
              <Clock color={tab === 'time' ? C.amber500 : C.gray400} size={18} />
              <Text style={[s.tabText, tab === 'time' && s.tabTextActive]}>
                {selectedTimeStr || '09:00'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X color={C.gray500} size={18} />
            </TouchableOpacity>
          </View>

          {/* TAB 1 : CALENDRIER VISUEL */}
          {tab === 'date' && (
            <View style={s.calendarWrap}>
              {/* En-tête mois */}
              <View style={s.monthHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={s.navBtn}>
                  <ChevronLeft color={C.gray700} size={20} />
                </TouchableOpacity>
                <Text style={s.monthTitle}>
                  {MONTHS_FR[month]} {year}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={s.navBtn}>
                  <ChevronRight color={C.gray700} size={20} />
                </TouchableOpacity>
              </View>

              {/* Jours de la semaine */}
              <View style={s.weekDaysRow}>
                {DAYS_FR.map(d => (
                  <Text key={d} style={s.weekDayText}>{d}</Text>
                ))}
              </View>

              {/* Grille des jours */}
              <View style={s.daysGrid}>
                {daysInMonth.map((item, index) => {
                  if (!item.isCurrentMonth) {
                    return <View key={`empty-${index}`} style={s.dayCellEmpty} />;
                  }

                  const isSelected = item.dateStr === selectedDateStr;
                  const isTodayStr = item.dateStr === todayStr;

                  return (
                    <TouchableOpacity
                      key={item.dateStr}
                      disabled={item.isPast}
                      onPress={() => {
                        onSelectDate(item.dateStr);
                        setTab('time'); // Bascule automatique sur le choix de l'heure
                      }}
                      style={[
                        s.dayCell,
                        isTodayStr && s.dayCellToday,
                        isSelected && s.dayCellSelected,
                        item.isPast && s.dayCellDisabled,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          s.dayText,
                          isTodayStr && s.dayTextToday,
                          isSelected && s.dayTextSelected,
                          item.isPast && s.dayTextDisabled,
                        ]}
                      >
                        {item.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {minDateToday && (
                <Text style={s.infoText}>⚠️ Les dates passées ne peuvent pas être choisies.</Text>
              )}
            </View>
          )}

          {/* TAB 2 : SELECTION DE L'HEURE */}
          {tab === 'time' && (
            <View style={s.timeWrap}>
              <Text style={s.timeTitle}>Sélectionnez l'heure de l'événement</Text>

              <View style={s.timeSelectionRow}>
                {/* Colonne des heures */}
                <View style={{ flex: 1 }}>
                  <Text style={s.timeColHeader}>Heures</Text>
                  <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    <View style={s.timeGrid}>
                      {HOURS.map(h => {
                        const active = h === curHour;
                        return (
                          <TouchableOpacity
                            key={h}
                            onPress={() => onSelectTime(`${h}:${curMin}`)}
                            style={[s.timeChip, active && s.timeChipActive]}
                          >
                            <Text style={[s.timeChipText, active && s.timeChipTextActive]}>{h}h</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Colonne des minutes */}
                <View style={{ width: 100 }}>
                  <Text style={s.timeColHeader}>Minutes</Text>
                  <View style={{ gap: 8 }}>
                    {MINUTES.map(m => {
                      const active = m === curMin;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => onSelectTime(`${curHour}:${m}`)}
                          style={[s.timeChip, active && s.timeChipActive]}
                        >
                          <Text style={[s.timeChipText, active && s.timeChipTextActive]}>:{m}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={s.confirmBtn} onPress={onClose} activeOpacity={0.85}>
                <Check color={C.gray900} size={18} />
                <Text style={s.confirmBtnText}>Valider ({selectedDateStr} à {selectedTimeStr})</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  tabsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  tabBtnActive: { backgroundColor: C.amber50, borderColor: C.amber500 },
  tabText: { fontSize: 13, fontWeight: '600', color: C.gray600 },
  tabTextActive: { color: C.gray900, fontWeight: '700' },
  closeBtn: { padding: 8, backgroundColor: C.gray100, borderRadius: 12 },
  calendarWrap: { gap: 12 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: C.gray900 },
  navBtn: { padding: 6, backgroundColor: C.gray100, borderRadius: 10 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: C.gray200, paddingBottom: 8 },
  weekDayText: { fontSize: 12, fontWeight: '600', color: C.gray400, width: 40, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCellEmpty: { width: '14.28%', height: 42 },
  dayCell: { width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'center', marginVertical: 2, borderRadius: 10 },
  dayCellToday: { borderWidth: 1.5, borderColor: C.amber500 },
  dayCellSelected: { backgroundColor: C.amber500 },
  dayCellDisabled: { backgroundColor: C.gray100, opacity: 0.35 },
  dayText: { fontSize: 14, fontWeight: '600', color: C.gray900 },
  dayTextToday: { color: C.amber600, fontWeight: '700' },
  dayTextSelected: { color: C.gray900, fontWeight: '800' },
  dayTextDisabled: { color: C.gray400, textDecorationLine: 'line-through' },
  infoText: { fontSize: 11, color: C.gray500, textAlign: 'center', marginTop: 6 },
  timeWrap: { gap: 14 },
  timeTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, textAlign: 'center' },
  timeSelectionRow: { flexDirection: 'row', gap: 12 },
  timeColHeader: { fontSize: 12, fontWeight: '700', color: C.gray500, marginBottom: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200, minWidth: 50, alignItems: 'center' },
  timeChipActive: { backgroundColor: C.amber500, borderColor: C.amber500 },
  timeChipText: { fontSize: 13, fontWeight: '600', color: C.gray700 },
  timeChipTextActive: { color: C.gray900, fontWeight: '800' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.amber500, borderRadius: 14, paddingVertical: 14, marginTop: 10 },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: C.gray900 },
});
