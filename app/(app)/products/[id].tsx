import { useCallback, useEffect, useState } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PRODUCT_UNITS,
  productsApi,
  transactionsApi,
  type Product,
  type ProductUnit,
  type Transaction,
} from '../../../store/api';
import { formatDate, formatMoney, toNumber } from '../../../constants/format';
import { colors } from '../../../constants/colors';

function stockColor(stock: number): string {
  if (stock >= 20) return colors.success;
  if (stock >= 10) return '#CA8A04'; // yellow-600
  return colors.error;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Editable copy
  const [form, setForm] = useState<Partial<Product>>({});

  const load = useCallback(async () => {
    try {
      const res = await productsApi.getById(String(id));
      setProduct(res.data);
      setForm(res.data);
    } catch {
      Alert.alert('Not found', 'This product could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await transactionsApi.byProduct(String(id));
      const data = res.data as any;
      setTransactions((Array.isArray(data) ? data : data?.items ?? []).slice(0, 5));
    } catch {
      // /transactions not available yet — leave empty silently.
      setTransactions([]);
    }
  }, [id]);

  useEffect(() => {
    load();
    loadTransactions();
  }, [load, loadTransactions]);

  const save = async () => {
    if (!form.name?.trim() || !form.category?.trim()) {
      Alert.alert('Missing fields', 'Name and category are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await productsApi.update(String(id), {
        name: form.name?.trim(),
        category: form.category?.trim(),
        unit: form.unit as ProductUnit,
        buying_price: Number(form.buying_price),
        selling_price: Number(form.selling_price),
        barcode: form.barcode?.toString().trim() || null,
        current_stock: Number(form.current_stock) || 0,
      });
      setProduct(res.data);
      setForm(res.data);
      setEditing(false);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      Alert.alert('Could not update', typeof detail === 'string' ? detail : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete product', `Delete "${product?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await productsApi.delete(String(id));
            router.back();
          } catch {
            setDeleting(false);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Product not found.</Text>
      </View>
    );
  }

  const set = (key: keyof Product) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {editing ? (
        <>
          <EditField label="Name *">
            <TextInput style={styles.input} value={form.name ?? ''} onChangeText={set('name')} />
          </EditField>
          <EditField label="Category *">
            <TextInput style={styles.input} value={form.category ?? ''} onChangeText={set('category')} />
          </EditField>
          <EditField label="Unit *">
            <View style={styles.pickerWrap}>
              <Picker selectedValue={(form.unit as ProductUnit) ?? 'piece'} onValueChange={(v) => setForm((f) => ({ ...f, unit: v as ProductUnit }))}>
                {PRODUCT_UNITS.map((u) => (
                  <Picker.Item key={u} label={u} value={u} />
                ))}
              </Picker>
            </View>
          </EditField>
          <View style={styles.row}>
            <EditField label="Buying price *" style={styles.flex1}>
              <TextInput style={styles.input} value={String(form.buying_price ?? '')} onChangeText={set('buying_price')} keyboardType="decimal-pad" />
            </EditField>
            <EditField label="Selling price *" style={styles.flex1}>
              <TextInput style={styles.input} value={String(form.selling_price ?? '')} onChangeText={set('selling_price')} keyboardType="decimal-pad" />
            </EditField>
          </View>
          <EditField label="Barcode">
            <TextInput style={styles.input} value={form.barcode ?? ''} onChangeText={set('barcode')} autoCapitalize="none" />
          </EditField>
          <EditField label="Current stock">
            <TextInput style={styles.input} value={String(form.current_stock ?? '')} onChangeText={set('current_stock')} keyboardType="number-pad" />
          </EditField>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => { setForm(product); setEditing(false); }} disabled={saving}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, saving && styles.disabled]} onPress={save} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.subtitle}>
            {product.category} · {product.unit}
          </Text>

          <View style={styles.stockPill}>
            <View style={[styles.stockDot, { backgroundColor: stockColor(product.current_stock) }]} />
            <Text style={[styles.stockText, { color: stockColor(product.current_stock) }]}>
              {product.current_stock} in stock
            </Text>
          </View>

          <View style={styles.detailCard}>
            <DetailRow label="Buying price" value={formatMoney(product.buying_price)} />
            <DetailRow label="Selling price" value={formatMoney(product.selling_price)} />
            <DetailRow label="Margin" value={formatMoney(toNumber(product.selling_price) - toNumber(product.buying_price))} />
            <DetailRow label="Barcode" value={product.barcode || '—'} />
            <DetailRow label="Created" value={formatDate(product.created_at)} />
            <DetailRow label="Updated" value={formatDate(product.updated_at)} last />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setEditing(true)}>
              <Text style={styles.btnPrimaryText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger, deleting && styles.disabled]} onPress={confirmDelete} disabled={deleting}>
              <Text style={styles.btnDangerText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Recent transactions</Text>
          {transactions.length === 0 ? (
            <Text style={styles.muted}>No recent transactions for this product.</Text>
          ) : (
            transactions.map((t) => (
              <View key={t.id} style={styles.txRow}>
                <View>
                  <Text style={styles.txType}>{t.transaction_type === 'sale' ? 'Sale' : 'Purchase'}</Text>
                  <Text style={styles.muted}>{formatDate(t.created_at)}</Text>
                </View>
                <Text style={styles.txQty}>×{t.total_quantity}</Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function EditField({ label, children, style }: { label: string; children: React.ReactNode; style?: any }) {
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  stockPill: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  stockDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  stockText: { fontSize: 15, fontWeight: '700' },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  btnDanger: { backgroundColor: '#FEE2E2' },
  btnDangerText: { color: colors.error, fontWeight: '700', fontSize: 15 },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 28, marginBottom: 10 },
  muted: { fontSize: 14, color: colors.textMuted },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  txType: { fontSize: 14, fontWeight: '600', color: colors.text },
  txQty: { fontSize: 16, fontWeight: '700', color: colors.primary },
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
  pickerWrap: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, overflow: 'hidden' },
});
