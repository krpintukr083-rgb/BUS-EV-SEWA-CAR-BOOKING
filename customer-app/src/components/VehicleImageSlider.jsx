import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getAllVehicleImages } from '../utils/imageUrl';

const VEHICLE_ICONS = {
  Bus: 'bus-outline',
  'EV-Sewa': 'flash-outline',
  Car: 'car-outline'
};

const VehicleImageSlider = ({ vehicle, type, style, imageStyle }) => {
  const listRef = useRef(null);
  const currentIndex = useRef(0);
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState(() => new Set());
  const allImages = useMemo(
    () => getAllVehicleImages(vehicle, type).filter(url => typeof url === 'string' && url.trim()),
    [vehicle, type]
  );
  const images = allImages.filter(url => !failedImages.has(url));
  const slideWidth = containerWidth || windowWidth - 32;

  useEffect(() => {
    currentIndex.current = 0;
    setActiveIndex(0);
    setFailedImages(new Set());
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [vehicle?._id]);

  useEffect(() => {
    if (activeIndex >= images.length) {
      const nextIndex = Math.max(0, images.length - 1);
      currentIndex.current = nextIndex;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToOffset({ offset: nextIndex * slideWidth, animated: false });
    }
  }, [activeIndex, images.length, slideWidth]);

  useEffect(() => {
    if (images.length < 2 || !containerWidth) return undefined;
    const timer = setInterval(() => {
      const nextIndex = (currentIndex.current + 1) % images.length;
      currentIndex.current = nextIndex;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToOffset({ offset: nextIndex * containerWidth, animated: true });
    }, 3000);
    return () => clearInterval(timer);
  }, [containerWidth, images.length]);

  const selectImage = index => {
    currentIndex.current = index;
    setActiveIndex(index);
    listRef.current?.scrollToOffset({ offset: index * slideWidth, animated: true });
  };

  const handleScrollEnd = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    const boundedIndex = Math.min(Math.max(index, 0), images.length - 1);
    currentIndex.current = boundedIndex;
    setActiveIndex(boundedIndex);
  };

  const handleImageError = uri => {
    setFailedImages(previous => {
      const next = new Set(previous);
      next.add(uri);
      return next;
    });
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {images.length > 0 ? (
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          snapToInterval={slideWidth}
          snapToAlignment="start"
          decelerationRate="fast"
          bounces={false}
          style={styles.list}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          getItemLayout={(_, index) => ({
            length: slideWidth,
            offset: slideWidth * index,
            index
          })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={{ width: slideWidth, height: '100%' }}>
              <Image
                source={{ uri: item }}
                style={[styles.image, imageStyle]}
                resizeMode="cover"
                onError={() => handleImageError(item)}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.fallback}>
          <Ionicons name={VEHICLE_ICONS[type] || 'car-outline'} size={72} color={COLORS.textLight} />
        </View>
      )}

      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((uri, index) => (
            <TouchableOpacity
              key={`${uri}-dot`}
              accessibilityRole="button"
              accessibilityLabel={`Show image ${index + 1}`}
              onPress={() => selectImage(index)}
              style={[styles.dot, activeIndex === index && styles.activeDot]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: 190,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden'
  },
  list: { flex: 1 },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.3)'
  },
  activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary, borderColor: '#ffffff' }
});

export default VehicleImageSlider;
