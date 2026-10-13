import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  category: 'Supplements' | 'Wellness' | 'Skincare';
  image: string;
}

const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Multivitamin',
    subtitle: 'Daily wellness support',
    price: '₹ 1,499',
    category: 'Supplements',
    image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg',
  },
  {
    id: 'prod-2',
    name: 'Protein Powder',
    subtitle: 'Builds muscle & energy',
    price: '₹ 2,499',
    category: 'Supplements',
    image: 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg',
  },
  {
    id: 'prod-3',
    name: 'Omega 3 Fish Oil',
    subtitle: 'Heart & brain health',
    price: '₹ 1,999',
    category: 'Wellness',
    image: 'https://images.pexels.com/photos/5938356/pexels-photo-5938356.jpeg',
  },
  {
    id: 'prod-4',
    name: 'Collagen Peptides',
    subtitle: 'Healthy skin & joints',
    price: '₹ 2,799',
    category: 'Skincare',
    image: 'https://images.pexels.com/photos/3683077/pexels-photo-3683077.jpeg',
  },
  {
    id: 'prod-5',
    name: 'Apple Cider Vinegar Gummies',
    subtitle: 'Metabolism & digestive health',
    price: '₹ 999',
    category: 'Wellness',
    image: 'https://images.pexels.com/photos/3683081/pexels-photo-3683081.jpeg',
  },
];

export default function BuyProductsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Supplements' | 'Wellness' | 'Skincare'>('All');
  const [cartCount, setCartCount] = useState(0);

  const filteredProducts = PRODUCTS.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category === selectedCategory;
  });

  const handleAddToCart = (product: Product) => {
    setCartCount((c) => c + 1);
    Alert.alert('Item Added', `${product.name} added to your health cart.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Buy Products</Text>

        <TouchableOpacity
          style={styles.cartIconBtn}
          onPress={() => Alert.alert('Cart', `You have ${cartCount} items in your basket.`)}
        >
          <Ionicons name="cart-outline" size={22} color="#0F172A" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Pills */}
        <View style={styles.filtersRow}>
          {(['All', 'Supplements', 'Wellness', 'Skincare'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterPill,
                selectedCategory === cat && styles.filterPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategory === cat && styles.filterPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Product Cards */}
        <View style={styles.productsList}>
          {filteredProducts.map((item) => (
            <View key={item.id} style={styles.productCard}>
              <Image source={{ uri: item.image }} style={styles.productImage} />

              <View style={styles.productInfoCol}>
                <Text style={styles.productTitle}>{item.name}</Text>
                <Text style={styles.productSubtitle}>{item.subtitle}</Text>
                <Text style={styles.productPrice}>{item.price}</Text>
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.85}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#0A8554',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0A8554',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#F8FAFC',
  },
  productInfoCol: {
    flex: 1,
    gap: 2,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  productSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A8554',
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: '#0A8554',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
