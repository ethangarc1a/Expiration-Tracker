import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface ImageCarouselProps {
  uris: string[];
  height?: number;
}

export function ImageCarousel({ uris, height = 180 }: ImageCarouselProps) {
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();

  const dots = useMemo(() => uris.map((_, i) => i), [uris]);

  if (uris.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          const newIndex = Math.round(x / event.nativeEvent.layoutMeasurement.width);
          setIndex(newIndex);
        }}
        scrollEventThrottle={16}
      >
        {uris.map((uri) => (
          <Image
            key={uri}
            source={{ uri }}
            style={[styles.image, { height, width: width - 40 }]}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {dots.map((dot) => (
          <View
            key={`dot-${dot}`}
            style={[
              styles.dot,
              {
                backgroundColor: dot === index ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    borderRadius: 16,
    marginRight: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
