import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, Bell, Plus, ScanLine, Search } from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import { productsApi, type Product } from '../../../store/api';
import { formatETB } from '../../../constants/format';
import { colors, shadowCard } from '../../../constants/colors';
import { Badge, Mono } from '../../../components/ui';
import { BarcodeScannerModal } from '../../../components/BarcodeScannerModal';

export default function ProductsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setError(null);
    try {
      const res = q.trim() ? await productsApi.search(q.trim()) : await productsApi.list();
      const data = res.data as any;
      setProducts(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setError('Could not load products. Pull to retry.');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      load(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, load]);

  useFocusEffect(
    useCallback(() => {
      load(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load])
  );

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Enable camera access to scan barcodes.');
        return;
      }
    }
    setScannerOpen(true);
  };

  const onScanned = async (barcode: string) => {
    setScannerOpen(false);
    try {
      const res = await productsApi.getByBarcode(barcode);
      router.push(`/(app)/products/${res.data.id}`);
    } catch {
      Alert.alert('Not found', `No product matches barcode ${barcode}.`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(query);
  };

  const renderItem = ({ item }: { item: Product }) => {
    const low = item.current_stock < 10;
    return (
      <TouchableOpacity style={styles.pcard} activeOpacity={0.7} onPress={() => router.push(`/(app)/products/${item.id}`)}>
        <Mono name={item.name} seed={item.id} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.pname} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.pmeta}>{item.category} · {item.unit}</Text>
        </View>
        <View style={styles.pright}>
          {low ? (
            <Badge tone="red" icon={<AlertCircle size={12} color={colors.danger} />}>{item.current_stock} left</Badge>
          ) : (
            <Badge tone="green">{item.current_stock} in stock</Badge>
          )}
          <Text style={styles.pprice}>{formatETB(item.selling_price, false)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Products</Text>
        <View style={styles.bell}><Bell size={21} color={colors.navy} /></View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Search size={20} color={colors.textMuted2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products…"
            placeholderTextColor={colors.textMuted2}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.scanBtn} onPress={openScanner} activeOpacity={0.85}>
            <ScanLine size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, products.length === 0 && styles.grow]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error ?? (query ? 'No products match your search.' : 'No products yet.')}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(app)/products/add')}>
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={onScanned} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  bell: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingLeft: 14, paddingRight: 8, ...shadowCard },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text },
  scanBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  grow: { flexGrow: 1 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  pcard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.card, borderRadius: 15, padding: 13, paddingHorizontal: 14, marginBottom: 11, ...shadowCard },
  pname: { fontSize: 14.5, fontWeight: '700', color: colors.navy, letterSpacing: -0.2 },
  pmeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  pright: { alignItems: 'flex-end', gap: 5 },
  pprice: { fontSize: 15, fontWeight: '700', color: colors.navy, letterSpacing: -0.3 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
