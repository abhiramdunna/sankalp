import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTheme } from '@/constants/theme';

interface PremiumAccessOverlayProps {
  visible: boolean;
  featureName: string; // e.g., "AI Assistant" or "Analytics"
  onUpgradePress: () => void;
  onClose: () => void;
  theme: AppTheme;
  trialDaysLeft?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PremiumAccessOverlay: React.FC<PremiumAccessOverlayProps> = ({
  visible,
  featureName,
  onUpgradePress,
  onClose,
  theme,
  trialDaysLeft,
}) => {
  if (!visible) return null;

  const isPremiumRunning = featureName === 'Analytics' && trialDaysLeft !== undefined && trialDaysLeft === -1;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Semi-transparent backdrop */}
        <View style={styles.backdrop} />

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
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}> 
              {isPremiumRunning
                ? `${featureName} Running in Background`
                : `Activate Sankalp Pro`}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {isPremiumRunning
                ? `Your ${featureName.toLowerCase()} data is being collected. Upgrade to Sankalp Pro to view detailed insights.`
                : `Unlock full access to ${featureName} with Sankalp Pro subscription.\n\nGet premium features, advanced analytics, and priority support.`}
            </Text>

            {/* Trial Days Left (if applicable) */}
            {trialDaysLeft !== undefined && trialDaysLeft > 0 && (
              <View
                style={[
                  styles.trialBadge,
                  { backgroundColor: theme.colors.primary + '20' },
                ]}
              >
                <Ionicons
                  name="gift-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.trialText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} of free trial remaining
                </Text>
              </View>
            )}

            {/* CTA Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.closeButton, { borderColor: theme.colors.primary }]}
                onPress={onClose}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                  Not Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={onUpgradePress}
              >
                <Ionicons name="star" size={18} color="#fff" />
                <Text style={styles.upgradeButtonText}>
                  Upgrade Now
                </Text>
              </TouchableOpacity>
            </View>

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
    </Modal>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  benefitsContainer: {
    gap: 8,
    paddingTop: 12,
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
