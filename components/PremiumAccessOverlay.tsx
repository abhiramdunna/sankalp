import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme } from '@/constants/theme';

interface PremiumAccessOverlayProps {
  visible: boolean;
  featureName: string; // e.g., "AI Assistant" or "Analytics"
  onUpgradePress: () => void;
  onClose: () => void;
  theme: AppTheme;
}

export const PremiumAccessOverlay: React.FC<PremiumAccessOverlayProps> = ({
  visible,
  featureName,
  onUpgradePress,
  onClose,
  theme,
}) => {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View pointerEvents="auto" style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Semi-transparent backdrop */}
      <View pointerEvents="none" style={styles.backdrop} />

      {/* Content Card */}
      <View style={styles.contentContainer}>
        <LinearGradient
          colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconBox,
              { backgroundColor: theme.colors.primary + '20' },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={40}
              color={theme.colors.primary}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Activate Sankalp Pro</Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Unlock full access to {featureName} with Sankalp Pro subscription.{"\n\n"}
            Get premium features, advanced analytics, and priority support.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            <BenefitItem
              icon="analytics-outline"
              text="Advanced Analytics"
              color={theme.colors.primary}
            />
            <BenefitItem
              icon="chatbubble-outline"
              text="AI Assistant Access"
              color={theme.colors.primary}
            />
            <BenefitItem
              icon="stats-chart-outline"
              text="Detailed Reports"
              color={theme.colors.primary}
            />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const BenefitItem: React.FC<{
  icon: string;
  text: string;
  color: string;
}> = ({ icon, text, color }) => (
  <View style={styles.benefitItem}>
    <View style={[styles.benefitIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    width: '85%',
    maxWidth: 350,
    zIndex: 10,
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
  },
  benefitsContainer: {
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
});
