import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';

interface ToastMessage {
  id: string;
  message: string;
}

export const Toast = () => {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('SHOW_TOAST', (payload) => {
      const newToast = { id: Math.random().toString(), message: payload.message };
      setQueue((prev) => [...prev, newToast]);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !isAnimating.current) {
      showNextToast();
    }
  }, [queue]);

  const showNextToast = () => {
    if (queue.length === 0) return;
    isAnimating.current = true;

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Hold for 2.5 seconds
      setTimeout(() => {
        // Slide out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          setQueue((prev) => prev.slice(1));
          isAnimating.current = false;
        });
      }, 2500);
    });
  };

  if (queue.length === 0 && !isAnimating.current) return null;

  const currentMsg = queue[0]?.message || '';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.text}>{currentMsg}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center'
  }
});
