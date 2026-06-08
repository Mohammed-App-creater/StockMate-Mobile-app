import { ReactNode, useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import {
  PRODUCT_UNITS,
  productsApi,
  transactionsApi,
  type Product,
  type ProductUnit,
  type Transaction,
} from '../../../store/api';
import { formatDate, formatETB, toNumber } from '../../../constants/format';
import { colors, shadowCard } from '../../../constants/colors';
import { Navbar } from '../../../components/Navbar';
import { Badge, Mono } from '../../../components/ui';

function stockColor(stock: number): string {
  if (stock >= 20) return colors.success;
  if (stock >= 10) return colors.warning;
  return colors.danger;
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Navbar title="Product" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Navbar title="Product" />
        <View style={styles.center}><Text style={styles.muted}>Product not found.</Text></View>
      </SafeAreaView>
    );
  }

  const set = (key: keyof Product) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Navbar title={editing ? 'Edit Product' : 'Product Details'} subtitle={editing ? 'Update inventory item' : undefined} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {editing ? (
          <>
            <EditField label="Name"><TextInput style={styles.input} value={form.name ?? ''} onChangeText={set('name')} /></EditField>
            <EditField label="Category"><TextInput style={styles.input} value={form.category ?? ''} onChangeText={set('category')} /></EditField>
            <EditField label="Unit">
              <View style={styles.segment}>
                {PRODUCT_UNITS.map((u) => {
                  const on = (form.unit ?? 'piece') === u;
                  return (
                    <TouchableOpacity key={u} style={[styles.segOpt, on && styles.segOptOn]} onPress={() => setForm((f) => ({ ...f, unit: u }))}>
                      <Text style={[styles.segText, on && styles.segTextOn]}>{u}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </EditField>
            <View style={styles.row}>
              <View style={styles.flex1}><EditField label="Buying Price"><TextInput style={styles.input} value={String(form.buying_price ?? '')} onChangeText={set('buying_price')} keyboardType="decimal-pad" /></EditField></View>
              <View style={styles.flex1}><EditField label="Selling Price"><TextInput style={styles.input} value={String(form.selling_price ?? '')} onChangeText={set('selling_price')} keyboardType="decimal-pad" /></EditField></View>
            </View>
            <EditField label="Barcode"><TextInput style={styles.input} value={form.barcode ?? ''} onChangeText={set('barcode')} autoCapitalize="none" /></EditField>
            <EditField label="Current Stock"><TextInput style={styles.input} value={String(form.current_stock ?? '')} onChangeText={set('current_stock')} keyboardType="number-pad" /></EditField>

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
            <View style={styles.heroRow}>
              <Mono name={product.name} seed={product.id} size={56} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName}>{product.name}</Text>
                <Text style={styles.heroMeta}>{product.category} · {product.unit}</Text>
              </View>
            </View>

            <View style={styles.stockPill}>
              <View style={[styles.stockDot, { backgroundColor: stockColor(product.current_stock) }]} />
              <Text style={[styles.stockText, { color: stockColor(product.current_stock) }]}>{product.current_stock} in stock</Text>
            </View>

            <View style={styles.detailCard}>
              <DetailRow label="Buying price" value={formatETB(product.buying_price)} />
              <DetailRow label="Selling price" value={formatETB(product.selling_price)} />
              <DetailRow label="Margin" value={formatETB(toNumber(product.selling_price) - toNumber(product.buying_price))} />
              <DetailRow label="Barcode" value={product.barcode || '—'} />
              <DetailRow label="Created" value={formatDate(product.created_at)} />
              <DetailRow label="Updated" value={formatDate(product.updated_at)} last />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setEditing(true)}>
                <Pencil size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnDanger, deleting && styles.disabled]} onPress={confirmDelete} disabled={deleting}>
                <Trash2 size={18} color={colors.danger} />
                <Text style={styles.btnDangerText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent transactions</Text>
            {transactions.length === 0 ? (
              <Text style={styles.muted}>No recent transactions for this product.</Text>
            ) : (
              <View style={styles.txCard}>
                {transactions.map((t, i) => {
                  const isSale = t.transaction_type === 'sale';
                  return (
                    <View key={t.id} style={[styles.txRow, i > 0 && styles.txDivider]}>
                      <View>
                        <Badge tone={isSale ? 'green' : 'blue'} dot>{isSale ? 'Sale' : 'Purchase'}</Badge>
                        <Text style={[styles.muted, { marginTop: 4 }]}>{formatDate(t.created_at)}</Text>
                      </View>
                      <Text style={styles.txQty}>×{t.total_quantity}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, color: colors.textMuted },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroName: { fontSize: 20, fontWeight: '700', color: colors.navy, letterSpacing: -0.4 },
  heroMeta: { fontSize: 14, color: colors.textMuted, marginTop: 3, textTransform: 'capitalize' },
  stockPill: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stockDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  stockText: { fontSize: 15, fontWeight: '700' },
  detailCard: { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, marginTop: 18, ...shadowCard },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.navy },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, height: 50, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  btnDanger: { backgroundColor: colors.danger50, borderWidth: 1, borderColor: colors.danger100 },
  btnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, ...shadowCard },
  btnGhostText: { color: colors.navy, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 28, marginBottom: 10 },
  txCard: { backgroundColor: colors.card, borderRadius: 16, ...shadowCard },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingHorizontal: 15 },
  txDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  txQty: { fontSize: 16, fontWeight: '700', color: colors.primary },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy, marginBottom: 6 },
  input: { backgroundColor: colors.fieldBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text },
  segment: { flexDirection: 'row', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  segOpt: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOptOn: { backgroundColor: '#fff', ...shadowCard },
  segText: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
  segTextOn: { color: colors.primary },
});
