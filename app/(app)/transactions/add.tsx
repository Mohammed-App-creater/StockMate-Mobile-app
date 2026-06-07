import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  productsApi,
  transactionsApi,
  type Product,
  type TransactionType,
} from '../../../store/api';
import { toNumber } from '../../../constants/format';
import { colors } from '../../../constants/colors';

interface SplitRow {
  id: number;
  quantity: string;
  has_receipt: boolean;
}

export default function AddTransactionScreen() {
  const router = useRouter();
  // Dashboard "Record Sale/Purchase" buttons pass ?type=sale|purchase.
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType: TransactionType = params.type === 'sale' ? 'sale' : 'purchase';
  const splitIdRef = useRef(2);

  // Product selection
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transaction fields
  const [type, setType] = useState<TransactionType>(initialType);
  const [totalQuantity, setTotalQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [splits, setSplits] = useState<SplitRow[]>([
    { id: 0, quantity: '', has_receipt: true },
    { id: 1, quantity: '', has_receipt: false },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Debounced product search; skip while a product is already selected.
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productsApi.search(query.trim());
        const data = res.data as any;
        setResults(Array.isArray(data) ? data : data?.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const selectProduct = (p: Product) => {
    setSelected(p);
    setResults([]);
    setQuery('');
    if (!unitPrice) {
      // Pre-fill a sensible default price based on transaction type.
      setUnitPrice(type === 'sale' ? p.selling_price : p.buying_price);
    }
  };

  const addSplit = () =>
    setSplits((s) => [...s, { id: splitIdRef.current++, quantity: '', has_receipt: true }]);

  const removeSplit = (id: number) => setSplits((s) => s.filter((r) => r.id !== id));

  const updateSplit = (id: number, patch: Partial<SplitRow>) =>
    setSplits((s) => s.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const totalQty = toNumber(totalQuantity);
  const assigned = splits.reduce((sum, r) => sum + toNumber(r.quantity), 0);
  const splitsMatch = totalQty > 0 && assigned === totalQty;
  const canSubmit = !!selected && totalQty > 0 && toNumber(unitPrice) > 0 && splitsMatch && !submitting;

  const submit = async () => {
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    try {
      await transactionsApi.create({
        product_id: selected.id,
        transaction_type: type,
        total_quantity: totalQty,
        unit_price: toNumber(unitPrice),
        discount_amount: toNumber(discount),
        notes: notes.trim() || undefined,
        receipt_splits: splits.map((r) => ({ quantity: toNumber(r.quantity), has_receipt: r.has_receipt })),
      });
      router.back();
    } catch (e: any) {
      const msg =
        e?.response?.status === 404
          ? 'The server has no /transactions endpoint yet, so this could not be saved.'
          : e?.response?.data?.detail || 'Could not record the transaction. Please try again.';
      Alert.alert('Not saved', typeof msg === 'string' ? msg : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Product selector */}
      <Text style={styles.label}>Product *</Text>
      {selected ? (
        <View style={styles.selectedCard}>
          <View style={styles.flex1}>
            <Text style={styles.selectedName}>{selected.name}</Text>
            <Text style={styles.selectedMeta}>
              {selected.current_stock} in stock · {selected.unit}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search a product…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          {searching ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} /> : null}
          {results.map((p) => (
            <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => selectProduct(p)} activeOpacity={0.7}>
              <Text style={styles.resultName}>{p.name}</Text>
              <Text style={styles.resultMeta}>{p.current_stock} in stock</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Type toggle */}
      <Text style={[styles.label, styles.mt]}>Type *</Text>
      <View style={styles.toggleRow}>
        {(['purchase', 'sale'] as TransactionType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, type === t && styles.toggleBtnActive]}
            onPress={() => setType(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
              {t === 'purchase' ? 'Purchase' : 'Sale'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Numeric fields */}
      <View style={[styles.row, styles.mt]}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Total quantity *</Text>
          <TextInput style={styles.input} value={totalQuantity} onChangeText={setTotalQuantity} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>Unit price *</Text>
          <TextInput style={styles.input} value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />
        </View>
      </View>

      <Text style={[styles.label, styles.mt]}>Discount amount</Text>
      <TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />

      <Text style={[styles.label, styles.mt]}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        placeholderTextColor={colors.textMuted}
        multiline
      />

      {/* Receipt splits */}
      <View style={[styles.splitHeader, styles.mt]}>
        <Text style={styles.sectionTitle}>Receipt splits</Text>
        <View style={[styles.assignedPill, { backgroundColor: splitsMatch ? '#DCFCE7' : '#FEF3C7' }]}>
          <Text style={[styles.assignedText, { color: splitsMatch ? colors.success : '#B45309' }]}>
            {assigned} of {totalQty || 0} assigned
          </Text>
        </View>
      </View>

      {splits.map((row) => (
        <View key={row.id} style={styles.splitRow}>
          <TextInput
            style={[styles.input, styles.splitInput]}
            value={row.quantity}
            onChangeText={(v) => updateSplit(row.id, { quantity: v })}
            keyboardType="number-pad"
            placeholder="Qty"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.splitToggle}>
            <Text style={styles.splitToggleLabel}>With receipt</Text>
            <Switch
              value={row.has_receipt}
              onValueChange={(v) => updateSplit(row.id, { has_receipt: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          {splits.length > 1 ? (
            <TouchableOpacity onPress={() => removeSplit(row.id)} style={styles.removeBtn}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      <TouchableOpacity style={styles.addSplit} onPress={addSplit} activeOpacity={0.8}>
        <Text style={styles.addSplitText}>+ Add Split</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submit, !canSubmit && styles.submitDisabled]}
        onPress={submit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        <Text style={styles.submitText}>{submitting ? 'Recording…' : 'Record Transaction'}</Text>
      </TouchableOpacity>
      {!splitsMatch && totalQty > 0 ? (
        <Text style={styles.warnText}>Splits must add up to the total quantity before you can submit.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  mt: { marginTop: 18 },
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
  multiline: { height: 80, textAlignVertical: 'top' },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 14,
  },
  selectedName: { fontSize: 16, fontWeight: '700', color: colors.text },
  selectedMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  changeText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: 13, color: colors.textMuted },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  toggleTextActive: { color: colors.white },
  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  assignedPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  assignedText: { fontSize: 13, fontWeight: '700' },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  splitInput: { width: 80 },
  splitToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  splitToggleLabel: { fontSize: 14, color: colors.text },
  removeBtn: { padding: 8 },
  removeText: { color: colors.error, fontSize: 16, fontWeight: '700' },
  addSplit: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addSplitText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  submit: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  warnText: { color: '#B45309', fontSize: 13, textAlign: 'center', marginTop: 10 },
});
