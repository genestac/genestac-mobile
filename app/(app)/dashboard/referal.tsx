import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { fetchUserReferralSummary } from '@/lib/api';
import { ReferralSummary, Referral, RewardTransaction } from '@/lib/types';
import { Colors, Fonts, Spacing, Radius } from '@/constants/colors';

export default function ReferralScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'referrals' | 'ledger'>('referrals');
  const [copying, setCopying] = useState(false);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/(auth)/login');
        return;
      }
      const data = await fetchUserReferralSummary(session.user.id);
      setSummary(data);
    } catch (err) {
      console.error('Error loading referral screen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferralData();
  }, []);

  const handleShareCode = async () => {
    if (!summary?.referralCode) return;
    try {
      await Share.share({
        message: `Join me on Genestac Health & Weight Loss App! Use my referral code ${summary.referralCode} to sign up and get exclusive wallet rewards!`,
      });
    } catch (error: any) {
      Alert.alert('Share Failed', error.message);
    }
  };

  const handleCopyCode = async () => {
    if (!summary?.referralCode) return;
    setCopying(true);
    Alert.alert('Referral Code Copied', `Your code ${summary.referralCode} is ready to share!`);
    setTimeout(() => setCopying(false), 1500);
  };

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadReferralData}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>Loading Referral Profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Wallet Card */}
          <View style={styles.walletCard}>
            <View style={styles.walletBadgeRow}>
              <View style={styles.walletBadge}>
                <Ionicons name="wallet-outline" size={16} color={Colors.white} />
                <Text style={styles.walletBadgeText}>GENESTAC REWARDS WALLET</Text>
              </View>
            </View>

            <Text style={styles.walletLabel}>Available Wallet Balance</Text>
            <Text style={styles.walletAmount}>
              {formatCurrency(summary?.walletBalance || 0)}
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{formatCurrency(summary?.totalEarned || 0)}</Text>
                <Text style={styles.statLbl}>Total Earned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{summary?.totalReferralsCount || 0}</Text>
                <Text style={styles.statLbl}>Total Referrals</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{summary?.qualifiedCount || 0}</Text>
                <Text style={styles.statLbl}>Rewarded</Text>
              </View>
            </View>
          </View>

          {/* Referral Code Box */}
          <View style={styles.codeCard}>
            <Text style={styles.codeCardTitle}>Your Shareable Referral Code</Text>
            <Text style={styles.codeCardSubtitle}>
              Share this code with friends & family. You both earn rewards on sign-up & plan purchase!
            </Text>

            <View style={styles.codeBox}>
              <TouchableOpacity style={styles.codeTextGroup} onPress={handleCopyCode} activeOpacity={0.7}>
                <Ionicons name="gift-outline" size={20} color={Colors.primaryLight} />
                <Text style={styles.codeText}>{summary?.referralCode || 'GENERATING...'}</Text>
                <Ionicons name={copying ? "checkmark-circle" : "copy-outline"} size={16} color={Colors.primaryLight} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareCode}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social" size={18} color={Colors.white} />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.howCard}>
            <Text style={styles.sectionTitle}>How It Works</Text>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Share your code</Text>
                <Text style={styles.stepDesc}>Send your code to friends who want to start their wellness journey.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>They sign up & purchase a plan</Text>
                <Text style={styles.stepDesc}>When they register and purchase a health plan, your referral qualifies.</Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Get cash credits instantly</Text>
                <Text style={styles.stepDesc}>Reward credits are automatically deposited into your wallet ledger.</Text>
              </View>
            </View>
          </View>

          {/* Segmented Tab Control */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'referrals' && styles.tabButtonActive]}
              onPress={() => setActiveTab('referrals')}
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={activeTab === 'referrals' ? Colors.primaryLight : Colors.textMuted}
              />
              <Text style={[styles.tabButtonText, activeTab === 'referrals' && styles.tabButtonTextActive]}>
                My Referrals ({summary?.referralsList.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'ledger' && styles.tabButtonActive]}
              onPress={() => setActiveTab('ledger')}
            >
              <Ionicons
                name="receipt-outline"
                size={18}
                color={activeTab === 'ledger' ? Colors.primaryLight : Colors.textMuted}
              />
              <Text style={[styles.tabButtonText, activeTab === 'ledger' && styles.tabButtonTextActive]}>
                Reward Ledger ({summary?.transactionsList.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Referrals List */}
          {activeTab === 'referrals' && (
            <View style={styles.listSection}>
              {summary?.referralsList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="person-add-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Referrals Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Share your referral code above to start earning rewards!
                  </Text>
                </View>
              ) : (
                summary?.referralsList.map((ref: Referral) => (
                  <View key={ref.id} style={styles.itemCard}>
                    <View style={styles.itemAvatar}>
                      <Ionicons name="person" size={20} color={Colors.primaryLight} />
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{ref.referee_name}</Text>
                      <Text style={styles.itemSubText}>Joined: {formatDate(ref.created_at)}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        ref.status === 'QUALIFIED' || ref.status === 'REWARDED'
                          ? styles.statusBadgeSuccess
                          : styles.statusBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          ref.status === 'QUALIFIED' || ref.status === 'REWARDED'
                            ? styles.statusTextSuccess
                            : styles.statusTextPending,
                        ]}
                      >
                        {ref.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Tab 2: Ledger Transactions */}
          {activeTab === 'ledger' && (
            <View style={styles.listSection}>
              {summary?.transactionsList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Your reward transaction history will appear here once earned.
                  </Text>
                </View>
              ) : (
                summary?.transactionsList.map((tx: RewardTransaction) => (
                  <View key={tx.id} style={styles.itemCard}>
                    <View
                      style={[
                        styles.txIcon,
                        tx.type === 'REDEMPTION' || tx.type === 'REVERSAL'
                          ? styles.txIconDebit
                          : styles.txIconCredit,
                      ]}
                    >
                      <Ionicons
                        name={
                          tx.type === 'REDEMPTION' || tx.type === 'REVERSAL'
                            ? 'arrow-up-circle'
                            : 'arrow-down-circle'
                        }
                        size={22}
                        color={
                          tx.type === 'REDEMPTION' || tx.type === 'REVERSAL'
                            ? Colors.danger
                            : Colors.success
                        }
                      />
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>
                        {tx.type.replace('_', ' ')}
                      </Text>
                      <Text style={styles.itemSubText}>{tx.notes || formatDate(tx.created_at)}</Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        tx.type === 'REDEMPTION' || tx.type === 'REVERSAL'
                          ? styles.txAmountDebit
                          : styles.txAmountCredit,
                      ]}
                    >
                      {tx.type === 'REDEMPTION' || tx.type === 'REVERSAL' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  refreshBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  walletCard: {
    backgroundColor: '#1E293B',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    elevation: 4,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  walletBadgeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  walletBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  walletLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: Spacing.xs,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    marginVertical: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  statLbl: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  codeCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  codeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  codeCardSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  codeTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  howCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabButtonTextActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  listSection: {
    gap: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemSubText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextSuccess: {
    color: '#059669',
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: '#ECFDF5',
  },
  txIconDebit: {
    backgroundColor: '#FEF2F2',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txAmountCredit: {
    color: '#059669',
  },
  txAmountDebit: {
    color: Colors.danger,
  },
});
