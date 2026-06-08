import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  DollarSign,
  Hash,
  Package,
  Percent,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import { productsApi, transactionsApi, type Product, type TransactionType } from '../../../store/api';
import { toNumber } from '../../../constants/format';
import { colors, shadowCard } from '../../../constants/colors';
import { Navbar } from '../../../components/Navbar';

interface SplitRow {
  id: number;
  quantity: string;
  has_receipt: boolean;
}

// Custom on/off switch matching the design (.sw).
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onChange(!value)} style={[styles.sw, value && styles.swOn]}>
      <View style={[styles.swKnob, value && styles.swKnobOn]} />
    </TouchableOpacity>
  );
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType: TransactionType = params.type === 'sale' ? 'sale' : 'purchase';
  const splitIdRef = useRef(2);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!unitPrice) setUnitPrice(type === 'sale' ? p.selling_price : p.buying_price);
  };

  const addSplit = () => setSplits((s) => [...s, { id: splitIdRef.current++, quantity: '', has_receipt: true }]);
  const removeSplit = (id: number) => setSplits((s) => (s.length > 1 ? s.filter((r) => r.id !== id) : s));
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar title="Record Transaction" subtitle="Log a sale or purchase" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* type toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity style={[styles.tOpt, type === 'purchase' && styles.tOptBuyOn]} onPress={() => setType('purchase')} activeOpacity={0.85}>
            <View style={[styles.tIco, { backgroundColor: colors.primary50 }]}><ShoppingCart size={24} color={colors.primary} /></View>
            <Text style={styles.tLbl}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tOpt, type === 'sale' && styles.tOptSaleOn]} onPress={() => setType('sale')} activeOpacity={0.85}>
            <View style={[styles.tIco, { backgroundColor: colors.success50 }]}><Receipt size={24} color={colors.success} /></View>
            <Text style={styles.tLbl}>Sale</Text>
          </TouchableOpacity>
        </View>

        {/* product select */}
        <View style={styles.labelRow}><Search size={16} color={colors.textMuted} /><Text style={styles.label}>Select Product</Text></View>
        {selected ? (
          <TouchableOpacity style={styles.pchip} activeOpacity={0.8} onPress={() => setSelected(null)}>
            <View style={styles.pchipIco}><Package size={20} color={colors.primary} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pchipName} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.pchipMeta}>{selected.category} · {selected.current_stock} in stock</Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.input}>
              <TextInput style={styles.inputText} value={query} onChangeText={setQuery} placeholder="Search a product…" placeholderTextColor={colors.textMuted2} autoCapitalize="none" />
            </View>
            {searching ? <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} /> : null}
            {results.map((p) => (
              <TouchableOpacity key={p.id} style={styles.resultRow} onPress={() => selectProduct(p)} activeOpacity={0.7}>
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultMeta}>{p.current_stock} in stock</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* qty / price */}
        <View style={[styles.row, { marginTop: 16 }]}>
          <View style={styles.flex1}>
            <View style={styles.labelRow}><Hash size={16} color={colors.textMuted} /><Text style={styles.label}>Quantity</Text></View>
            <View style={styles.input}>
              <TextInput style={styles.inputText} value={totalQuantity} onChangeText={setTotalQuantity} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted2} />
            </View>
          </View>
          <View style={styles.flex1}>
            <View style={styles.labelRow}><DollarSign size={16} color={colors.textMuted} /><Text style={styles.label}>Unit Price</Text></View>
            <View style={styles.input}>
              <TextInput style={styles.inputText} value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted2} />
              <Text style={styles.affix}>ETB</Text>
            </View>
          </View>
        </View>

        <View style={[styles.labelRow, { marginTop: 16 }]}><Percent size={16} color={colors.textMuted} /><Text style={styles.label}>Discount</Text></View>
        <View style={styles.input}>
          <TextInput style={styles.inputText} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted2} />
          <Text style={styles.affix}>ETB</Text>
        </View>

        {/* receipt splits */}
        <View style={styles.splitHeader}>
          <View style={styles.labelRow}><Receipt size={18} color={colors.warning} /><Text style={styles.sectionTitle}>Receipt Splits</Text></View>
          <View style={[styles.splitTotal, splitsMatch && styles.splitTotalDone]}>
            <CheckCircle2 size={15} color={splitsMatch ? colors.success : colors.textMuted} />
            <Text style={[styles.splitTotalText, splitsMatch && { color: colors.success }]}>{assigned} of {totalQty || 0} assigned</Text>
          </View>
        </View>

        <View style={styles.splitCard}>
          {splits.map((row) => (
            <View key={row.id} style={styles.srow}>
              <View style={styles.srowQty}>
                <TextInput style={styles.srowQtyInput} value={row.quantity} onChangeText={(v) => updateSplit(row.id, { quantity: v })} keyboardType="number-pad" placeholder="Qty" placeholderTextColor={colors.textMuted2} />
              </View>
              <Toggle value={row.has_receipt} onChange={(v) => updateSplit(row.id, { has_receipt: v })} />
              <TouchableOpacity style={styles.srowDel} onPress={() => removeSplit(row.id)} disabled={splits.length === 1}>
                <Trash2 size={18} color={splits.length === 1 ? colors.textMuted2 : colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.srowHeader}>
            <Text style={styles.srowHeaderText}>Quantity</Text>
            <Text style={styles.srowHeaderText}>With Receipt</Text>
          </View>
          <TouchableOpacity style={styles.addSplit} onPress={addSplit} activeOpacity={0.8}>
            <Plus size={18} color={colors.navy} />
            <Text style={styles.addSplitText}>Add Split</Text>
          </TouchableOpacity>
        </View>

        {/* optional notes */}
        <View style={[styles.labelRow, { marginTop: 18 }]}><Text style={styles.label}>Notes (optional)</Text></View>
        <View style={[styles.input, { minHeight: 64, alignItems: 'flex-start' }]}>
          <TextInput style={[styles.inputText, { paddingVertical: 12 }]} value={notes} onChangeText={setNotes} placeholder="Add a note…" placeholderTextColor={colors.textMuted2} multiline />
        </View>
      </ScrollView>

      <View style={styles.foot}>
        <TouchableOpacity style={[styles.recordBtn, !canSubmit && styles.recordDisabled]} onPress={submit} disabled={!canSubmit} activeOpacity={0.9}>
          <CheckCircle2 size={20} color={canSubmit ? '#fff' : colors.textMuted2} />
          <Text style={[styles.recordText, !canSubmit && { color: colors.textMuted2 }]}>
            {submitting ? 'Recording…' : canSubmit ? 'Record Transaction' : `Record · ${assigned}/${totalQty || 0} assigned`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, letterSpacing: -0.2 },
  input: { minHeight: 50, backgroundColor: colors.fieldBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  inputText: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 13 },
  affix: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  toggle: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tOpt: { flex: 1, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 15, paddingVertical: 16, alignItems: 'center', gap: 9 },
  tOptSaleOn: { borderColor: colors.success, backgroundColor: colors.success50 },
  tOptBuyOn: { borderColor: colors.primary, backgroundColor: colors.primary50 },
  tIco: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tLbl: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  pchip: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary100, borderRadius: 13, padding: 12, paddingHorizontal: 14 },
  pchipIco: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pchipName: { fontSize: 14, fontWeight: '700', color: colors.text },
  pchipMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1, textTransform: 'capitalize' },
  changeText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13, marginTop: 8 },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultMeta: { fontSize: 13, color: colors.textMuted },
  splitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  splitTotal: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F1F5F9' },
  splitTotalDone: { backgroundColor: colors.success50 },
  splitTotalText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  splitCard: { backgroundColor: colors.fieldBg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
  srow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  srowQty: { flex: 1, height: 44, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, justifyContent: 'center' },
  srowQtyInput: { fontSize: 14, color: colors.text },
  srowDel: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  srowHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 10 },
  srowHeaderText: { fontSize: 11.5, color: colors.textMuted },
  addSplit: { height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadowCard },
  addSplitText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  sw: { width: 46, height: 27, borderRadius: 20, backgroundColor: '#CBD5E1', justifyContent: 'center' },
  swOn: { backgroundColor: colors.success },
  swKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff', marginLeft: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  swKnobOn: { marginLeft: 22 },
  foot: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  recordBtn: { height: 54, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  recordDisabled: { backgroundColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  recordText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
