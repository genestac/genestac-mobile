import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors, Fonts, Spacing, Radius } from "@/constants/colors";

const SETTINGS = [
  { key: "name", icon: "person-outline", label: "Full Name" },
  { key: "phone", icon: "call-outline", label: "Phone Number" },
] as const;

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Change password
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/(auth)/login");
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from("users")
        .select("name, email, phone")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const openEdit = (field: string, value: string) => {
    setEditField(field);
    setEditValue(value ?? "");
  };

  const handleSaveField = async () => {
    if (!editField || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ [editField]: editValue.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setProfile((p: any) => ({ ...p, [editField]: editValue.trim() }));
    setEditField(null);
    Alert.alert("Saved!", "Profile updated.");
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setShowPwModal(false);
    setNewPw("");
    Alert.alert("Success", "Password changed successfully!");
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (loading)
    return (
      <SafeAreaView style={s.center} edges={["top", "left", "right"]}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
      </SafeAreaView>
    );

  const name = profile?.name ?? user?.user_metadata?.full_name ?? "User";
  const email = profile?.email ?? user?.email ?? "";
  const initials = name.slice(0, 2).toUpperCase();
  const userId = user?.id?.slice(0, 8) ?? "";

  return (
    <SafeAreaView style={s.flex} edges={["top", "left", "right"]}>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.displayName}>{name}</Text>
          <Text style={s.displayEmail}>{email}</Text>
          <View style={s.idBadge}>
            <Text style={s.idText}>ID: {userId}</Text>
          </View>
        </View>

        {/* Profile Fields */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Profile Information</Text>
          {SETTINGS.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              style={s.fieldRow}
              onPress={() => openEdit(key, profile?.[key] ?? "")}
            >
              <Ionicons
                name={icon as any}
                size={18}
                color={Colors.primaryLight}
              />
              <View style={s.fieldInfo}>
                <Text style={s.fieldLabel}>{label}</Text>
                <Text style={s.fieldValue}>{profile?.[key] ?? "Not set"}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          ))}
          <View style={s.fieldRow}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={Colors.primaryLight}
            />
            <View style={s.fieldInfo}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <Text style={s.fieldValue}>{email}</Text>
            </View>
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={Colors.textLight}
            />
          </View>
        </View>

        {/* Rewards & Referrals */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Rewards & Referrals</Text>
          <TouchableOpacity
            style={s.fieldRow}
            onPress={() => router.push('/(app)/referral')}
          >
            <Ionicons
              name="gift-outline"
              size={18}
              color={Colors.primaryLight}
            />
            <View style={s.fieldInfo}>
              <Text style={s.fieldLabel}>Refer & Earn Rewards</Text>
              <Text style={s.fieldValue}>Share your code, view wallet balance & ledger</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Security</Text>
          <TouchableOpacity
            style={s.fieldRow}
            onPress={() => setShowPwModal(true)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Colors.primaryLight}
            />
            <View style={s.fieldInfo}>
              <Text style={s.fieldLabel}>Change Password</Text>
              <Text style={s.fieldValue}>••••••••</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>


        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Genestac v1.0.0 · Built with ❤️</Text>

        {/* Footer Bar */}
        <View style={s.footerContainer}>
          <View style={s.footerTopRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Image
                  source={require("../../assets/icon.png")}
                  style={{ width: 70, height: 60, resizeMode: "contain"}}
                />
              </View>
              <Text style={s.footerDescText}>
                The pinnacle of personalized metabolic care and cellular
                optimization for high-performing individuals.
              </Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.footerContactText}>✉ info@genestac.com</Text>
              <Text style={s.footerContactText}>📞 +91 99117 14011</Text>
              <Text style={s.footerContactText}>
                📍 A Block, Unitech Business Zone, Sector 50, Gurugram,
                Haryana 122018
              </Text>
            </View>
          </View>

          <View style={s.footerBottomDivider} />

          <View style={s.footerBottomRow}>
            <Text style={s.footerCopyright}>
              © 2025 GENESTAC. ALL RIGHTS RESERVED.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
              <Text style={s.footerLegalLink}>Terms & Conditions</Text>
              <Text style={s.footerLegalLink}>Privacy Policy</Text>
              <Text style={s.footerLegalLink}>REFUND POLICY</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal visible={!!editField} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>
              Edit {editField === "name" ? "Full Name" : "Phone Number"}
            </Text>
            <TextInput
              style={s.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={
                editField === "name" ? "Your full name" : "+91 98765 43210"
              }
              placeholderTextColor={Colors.textLight}
              keyboardType={editField === "phone" ? "phone-pad" : "default"}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditField(null)}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveField}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={s.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Change Password</Text>
            <TextInput
              style={s.modalInput}
              value={newPw}
              onChangeText={setNewPw}
              placeholder="New password (min. 8 chars)"
              placeholderTextColor={Colors.textLight}
              secureTextEntry
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setShowPwModal(false);
                  setNewPw("");
                }}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, savingPw && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={savingPw}
              >
                {savingPw ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={s.saveBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginTop:-28
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: Colors.white },
  displayName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  displayEmail: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  idBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  idText: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    fontFamily: "monospace",
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: Fonts.sizes.sm,
    fontWeight: "700",
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  fieldInfo: { flex: 1 },
  fieldLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  signOutText: {
    fontSize: Fonts.sizes.md,
    fontWeight: "700",
    color: Colors.danger,
  },
  version: {
    textAlign: "center",
    fontSize: Fonts.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  modalBtns: { flexDirection: "row", gap: Spacing.sm },
  cancelBtn: {
    flex: 1,
    padding: 15,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
  },
  cancelText: { fontWeight: "700", color: Colors.textSecondary },
  saveBtn: {
    flex: 1,
    padding: 15,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
  },
  saveBtnText: { fontWeight: "700", color: Colors.white },
  footerContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  footerTopRow: { flexDirection: "column", gap: 20, flexWrap: "wrap" },
  footerLogoText: { fontSize: 18, fontWeight: "900", color: Colors.textPrimary },
  footerDescText: {
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 300,
    lineHeight: 16,
  },
  footerContactText: { fontSize: 12, color: Colors.textSecondary },
  footerBottomDivider: { height: 1, backgroundColor: Colors.border },
  footerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  footerCopyright: { fontSize: 11, color: Colors.textMuted },
  footerLegalLink: { fontSize: 11, color: Colors.textSecondary },
});
