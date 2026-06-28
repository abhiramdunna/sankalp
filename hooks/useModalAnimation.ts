// ─────────────────────────────────────────────────────────────────────────────
// FILE: hooks/useModalAnimation.ts
//
// One hook, one animation curve for every modal in the app.
// Drop this file in your hooks/ folder, then apply the component patches below.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type Direction = 'up' | 'right';   // up = bottom-sheet, right = full-screen push

interface UseModalAnimationOptions {
  direction?: Direction;
  distance: number;           // SCREEN_HEIGHT for 'up', SCREEN_WIDTH for 'right'
  duration?: number;          // ms for enter (exit is half)
}

/**
 * Returns { animValue, slideIn, slideOut }
 *
 * animValue starts at `distance` (off-screen) and animates to 0 (on-screen).
 *
 * slideIn()  — call when modal becomes visible
 * slideOut() — call when modal should close; invokes `onDone` when animation ends
 */
export function useModalAnimation({
  direction = 'up',
  distance,
  duration = 320,
}: UseModalAnimationOptions) {
  const animValue = useRef(new Animated.Value(distance)).current;

  const slideIn = useCallback(() => {
    animValue.setValue(distance);
    Animated.timing(animValue, {
      toValue: 0,
      duration,
      // Cubic ease-out: fast start, smooth deceleration — feels like real physics
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animValue, distance, duration]);

  const slideOut = useCallback(
    (onDone?: () => void) => {
      Animated.timing(animValue, {
        toValue: distance,
        duration: Math.round(duration * 0.55),   // exit is snappier
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onDone?.());
    },
    [animValue, distance, duration],
  );

  const transform =
    direction === 'up'
      ? [{ translateY: animValue }]
      : [{ translateX: animValue }];

  return { animValue, slideIn, slideOut, transform };
}


// ─────────────────────────────────────────────────────────────────────────────
// PATCHES — replace the marked blocks in home.tsx
//
// Every patch is self-contained.  Search for the "── FIND ──" comment,
// delete that block, and paste the "── REPLACE WITH ──" block in its place.
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
// PATCH 1 — LiveBillingModal
// Problem: slideY.setValue(0) — instant teleport, no animation
// ═════════════════════════════════════════════════════════════════════════════

// ── FIND (inside LiveBillingModal, around line 233) ──
/*
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      slideY.setValue(0);
    }
  }, [visible]);
*/

// ── REPLACE WITH ──
/*
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const { transform: slideTransform, slideIn: slideModalIn } = useModalAnimation({
    direction: 'right',
    distance: Dimensions.get('window').width,
    duration: 300,
  });

  useEffect(() => {
    if (visible) slideModalIn();
  }, [visible]);
*/

// Then find the Animated.View that uses slideY:
// ── FIND ──
/*
  <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateY: slideY }], opacity: modalOpacity }}>
*/
// ── REPLACE WITH ──
/*
  <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: slideTransform, opacity: modalOpacity }}>
*/


// ═════════════════════════════════════════════════════════════════════════════
// PATCH 2 — QuickEntrySlideWrapper
// Problem: slideX.setValue(0) — instant teleport, no animation
// ═════════════════════════════════════════════════════════════════════════════

// ── FIND (around line 558) ──
/*
const QuickEntrySlideWrapper = memo(({ visible, onClose, theme, insets, children }) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const slideX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      slideX.setValue(0);
    }
  }, [visible]);

  const handleAnimatedClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!visible) return null;

  const childWithClose = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, { __onAnimatedClose: handleAnimatedClose })
    : children;

  return (
    <Modal animationType="none" transparent={false} visible={visible} onRequestClose={handleAnimatedClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateX: slideX }] }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {childWithClose}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
});
*/

// ── REPLACE WITH ──
/*
const QuickEntrySlideWrapper = memo(({ visible, onClose, theme, insets, children }) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const { transform: slideTransform, slideIn: slideModalIn, slideOut: slideModalOut } = useModalAnimation({
    direction: 'right',
    distance: SCREEN_WIDTH,
    duration: 300,
  });

  useEffect(() => {
    if (visible) slideModalIn();
  }, [visible]);

  const handleAnimatedClose = useCallback(() => {
    slideModalOut(onClose);          // animate OUT first, then call onClose
  }, [onClose, slideModalOut]);

  if (!visible) return null;

  const childWithClose = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, { __onAnimatedClose: handleAnimatedClose })
    : children;

  return (
    <Modal animationType="none" transparent={false} visible={visible} onRequestClose={handleAnimatedClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: slideTransform }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {childWithClose}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
});
*/


// ═════════════════════════════════════════════════════════════════════════════
// PATCH 3 — ProfileModal
// Problem: spring with tension:65/friction:11 overshoots and bounces
// ═════════════════════════════════════════════════════════════════════════════

// ── FIND (inside ProfileModal, around line 1454) ──
/*
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      ...
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      ...
    }
  }, [visible, slideAnim, shineAnim]);
*/

// ── REPLACE WITH ──
/*
  const { transform: slideTransform, slideIn: slideModalIn, slideOut: slideModalOut } = useModalAnimation({
    direction: 'up',
    distance: SCREEN_HEIGHT,
    duration: 340,
  });

  useEffect(() => {
    if (visible) {
      slideModalIn();
      // shine loop (unchanged)
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, { toValue: 220, duration: 1400, useNativeDriver: true }),
          Animated.delay(1800),
          Animated.timing(shineAnim, { toValue: -120, duration: 0, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      shineAnim.setValue(-120);
    }
  }, [visible]);
*/

// Then update the Animated.View in ProfileModal's return:
// ── FIND ──
/*
  <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateY: slideAnim }] }}>
*/
// ── REPLACE WITH ──
/*
  <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: slideTransform }}>
*/

// Also update the onClose handlers that should animate out:
// In ProfileModal, any onClose/onBack button should call:
//   slideModalOut(onClose)
// instead of just onClose().
// But since ProfileModal is memo'd and receives onClose as prop, the simplest
// approach is to add a local handler:
/*
  const handleClose = useCallback(() => slideModalOut(onClose), [onClose, slideModalOut]);
*/
// Then replace every onClose reference inside ProfileModal's JSX with handleClose.


// ═════════════════════════════════════════════════════════════════════════════
// PATCH 4 — ReviewBillModal  (bottom-sheet, currently animationType="slide")
// Problem: OS default slide is ~400ms and doesn't match the rest of the app
// ═════════════════════════════════════════════════════════════════════════════

// In ReviewBillModal, add inside the component:
/*
  const { height: SH } = Dimensions.get('window');
  const { transform: sheetTransform, slideIn: sheetIn } = useModalAnimation({
    direction: 'up',
    distance: SH,
    duration: 300,
  });
  useEffect(() => { if (visible) sheetIn(); }, [visible]);
*/

// ── FIND ──
/*
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, ... }}>
*/

// ── REPLACE WITH ──
/*
  <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
      <Animated.View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: SCREEN_HEIGHT * 0.92, transform: sheetTransform }}>
*/
// (change closing </View> to </Animated.View> for the sheet container only)


// ═════════════════════════════════════════════════════════════════════════════
// PATCH 5 — QuickBillReviewModal  (same issue as ReviewBillModal)
// ═════════════════════════════════════════════════════════════════════════════

// In QuickBillReviewModal, add inside the component (before the early return):
/*
  const { height: SH } = Dimensions.get('window');
  const { transform: sheetTransform, slideIn: sheetIn } = useModalAnimation({
    direction: 'up',
    distance: SH,
    duration: 300,
  });
  useEffect(() => { if (visible && data) sheetIn(); }, [visible, data]);
*/

// ── FIND ──
/*
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, ... }}>
*/

// ── REPLACE WITH ──
/*
  <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
      <Animated.View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', transform: sheetTransform }}>
*/
// (change closing </View> to </Animated.View> for the sheet container only)


// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY OF WHAT EACH PATCH FIXES
// ═════════════════════════════════════════════════════════════════════════════
//
// | Modal                  | Before               | After                        |
// |------------------------|----------------------|------------------------------|
// | LiveBillingModal       | Instant pop (no anim)| 300ms cubic ease-out slide   |
// | QuickEntrySlideWrapper | Instant pop (no anim)| 300ms cubic ease-out + exit  |
// | ProfileModal           | Bouncy spring        | 340ms cubic ease-out         |
// | ReviewBillModal        | OS 400ms slow slide  | 300ms cubic ease-out         |
// | QuickBillReviewModal   | OS 400ms slow slide  | 300ms cubic ease-out         |
//
// Easing.out(Easing.cubic) is the same curve used by:
//   - iOS system sheets (UISheetPresentationController)
//   - Material Design bottom sheets
//   - WhatsApp, Swiggy, most top-tier apps
// It decelerates naturally instead of cutting off or bouncing.