import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Plus } from 'lucide-react-native';
import {
  transactionsApi,
  type ReceiptSplit,
  type Transaction,
  type TransactionType,
} from '../../../store/api';
import { formatDate, formatETB, formatMoney, toNumber } from '../../../constants/format';
import { colors, shadowCard } from '../../../constants/colors';
import { Badge, Mono } from '../../../components/ui';

type Filter = 'all' | 'purchase' | 'sale';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'sale', label: 'Sales' },
];

function productName(t: Transaction): string {
  return t.product?.name ?? 'Product';
}
function totalValue(t: Transaction): number {
  return toNumber(t.unit_price) * toNumber(t.total_quantity) - toNumber(t.discount_amount);
}
function splitCounts(splits: ReceiptSplit[] = []) {
  let withR = 0;
  let without = 0;
  for (const s of splits) {
    if (s.has_receipt) withR += toNumber(s.quantity);
    else without += toNumber(s.quantity);
  }
  return { withR, without };
}

export default function TransactionsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const load = useCallback(async (f: Filter) => {
    setError(null);
    try {
      const res = await transactionsApi.list(f === 'all' ? undefined : { type: f });
      const data = res.data as any;
      setItems(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e: any) {
      setError(
        e?.response?.status === 404
          ? 'Transactions aren’t available on the server yet.'
          : 'Could not load transactions. Pull to retry.'
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(filter);
    }, [filter, load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(filter);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isSale = item.transaction_type === 'sale';
    const { withR, without } = splitCounts(item.receipt_splits);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setSelected(item)}>
        <Mono name={productName(item)} seed={item.product_id} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{productName(item)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <Badge tone={isSale ? 'green' : 'blue'} dot>{isSale ? 'Sale' : 'Purchase'}</Badge>
            <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amt, { color: isSale ? colors.success : colors.navy }]}>{formatMoney(totalValue(item))}</Text>
          <Text style={styles.qty}>Qty {item.total_quantity}</Text>
          {item.receipt_splits && item.receipt_splits.length > 0 ? (
            <Text style={styles.receipt}>{withR}✓ / {without}✕</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.bell}><Bell size={21} color={colors.navy} /></View>
      </View>

      <View style={styles.tabs}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <TouchableOpacity key={f.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setFilter(f.key)} activeOpacity={0.85}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.grow]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>{error ?? 'No transactions yet.'}</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(app)/transactions/add')}>
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      <DetailModal transaction={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function DetailModal({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  return (
    <Modal visible={!!transaction} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {transaction && (
            <>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle} numberOfLines={1}>{productName(transaction)}</Text>
                <Badge tone={transaction.transaction_type === 'sale' ? 'green' : 'blue'} dot>
                  {transaction.transaction_type === 'sale' ? 'Sale' : 'Purchase'}
                </Badge>
              </View>
              <Text style={styles.sheetDate}>{formatDate(transaction.created_at)}</Text>

              <Row label="Quantity" value={String(transaction.total_quantity)} />
              <Row label="Unit price" value={formatETB(transaction.unit_price)} />
              <Row label="Discount" value={formatETB(transaction.discount_amount)} />
              <Row label="Total value" value={formatETB(totalValue(transaction))} bold />

              <Text style={styles.splitsTitle}>Receipt splits</Text>
              {(transaction.receipt_splits ?? []).length === 0 ? (
                <Text style={styles.metaLabel}>No splits recorded.</Text>
              ) : (
                (transaction.receipt_splits ?? []).map((s, i) => (
                  <View key={s.id ?? i} style={styles.splitRow}>
                    <Text style={styles.detailValue}>Qty {s.quantity}</Text>
                    <Badge tone={s.has_receipt ? 'green' : 'slate'}>{s.has_receipt ? 'With receipt' : 'No receipt'}</Badge>
                  </View>
                ))
              )}

              {transaction.notes ? (
                <>
                  <Text style={styles.splitsTitle}>Notes</Text>
                  <Text style={styles.metaLabel}>{transaction.notes}</Text>
                </>
              ) : null}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.metaLabel, bold && { fontWeight: '800', color: colors.navy }]}>{label}</Text>
      <Text style={[styles.detailValue, bold && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  bell: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  tab: { flex: 1, height: 36, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  tabOn: { backgroundColor: colors.navy, shadowOpacity: 0 },
  tabText: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted },
  tabTextOn: { color: '#fff' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  grow: { flexGrow: 1 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.card, borderRadius: 15, padding: 13, paddingHorizontal: 14, marginBottom: 11, ...shadowCard },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.navy, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: colors.textMuted },
  amt: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  qty: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  receipt: { fontSize: 11, color: colors.textMuted2, marginTop: 1 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.navy, flex: 1 },
  sheetDate: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  metaLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  splitsTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: 18, marginBottom: 8 },
  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  closeBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
