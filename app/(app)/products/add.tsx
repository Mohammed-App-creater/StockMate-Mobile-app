import { ReactNode, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, Check, Folder, Layers, ScanLine, Tag, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import { PRODUCT_UNITS, productsApi, type ProductUnit } from '../../../store/api';
import { colors, shadowCard } from '../../../constants/colors';
import { Navbar } from '../../../components/Navbar';
import { BarcodeScannerModal } from '../../../components/BarcodeScannerModal';

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

export default function AddProductScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('piece');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [currentStock, setCurrentStock] = useState('0');

  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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

  const submit = async () => {
    if (!name.trim() || !category.trim() || !buyingPrice || !sellingPrice) {
      Alert.alert('Missing fields', 'Name, category, buying price and selling price are required.');
      return;
    }
    setSubmitting(true);
    try {
      await productsApi.create({
        name: name.trim(),
        category: category.trim(),
        unit,
        buying_price: Number(buyingPrice),
        selling_price: Number(sellingPrice),
        barcode: barcode.trim() || null,
        current_stock: parseInt(currentStock, 10) || 0,
      });
      router.back();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Could not save', typeof detail === 'string' ? detail : 'Please check the fields and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar title="Add Product" subtitle="New inventory item" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Field icon={<Tag size={16} color={colors.textMuted} />} label="Product Name">
          <View style={styles.input}>
            <TextInput style={styles.inputText} value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.textMuted2} />
          </View>
        </Field>

        <Field icon={<Folder size={16} color={colors.textMuted} />} label="Category">
          <View style={styles.input}>
            <TextInput style={styles.inputText} value={category} onChangeText={setCategory} placeholder="e.g. Cooking Oil" placeholderTextColor={colors.textMuted2} />
          </View>
        </Field>

        <Field icon={<Layers size={16} color={colors.textMuted} />} label="Unit">
          <View style={styles.segment}>
            {PRODUCT_UNITS.map((u) => {
              const on = unit === u;
              return (
                <TouchableOpacity key={u} style={[styles.segOpt, on && styles.segOptOn]} onPress={() => setUnit(u)} activeOpacity={0.8}>
                  <Text style={[styles.segText, on && styles.segTextOn]}>{u}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Field icon={<TrendingDown size={16} color={colors.textMuted} />} label="Buying Price">
              <View style={styles.input}>
                <TextInput style={styles.inputText} value={buyingPrice} onChangeText={setBuyingPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted2} />
                <Text style={styles.affix}>ETB</Text>
              </View>
            </Field>
          </View>
          <View style={styles.flex1}>
            <Field icon={<TrendingUp size={16} color={colors.textMuted} />} label="Selling Price">
              <View style={styles.input}>
                <TextInput style={styles.inputText} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted2} />
                <Text style={styles.affix}>ETB</Text>
              </View>
            </Field>
          </View>
        </View>

        <Field icon={<Layers size={16} color={colors.textMuted} />} label="Current Stock">
          <View style={styles.input}>
            <TextInput style={styles.inputText} value={currentStock} onChangeText={setCurrentStock} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted2} />
          </View>
        </Field>

        <Field icon={<ScanLine size={16} color={colors.textMuted} />} label="Barcode">
          <View style={styles.input}>
            <TextInput style={[styles.inputText, { paddingRight: 48 }]} value={barcode} onChangeText={setBarcode} placeholder="Scan or type" placeholderTextColor={colors.textMuted2} autoCapitalize="none" />
            <TouchableOpacity style={styles.camera} onPress={openScanner} activeOpacity={0.85}>
              <Camera size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Field>
      </ScrollView>

      <View style={styles.foot}>
        <TouchableOpacity style={[styles.saveBtn, submitting && styles.disabled]} onPress={submit} disabled={submitting} activeOpacity={0.9}>
          <Check size={20} color="#fff" />
          <Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save Product'}</Text>
        </TouchableOpacity>
      </View>

      <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={(d) => { setBarcode(d); setScannerOpen(false); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  field: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  input: {
    minHeight: 50,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 13 },
  affix: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  camera: { position: 'absolute', right: 7, width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  segOpt: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOptOn: { backgroundColor: '#fff', ...shadowCard },
  segText: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
  segTextOn: { color: colors.primary },
  foot: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  saveBtn: { height: 54, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  disabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
