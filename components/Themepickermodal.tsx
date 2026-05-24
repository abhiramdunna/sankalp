// components/ThemePickerModal.tsx
// Drop this file into your components/ folder and import it in home.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/lib/store';
import { THEMES, ThemeId, DEFAULT_THEME_ID } from '@/constants/theme';

interface ThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ThemePickerModal({ visible, onClose }: ThemePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { themeId, setTheme, theme } = useThemeStore();

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME_ID);
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Choose Theme</Text>
              <Text style={styles.subtitle}>Personalise your app appearance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Theme grid */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <View style={styles.grid}>
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id];
                const isActive = themeId === id;
                const isDefault = id === DEFAULT_THEME_ID;

                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.card,
                      isActive && { borderColor: t.colors.primary, borderWidth: 2.5 },
                    ]}
                    onPress={() => handleSelect(id)}
                    activeOpacity={0.8}
                  >
                    {/* Gradient swatch */}
                    <LinearGradient
                      colors={t.preview as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.swatch}
                    >
                      {/* Mini UI preview */}
                      <View style={styles.previewBar}>
                        <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
                        <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                        <View style={[styles.previewDot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
                      </View>
                      {isActive && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>

                    {/* Labels */}
                    <View style={styles.cardBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.themeName}>{t.name}</Text>
                        {isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.themeDesc}>{t.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Reset to default button — only visible when a non-default theme is active */}
          {themeId !== DEFAULT_THEME_ID && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>Reset to Default Theme</Text>
            </TouchableOpacity>
          )}

          {/* Apply / Done button */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: '47%',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  swatch: {
    height: 72,
    justifyContent: 'space-between',
    padding: 10,
  },
  previewBar: {
    flexDirection: 'row',
    gap: 4,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  cardBody: {
    padding: 10,
    gap: 2,
  },
  themeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111',
  },
  themeDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  defaultBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4F46E5',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    elevation: 2,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});