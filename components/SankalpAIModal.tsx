// components/SankalpAIModal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useThemeStore } from '@/lib/store';
import { aiService, Message } from '@/lib/ai';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SankalpAIModalProps {
  visible: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  'How was my business today?',
  'What are my top selling products?',
  'Show pending payments',
  'How much revenue this month?',
  'What do I owe suppliers?',
  'Is my business type good for my location?',
  'Give me tips to grow my business',
];

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content:
    "Namaste! 👋 I'm Sankalp AI, your personal business assistant.\n\nAsk me about your sales, top products, pending payments, supplier dues, tips to grow — or I can give you location-based insights for your business! 🚀",
  timestamp: new Date(),
};

// Typewriter message bubble
const TypewriterMessage = React.memo(({
  content,
  onDone,
}: {
  content: string;
  onDone?: () => void;
}) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');

    const tick = () => {
      if (indexRef.current < content.length) {
        indexRef.current = Math.min(indexRef.current + 2, content.length);
        setDisplayed(content.slice(0, indexRef.current));
        timerRef.current = setTimeout(tick, 12);
      } else {
        onDone?.();
      }
    };

    timerRef.current = setTimeout(tick, 12);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content]);

  return <Text style={styles.botText}>{displayed}</Text>;
});

export const SankalpAIModal: React.FC<SankalpAIModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { 
    canAccessPremium, 
    isLoading: accessLoading,
    refreshAccess 
  } = useSubscriptionAccess(user?.id);

  // Animated dots for loading indicator
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const primary = theme?.colors?.primary ?? '#6366F1';
  const primaryLight = theme?.colors?.primaryLight ?? '#EEF2FF';
  const showLoadingScreen = visible && accessLoading;
  const showLockedScreen = visible && !accessLoading && !canAccessPremium;

  // Animated loading dots
  useEffect(() => {
    if (!isLoading) {
      dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
      return;
    }
    const makeDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(840 - delay),
        ])
      );
    const a1 = makeDotAnim(dot1, 0);
    const a2 = makeDotAnim(dot2, 180);
    const a3 = makeDotAnim(dot3, 360);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([{ ...INITIAL_MESSAGE, id: Date.now().toString(), timestamp: new Date() }]);
    setInputText('');
    setTypingMessageId(null);
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !user?.id) return;

    // Check premium access
    if (!canAccessPremium) {
      const trialEndId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: inputText.trim(),
          timestamp: new Date(),
        },
        {
          id: trialEndId,
          role: 'assistant',
          content: '🔒 Sankalp Pro is required to use AI Assistant.\n\nSubscribe to Sankalp Pro to continue getting AI business insights and recommendations. 📈',
          timestamp: new Date(),
        },
      ]);
      setTypingMessageId(trialEndId);
      setInputText('');
      scrollToBottom();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await aiService.getResponse(userMessage.content, user.id, messages);
      const assistantId = (Date.now() + 1).toString();

      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
      setTypingMessageId(assistantId);
      scrollToBottom();
    } catch {
      const errId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        {
          id: errId,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please check your internet connection and try again.',
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
      setTypingMessageId(errId);
      scrollToBottom();
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isTyping = item.id === typingMessageId;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <View style={[styles.botAvatar, { backgroundColor: primaryLight }]}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: primary }]
            : styles.botBubble,
        ]}>
          {!isUser && isTyping ? (
            <TypewriterMessage
              content={item.content}
              onDone={() => {
                setTypingMessageId(null);
                scrollToBottom();
              }}
            />
          ) : (
            <Text style={isUser ? styles.userText : styles.botText}>{item.content}</Text>
          )}
          <Text style={[styles.timeText, isUser && { color: 'rgba(255,255,255,0.55)' }]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (isLoading) {
      return (
        <View style={[styles.messageRow, styles.assistantRow]}>
          <View style={[styles.botAvatar, { backgroundColor: primaryLight }]}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
          <View style={[styles.bubble, styles.botBubble, { paddingVertical: 14, paddingHorizontal: 18 }]}>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: primary,
                    opacity: dot,
                    transform: [
                      { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                    ],
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (messages.length <= 2) {
      return (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Try asking</Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, { borderColor: primary + '40' }]}
                onPress={() => setInputText(s)}
              >
                <Text style={[styles.chipText, { color: primary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return <View style={{ height: 8 }} />;
  };

  const canSend = !isLoading && !typingMessageId;

  const renderShell = (children: React.ReactNode) => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      {children}
    </Modal>
  );

  // Show upgrade screen if no access
  if (showLoadingScreen) {
    return renderShell(
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <View style={styles.upgradeContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: primaryLight }]}>
            <ActivityIndicator size="large" color={primary} />
          </View>
          <Text style={styles.upgradeTitle}>Checking access</Text>
          <Text style={styles.upgradeSubtitle}>
            Verifying your Sankalp Pro subscription before opening AI Assistant.
          </Text>
        </View>
      </View>,
    );
  }

  if (showLockedScreen) {
    return renderShell(
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <View style={styles.upgradeContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: primaryLight }]}>
            <Ionicons name="lock-closed" size={48} color={primary} />
          </View>
          <Text style={styles.upgradeTitle}>AI Assistant Locked</Text>
          <Text style={styles.upgradeSubtitle}>
            Subscribe to Sankalp Pro to unlock AI-powered business insights and recommendations.
          </Text>
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: primary }]}
            onPress={() => setShowSubscriptionModal(true)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
            <Text style={[styles.maybeLaterText, { color: primary }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>

        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={() => {
            refreshAccess();
            setShowSubscriptionModal(false);
            onClose();
          }}
          userId={user?.id || ''}
        />
      </View>,
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerMid}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerTitle}>Sankalp AI</Text>
          </View>

          <TouchableOpacity
            onPress={resetChat}
            style={styles.iconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={20} color={primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={[styles.inputRow, { borderColor: primary + '30' }]}>
            <TextInput
              style={styles.input}
              placeholder="Message Sankalp AI…"
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={canSend && canAccessPremium}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: primary },
                (!inputText.trim() || !canSend || !canAccessPremium) && styles.sendBtnDim,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || !canSend || !canAccessPremium}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>Sankalp AI can make mistakes. Verify important info.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBF0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E9E9EF',
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  botText: {
    color: '#1F2937',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  suggestionsWrap: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#fff',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EBEBF0',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    fontWeight: '400',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendBtnDim: {
    backgroundColor: '#D1D5DB',
  },
  disclaimer: {
    fontSize: 11,
    color: '#C9C9C9',
    textAlign: 'center',
    marginTop: 7,
    fontWeight: '500',
  },
  upgradeContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  upgradeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});