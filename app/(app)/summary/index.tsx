import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Shield,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import { analyticsApi, type PeriodSummary, type SummaryPeriod } from '../../../store/api';
import { formatETB, formatMoney, toNumber } from '../../../constants/format';
import { colors, shadowCard } from '../../../constants/colors';
import { Badge, IconChip, SectionRow, text } from '../../../components/ui';

const PERIODS: { key: SummaryPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

// Design margin thresholds: <15 red, <20 amber, else green.
function marginTone(pct: number): 'red' | 'amber' | 'green' {
  if (pct < 15) return 'red';
  if (pct < 20) return 'amber';
  return 'green';
}

function HStat({ icon, label, value, valueColor }: { icon: ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.hstat}>
      <View style={{ marginBottom: 10 }}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, text.tnum, { marginTop: 3 }, valueColor ? { color: valueColor } : null]}>
        {value}
        <Text style={styles.statCur}> ETB</Text>
      </Text>
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

  const compliance = summary?.receipt_compliance;
  const compliancePct = Math.max(0, Math.min(100, toNumber(compliance?.compliance_rate_percent)));
  const netProfit = toNumber(summary?.net_profit);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>Summary</Text>
        <View style={styles.bell}><Bell size={21} color={colors.navy} /></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsWrap} contentContainerStyle={styles.pills}>
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <TouchableOpacity key={p.key} style={[styles.pill, on && styles.pillOn]} onPress={() => setPeriod(p.key)} activeOpacity={0.85}>
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} contentContainerStyle={styles.center}>
          <Text style={styles.emptyText}>{error}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* horizontal stats */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
            <HStat icon={<IconChip tone="green"><TrendingUp size={20} color={colors.success} /></IconChip>} label="Revenue" value={formatMoney(summary?.total_revenue, false)} />
            <HStat icon={<IconChip tone="amber"><TrendingDown size={20} color={colors.warning} /></IconChip>} label="Cost" value={formatMoney(summary?.total_cost, false)} />
            <HStat icon={<IconChip tone="blue"><Activity size={20} color={colors.primary} /></IconChip>} label="Net Profit" value={formatMoney(summary?.net_profit, false)} valueColor={netProfit >= 0 ? colors.success : colors.danger} />
          </ScrollView>

          {/* top products */}
          <SectionRow title="Top Products" icon={<Trophy size={18} color={colors.warning} />} />
          <View style={styles.card}>
            {(summary?.top_products ?? []).length === 0 ? (
              <Text style={[text.muted, { padding: 15 }]}>No product activity in this period.</Text>
            ) : (
              (summary?.top_products ?? []).map((p, i) => {
                const pct = toNumber(p.profit_margin_percent);
                return (
                  <View key={p.product_id} style={[styles.rank, i > 0 && styles.rankDivider]}>
                    <View style={[styles.rankN, i === 0 && styles.rankN1]}>
                      <Text style={[styles.rankNText, i === 0 && { color: colors.warning }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rankName} numberOfLines={1}>{p.product_name}</Text>
                      <Text style={styles.rankRevenue}>{formatETB(p.revenue)}</Text>
                    </View>
                    <Badge tone={marginTone(pct)}>{pct.toFixed(0)}% margin</Badge>
                  </View>
                );
              })
            )}
          </View>

          {/* compliance */}
          <SectionRow title="Receipt Compliance" icon={<Shield size={18} color={colors.success} />} />
          <View style={[styles.card, { padding: 16 }]}>
            <View style={styles.compTop}>
              <View>
                <Text style={[styles.compPct, text.tnum]}>{compliancePct.toFixed(0)}%</Text>
                <Text style={styles.compSub}>units with valid receipts</Text>
              </View>
              {compliance && compliance.risky_items.length > 0 ? (
                <Badge tone="amber" icon={<AlertTriangle size={12} color={colors.warning} />}>{compliance.risky_items.length} risky</Badge>
              ) : null}
            </View>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${compliancePct}%` }]} />
            </View>

            {compliance && compliance.risky_items.length > 0 ? (
              <View style={styles.riskbox}>
                <View style={styles.riskHead}>
                  <AlertTriangle size={15} color={colors.warning} />
                  <Text style={styles.riskHeadText}>Risky Items</Text>
                </View>
                {compliance.risky_items.map((name, i) => (
                  <View key={`${name}-${i}`} style={[styles.riskrow, i > 0 && styles.riskrowDivider]}>
                    <Text style={styles.riskName}>{name}</Text>
                    <AlertCircle size={15} color={colors.warning} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* low stock */}
          <SectionRow title="Low Stock Alert" icon={<AlertCircle size={18} color={colors.danger} />} />
          {(summary?.low_stock_products ?? []).length === 0 ? (
            <Text style={text.muted}>Everything is well stocked.</Text>
          ) : (
            (summary?.low_stock_products ?? []).map((p) => (
              <View key={p.id} style={styles.lowcard}>
                <View style={styles.lowIco}><AlertCircle size={20} color={colors.danger} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lowName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.lowMeta}>Only {p.current_stock} {p.unit}{p.current_stock !== 1 ? 's' : ''} left</Text>
                </View>
                <View style={styles.reorder}><Text style={styles.reorderText}>Reorder</Text></View>
              </View>
            ))
          )}
          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  bell: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  pillsWrap: { flexGrow: 0, paddingHorizontal: 20, paddingBottom: 12 },
  pills: { gap: 8, paddingRight: 20 },
  pill: { height: 36, paddingHorizontal: 18, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  pillOn: { backgroundColor: colors.navy, shadowOpacity: 0 },
  pillText: { fontSize: 13.5, fontWeight: '600', color: colors.textMuted },
  pillTextOn: { color: '#fff' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 4 },
  hscroll: { gap: 12, paddingRight: 20, paddingVertical: 2 },
  hstat: { minWidth: 150, backgroundColor: colors.card, borderRadius: 16, padding: 15, ...shadowCard },
  statLabel: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  statVal: { fontSize: 19, fontWeight: '700', letterSpacing: -0.4, color: colors.navy },
  statCur: { fontSize: 12, color: colors.textMuted2, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 16, ...shadowCard },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 15 },
  rankDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  rankN: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  rankN1: { backgroundColor: colors.warning50 },
  rankNText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  rankName: { fontSize: 14, fontWeight: '600', color: colors.navy },
  rankRevenue: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  compTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  compPct: { fontSize: 34, fontWeight: '700', letterSpacing: -1, color: colors.success, lineHeight: 36 },
  compSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 4 },
  progress: { height: 8, borderRadius: 6, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 6, backgroundColor: colors.success },
  riskbox: { backgroundColor: colors.warning50, borderWidth: 1, borderColor: colors.warning100, borderRadius: 13, padding: 13, paddingHorizontal: 14, marginTop: 14 },
  riskHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  riskHeadText: { fontSize: 13, fontWeight: '700', color: colors.warning },
  riskrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  riskrowDivider: { borderTopWidth: 1, borderTopColor: colors.warning100, borderStyle: 'dashed' },
  riskName: { color: colors.text, fontWeight: '500', fontSize: 13, flex: 1, marginRight: 10 },
  lowcard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.danger50, borderWidth: 1, borderColor: colors.danger100, borderRadius: 14, padding: 13, paddingHorizontal: 14, marginBottom: 10 },
  lowIco: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowCard },
  lowName: { fontSize: 14, fontWeight: '700', color: colors.text },
  lowMeta: { fontSize: 12.5, color: colors.danger, fontWeight: '600', marginTop: 1, textTransform: 'capitalize' },
  reorder: { height: 30, paddingHorizontal: 12, borderRadius: 7, backgroundColor: colors.danger50, alignItems: 'center', justifyContent: 'center' },
  reorderText: { fontSize: 11, fontWeight: '700', color: colors.danger },
});
