import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { PRODUCT_UNITS, productsApi, type ProductUnit } from '../../../store/api';
import { colors } from '../../../constants/colors';

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

  const onScanned = (data: string) => {
    setBarcode(data);
    setScannerOpen(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Name *">
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.textMuted} />
      </Field>

      <Field label="Category *">
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Grains" placeholderTextColor={colors.textMuted} />
      </Field>

      <Field label="Unit *">
        <View style={styles.pickerWrap}>
          <Picker selectedValue={unit} onValueChange={(v) => setUnit(v as ProductUnit)}>
            {PRODUCT_UNITS.map((u) => (
              <Picker.Item key={u} label={u} value={u} />
            ))}
          </Picker>
        </View>
      </Field>

      <View style={styles.row}>
        <Field label="Buying price *" style={styles.flex1}>
          <TextInput style={styles.input} value={buyingPrice} onChangeText={setBuyingPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />
        </Field>
        <Field label="Selling price *" style={styles.flex1}>
          <TextInput style={styles.input} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />
        </Field>
      </View>

      <Field label="Barcode">
        <View style={styles.barcodeRow}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Scan or type"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.8}>
            <Text style={styles.scanIcon}>📷</Text>
          </TouchableOpacity>
        </View>
      </Field>

      <Field label="Current stock">
        <TextInput style={styles.input} value={currentStock} onChangeText={setCurrentStock} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} />
      </Field>

      <TouchableOpacity
        style={[styles.submit, submitting && styles.submitDisabled]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        <Text style={styles.submitText}>{submitting ? 'Saving…' : 'Save Product'}</Text>
      </TouchableOpacity>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.cameraContainer}>
          {scannerOpen && (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={({ data }) => onScanned(data)}
            />
          )}
          <View style={styles.scanFrame} pointerEvents="none" />
          <Text style={styles.scanHint}>Point the camera at a barcode</Text>
          <TouchableOpacity style={styles.cancelScan} onPress={() => setScannerOpen(false)} activeOpacity={0.85}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barcodeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  scanButton: {
    width: 50,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIcon: { fontSize: 22 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cameraContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanHint: { color: colors.white, marginTop: 20, fontSize: 15 },
  cancelScan: {
    position: 'absolute',
    bottom: 48,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
  },
  cancelScanText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
