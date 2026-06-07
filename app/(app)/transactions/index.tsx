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
import { useFocusEffect, useRouter } from 'expo-router';
import {
  transactionsApi,
  type ReceiptSplit,
  type Transaction,
  type TransactionType,
} from '../../../store/api';
import { formatDate, formatMoney, toNumber } from '../../../constants/format';
import { colors } from '../../../constants/colors';

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

function TypeBadge({ type }: { type: TransactionType }) {
  const isSale = type === 'sale';
  return (
    <View style={[styles.typeBadge, { backgroundColor: isSale ? '#DCFCE7' : '#DBEAFE' }]}>
      <Text style={[styles.typeBadgeText, { color: isSale ? colors.success : colors.primary }]}>
        {isSale ? 'Sale' : 'Purchase'}
      </Text>
    </View>
  );
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
      // The backend has no /transactions route yet → friendly empty state.
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
    const { withR, without } = splitCounts(item.receipt_splits);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setSelected(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>
            {productName(item)}
          </Text>
          <TypeBadge type={item.transaction_type} />
        </View>
        <View style={styles.cardMid}>
          <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
          <Text style={styles.value}>{formatMoney(totalValue(item))}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>Qty {item.total_quantity}</Text>
          {item.receipt_splits && item.receipt_splits.length > 0 ? (
            <Text style={styles.receiptMeta}>
              {withR} with receipt / {without} without
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, filter === f.key && styles.tabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 && styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error ?? 'No transactions yet.'}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(app)/transactions/add')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TransactionDetailModal transaction={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!transaction} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          {transaction && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{productName(transaction)}</Text>
                <TypeBadge type={transaction.transaction_type} />
              </View>
              <Text style={styles.sheetDate}>{formatDate(transaction.created_at)}</Text>

              <View style={styles.sheetRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{transaction.total_quantity}</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.detailLabel}>Unit price</Text>
                <Text style={styles.detailValue}>{formatMoney(transaction.unit_price)}</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.detailLabel}>Discount</Text>
                <Text style={styles.detailValue}>{formatMoney(transaction.discount_amount)}</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={[styles.detailLabel, styles.bold]}>Total value</Text>
                <Text style={[styles.detailValue, styles.bold]}>{formatMoney(totalValue(transaction))}</Text>
              </View>

              <Text style={styles.splitsTitle}>Receipt splits</Text>
              {(transaction.receipt_splits ?? []).length === 0 ? (
                <Text style={styles.detailLabel}>No splits recorded.</Text>
              ) : (
                (transaction.receipt_splits ?? []).map((s, i) => (
                  <View key={s.id ?? i} style={styles.splitRow}>
                    <Text style={styles.detailValue}>Qty {s.quantity}</Text>
                    <Text style={[styles.splitTag, { color: s.has_receipt ? colors.success : colors.textMuted }]}>
                      {s.has_receipt ? 'With receipt' : 'No receipt'}
                    </Text>
                  </View>
                ))
              )}

              {transaction.notes ? (
                <>
                  <Text style={styles.splitsTitle}>Notes</Text>
                  <Text style={styles.detailLabel}>{transaction.notes}</Text>
                </>
              ) : null}

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  meta: { fontSize: 13, color: colors.textMuted },
  receiptMeta: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  value: { fontSize: 16, fontWeight: '700', color: colors.primary },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: colors.white, fontSize: 30, lineHeight: 32, fontWeight: '300' },
  // Modal / bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 },
  sheetDate: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  bold: { fontWeight: '800', color: colors.text },
  splitsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 8 },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitTag: { fontSize: 13, fontWeight: '600' },
  closeBtn: { marginTop: 24, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  closeBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
