import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  analyticsApi,
  type PeriodSummary,
  type ProductSummary,
  type SummaryPeriod,
} from '../../../store/api';
import { formatMoney, toNumber } from '../../../constants/format';
import { colors } from '../../../constants/colors';

const PERIODS: { key: SummaryPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function marginColor(pct: number): string {
  if (pct > 20) return colors.success;
  if (pct >= 10) return '#CA8A04'; // yellow-600
  return colors.error;
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const [period, setPeriod] = useState<SummaryPeriod>('daily');
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: SummaryPeriod) => {
    setError(null);
    try {
      const res = await analyticsApi.summary(p);
      setSummary(res.data);
    } catch (e: any) {
      setSummary(null);
      setError(
        e?.response?.status === 404
          ? 'Analytics aren’t available on the server yet.'
          : 'Could not load the summary. Pull to retry.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(period);
  }, [period, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(period);
  };

  const netProfit = toNumber(summary?.net_profit);
  const compliance = summary?.receipt_compliance;
  const compliancePct = Math.max(0, Math.min(100, toNumber(compliance?.compliance_rate_percent)));

  const Header = (
    <View>
      <View style={styles.grid}>
        <StatCard label="Revenue" value={formatMoney(summary?.total_revenue)} />
        <StatCard label="Cost" value={formatMoney(summary?.total_cost)} />
        <StatCard
          label="Net Profit"
          value={formatMoney(summary?.net_profit)}
          valueColor={netProfit >= 0 ? colors.success : colors.error}
        />
        <StatCard label="Discounts" value={formatMoney(summary?.total_discount)} />
      </View>

      <Text style={styles.sectionTitle}>Top Products</Text>
    </View>
  );

  const Footer = (
    <View>
      {/* Receipt compliance */}
      <Text style={styles.sectionTitle}>Receipt Compliance</Text>
      <View style={styles.card}>
        <View style={styles.complianceRow}>
          <Text style={styles.meta}>Compliance rate</Text>
          <Text style={styles.compliancePct}>{compliancePct.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${compliancePct}%`, backgroundColor: marginColor(compliancePct) },
            ]}
          />
        </View>
        {compliance ? (
          <Text style={styles.complianceMeta}>
            Sold: {compliance.sold_with_receipt} with / {compliance.sold_without_receipt} without ·
            Bought: {compliance.purchased_with_receipt} with / {compliance.purchased_without_receipt} without
          </Text>
        ) : null}
      </View>

      {compliance && compliance.risky_items.length > 0 ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>⚠️ Risky items (no receipts)</Text>
          {compliance.risky_items.map((name, i) => (
            <Text key={`${name}-${i}`} style={styles.warnItem}>
              • {name}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Low stock alert */}
      {summary && summary.low_stock_products.length > 0 ? (
        <View style={styles.dangerBox}>
          <Text style={styles.dangerTitle}>📦 Low stock alert</Text>
          {summary.low_stock_products.map((p) => (
            <View key={p.id} style={styles.dangerRow}>
              <Text style={styles.dangerName}>{p.name}</Text>
              <Text style={styles.dangerStock}>{p.current_stock} left</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height: 24 }} />
    </View>
  );

  const renderTopProduct = ({ item }: { item: ProductSummary }) => {
    const pct = toNumber(item.profit_margin_percent);
    return (
      <View style={styles.card}>
        <View style={styles.productTop}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_name}
          </Text>
          <View style={[styles.marginBadge, { backgroundColor: marginColor(pct) + '22' }]}>
            <Text style={[styles.marginText, { color: marginColor(pct) }]}>{pct.toFixed(1)}%</Text>
          </View>
        </View>
        <View style={styles.productBottom}>
          <Text style={styles.meta}>Sold {item.total_sold}</Text>
          <Text style={styles.revenue}>{formatMoney(item.revenue)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.tab, period === p.key && styles.tabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => 'x'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={summary?.top_products ?? []}
          keyExtractor={(item) => item.product_id}
          renderItem={renderTopProduct}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={Header}
          ListFooterComponent={Footer}
          ListEmptyComponent={<Text style={styles.emptyInline}>No product activity in this period.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: 6, padding: 12 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  emptyInline: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  listContent: { padding: 16, paddingTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statLabel: { fontSize: 13, color: colors.textMuted },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 },
  marginBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  marginText: { fontSize: 13, fontWeight: '700' },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  meta: { fontSize: 13, color: colors.textMuted },
  revenue: { fontSize: 15, fontWeight: '700', color: colors.primary },
  complianceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  compliancePct: { fontSize: 18, fontWeight: '800', color: colors.text },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 12, borderRadius: 6 },
  complianceMeta: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  warnBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  warnTitle: { fontSize: 14, fontWeight: '700', color: '#B45309', marginBottom: 6 },
  warnItem: { fontSize: 14, color: '#92400E', marginTop: 2 },
  dangerBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: colors.error, marginBottom: 8 },
  dangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  dangerName: { fontSize: 14, color: '#991B1B', fontWeight: '600' },
  dangerStock: { fontSize: 14, color: colors.error, fontWeight: '700' },
});
