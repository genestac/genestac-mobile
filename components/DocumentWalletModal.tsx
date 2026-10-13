import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import {
  getSignedDeliveryUrl,
  viewCloudinaryDocument,
  downloadCloudinaryDocument,
  deleteFromCloudinary,
} from "@/lib/cloudinary";
import SecureDocumentViewerModal from "@/components/SecureDocumentViewerModal";

export interface DocumentItem {
  id: string;
  title: string;
  category: "Lab Reports" | "Prescriptions" | "Scans & Imaging" | "IDs & Cards";
  date: string;
  status: "AI Analyzed" | "Verified" | "Active" | "Reviewed";
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  summary: string;
  doctorName?: string;
  fileType: "PDF" | "IMAGE" | "DICOM";
  filePath?: string;
  biomarkers?: string[];
}

const getCategoryMeta = (category: string) => {
  switch (category) {
    case "Lab Reports":
      return {
        icon: "document-text" as const,
        iconColor: "#E11D48",
        bgColor: "#FFE4E6",
      };
    case "Scans & Imaging":
      return {
        icon: "scan-circle" as const,
        iconColor: "#2563EB",
        bgColor: "#DBEAFE",
      };
    case "Prescriptions":
      return {
        icon: "medkit" as const,
        iconColor: "#7C3AED",
        bgColor: "#F3E8FF",
      };
    case "IDs & Cards":
      return {
        icon: "card" as const,
        iconColor: "#0D9488",
        bgColor: "#CCFBF1",
      };
    default:
      return {
        icon: "document-text" as const,
        iconColor: "#4F46E5",
        bgColor: "#EEF2FF",
      };
  }
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "Recent";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Recent";
  }
};

interface DocumentWalletModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenUpload?: () => void;
}

export const DocumentWalletModal: React.FC<DocumentWalletModalProps> = ({
  visible,
  onClose,
  onOpenUpload,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [secureViewerDoc, setSecureViewerDoc] = useState<DocumentItem | null>(null);
  const [showSecureViewer, setShowSecureViewer] = useState(false);

  const categories = [
    "All",
    "Lab Reports",
    "Prescriptions",
    "Scans & Imaging",
    "IDs & Cards",
  ];

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from("medical_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching medical reports:", error);
        setDocuments([]);
        return;
      }

      const mapped: DocumentItem[] = (data || []).map((row: any) => {
        const cat = (row.category || "Lab Reports") as DocumentItem["category"];
        const meta = getCategoryMeta(cat);
        const rawFileName =
          (row.file_path || "").split("/").pop() || "Document";
        const cleanTitle =
          row.title || rawFileName.replace(/^\d+-/, "") || "Medical Report";
        const ext = rawFileName.split(".").pop()?.toUpperCase();
        const fileType: DocumentItem["fileType"] =
          row.file_type ||
          (ext === "PDF"
            ? "PDF"
            : ext === "PNG" || ext === "JPG" || ext === "JPEG"
              ? "IMAGE"
              : "PDF");

        return {
          id: row.id,
          title: cleanTitle,
          category: cat,
          date: formatDate(row.created_at),
          status: "Verified",
          icon: meta.icon,
          iconColor: meta.iconColor,
          bgColor: meta.bgColor,
          summary:
            row.summary ||
            `Securely stored in your vault (${row.file_path || "Cloudinary Encrypted"}).`,
          doctorName: row.doctor_name,
          filePath: row.file_path,
          fileType,
        };
      });

      setDocuments(mapped);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchDocuments();
    } else {
      setSelectedDoc(null);
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [visible, fetchDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCat =
        selectedCategory === "All" || doc.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.doctorName &&
          doc.doctorName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [documents, selectedCategory, searchQuery]);

  const handleShare = async (doc: DocumentItem) => {
    try {
      await Share.share({
        title: doc.title,
        message: `Genestac Document Wallet: ${doc.title} (${doc.category}, ${doc.date}). Summary: ${doc.summary}`,
      });
    } catch {
      // Sharing error handled silently
    }
  };

  const handleView = (doc: DocumentItem) => {
    if (!doc.filePath) {
      Alert.alert(
        "No Vault File",
        `"${doc.title}" does not have an attached file record.`,
      );
      return;
    }
    setSecureViewerDoc(doc);
    setShowSecureViewer(true);
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (!doc.filePath) {
      Alert.alert(
        "No Vault File",
        `"${doc.title}" does not have an attached file record.`,
      );
      return;
    }
    try {
      setDownloadingDocId(doc.id);
      const fileName = `${doc.title}.${(doc.fileType || "pdf").toLowerCase()}`;
      await downloadCloudinaryDocument(doc.filePath, fileName);
    } catch (err: any) {
      console.error("Download document error:", err);
      Alert.alert(
        "Download Error",
        err?.message || "Could not download document. Please check your connection.",
      );
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDelete = (doc: DocumentItem) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to permanently delete "${doc.title}"? This will remove the encrypted file from your vault and database.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingDocId(doc.id);
              // 1. Delete from Cloudinary private storage
              if (doc.filePath) {
                try {
                  await deleteFromCloudinary(doc.filePath);
                } catch (cloudErr) {
                  console.warn("Could not delete from Cloudinary:", cloudErr);
                }
              }

              // 2. Delete record from Supabase medical_reports table
              const { error } = await supabase
                .from("medical_reports")
                .delete()
                .eq("id", doc.id);

              if (error) {
                console.error("Error deleting from Supabase:", error);
                Alert.alert(
                  "Delete Error",
                  error.message || "Failed to delete document from database.",
                );
                return;
              }

              // 3. Close viewer modal if currently viewing this doc
              if (showSecureViewer && secureViewerDoc?.id === doc.id) {
                setShowSecureViewer(false);
                setSecureViewerDoc(null);
              }

              // 4. Reset selected doc in detail view
              if (selectedDoc?.id === doc.id) {
                setSelectedDoc(null);
              }

              // 5. Update local state
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

              Alert.alert(
                "Document Deleted",
                `"${doc.title}" has been permanently removed from your vault.`,
              );
            } catch (err: any) {
              console.error("Delete document error:", err);
              Alert.alert(
                "Delete Error",
                err?.message || "An unexpected error occurred while deleting.",
              );
            } finally {
              setDeletingDocId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
      <View style={styles.overlayBackdrop}>
        {/* 90% Width and 85% Height Container */}
        <View style={styles.modalWindow}>
          {/* Header */}
          <LinearGradient
            colors={["#4F46E5", "#3730A3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerContainer}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.walletIconCircle}>
                  <Ionicons name="wallet" size={20} color="#4F46E5" />
                </View>
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={styles.headerTitleText}>Document Wallet</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {documents.length}{" "}
                        {documents.length === 1 ? "Item" : "Items"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.headerSubtitleText}>
                    Secure & encrypted
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Search & Category Filter Section */}
          <View style={styles.filterSection}>
            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons
                name="search-outline"
                size={16}
                color="#64748B"
                style={{ marginRight: 6 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search documents, doctors, biomarkers..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Body Content: Document List or Document Detail */}
          {selectedDoc ? (
            /* Document Detail View */
            <ScrollView contentContainerStyle={styles.detailScrollContent}>
              <TouchableOpacity
                style={styles.backToListBtn}
                onPress={() => setSelectedDoc(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color="#4F46E5" />
                <Text style={styles.backToListText}>
                  Back to Document Collection
                </Text>
              </TouchableOpacity>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <View
                    style={[
                      styles.detailIconBox,
                      { backgroundColor: selectedDoc.bgColor },
                    ]}
                  >
                    <Ionicons
                      name={selectedDoc.icon}
                      size={28}
                      color={selectedDoc.iconColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailTitle}>{selectedDoc.title}</Text>
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaText}>
                        {selectedDoc.category}
                      </Text>
                      <Text style={styles.detailMetaDot}>•</Text>
                      <Text style={styles.detailMetaText}>
                        {selectedDoc.date}
                      </Text>
                      <Text style={styles.detailMetaDot}>•</Text>
                    </View>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={styles.statusRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {selectedDoc.status}
                    </Text>
                  </View>
                  {selectedDoc.doctorName && (
                    <Text style={styles.doctorNameText}>
                      Issued by {selectedDoc.doctorName}
                    </Text>
                  )}
                </View>

                {/* Document Simulated Viewer Card */}
                <View style={styles.previewFrame}>
                  <TouchableOpacity
                    style={styles.previewHeader}
                    onPress={() => handleView(selectedDoc)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#4F46E5"
                    />
                    <Text style={styles.previewFilename} numberOfLines={1}>
                      {selectedDoc.title}.{selectedDoc.fileType.toLowerCase()}
                    </Text>
                    <View style={styles.openPill}>
                      <Ionicons name="eye-outline" size={12} color="#4F46E5" />
                      <Text style={styles.openPillText}>VIEW</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.previewBody}>
                    <Text style={styles.summaryHeading}>
                      AI Summary & Findings
                    </Text>
                    <Text style={styles.summaryBody}>
                      {selectedDoc.summary}
                    </Text>

                    {selectedDoc.biomarkers &&
                      selectedDoc.biomarkers.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.biomarkerHeading}>
                            Extracted Biomarkers:
                          </Text>
                          <View style={styles.biomarkerGrid}>
                            {selectedDoc.biomarkers.map((bm, idx) => (
                              <View key={idx} style={styles.biomarkerPill}>
                                <Ionicons
                                  name="sparkles"
                                  size={12}
                                  color="#4F46E5"
                                />
                                <Text style={styles.biomarkerPillText}>
                                  {bm}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => handleView(selectedDoc)}
                    disabled={viewingDocId === selectedDoc.id}
                    activeOpacity={0.8}
                  >
                    {viewingDocId === selectedDoc.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                    )}
                    <Text style={styles.primaryActionText}>
                      {viewingDocId === selectedDoc.id ? "Opening..." : "View Document"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => handleDownload(selectedDoc)}
                    disabled={downloadingDocId === selectedDoc.id}
                    activeOpacity={0.8}
                  >
                    {downloadingDocId === selectedDoc.id ? (
                      <ActivityIndicator size="small" color="#3730A3" />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color="#3730A3"
                      />
                    )}
                    <Text style={styles.secondaryActionText}>
                      {downloadingDocId === selectedDoc.id ? "Saving..." : "Download"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tertiaryActionBtn}
                    onPress={() => handleShare(selectedDoc)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-outline" size={18} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteActionBtn}
                    onPress={() => handleDelete(selectedDoc)}
                    disabled={deletingDocId === selectedDoc.id}
                    activeOpacity={0.8}
                  >
                    {deletingDocId === selectedDoc.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            /* Document List View */
            <ScrollView
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
            >
              {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text style={styles.loadingText}>
                    Loading vault documents...
                  </Text>
                </View>
              ) : filteredDocs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="folder-open-outline"
                    size={48}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyStateTitle}>
                    {documents.length === 0
                      ? "No Documents in Vault"
                      : "No Matching Documents"}
                  </Text>
                  <Text style={styles.emptyStateSub}>
                    {documents.length === 0
                      ? "Upload or scan your medical reports to access and manage them securely here."
                      : "Try clearing your search or selecting a different category."}
                  </Text>
                  {documents.length === 0 && (
                    <TouchableOpacity
                      style={styles.emptyStateUploadBtn}
                      onPress={() => {
                        onClose();
                        if (onOpenUpload) onOpenUpload();
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                      <Text style={styles.emptyStateUploadText}>
                        Upload First Document
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.gridContainer}>
                  {filteredDocs.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.docGridCard}
                      onPress={() => setSelectedDoc(doc)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View
                          style={[
                            styles.docIconCircle,
                            { backgroundColor: doc.bgColor },
                          ]}
                        >
                          <Ionicons
                            name={doc.icon}
                            size={20}
                            color={doc.iconColor}
                          />
                        </View>
                        <View style={styles.cardHeaderBadges}>
                          <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText} numberOfLines={1}>
                              {doc.category}
                            </Text>
                          </View>
                          <Text style={styles.cardDateHeader}>{doc.date}</Text>
                        </View>
                      </View>

                      <View style={styles.cardBodyCol}>
                        <Text style={styles.docTitleText} numberOfLines={2}>
                          {doc.title}
                        </Text>
                        <Text style={styles.docSummaryText} numberOfLines={2}>
                          {doc.summary}
                        </Text>
                      </View>

                      <View style={styles.cardFooterRow}>
                        <View style={styles.cardQuickActionsRow}>
                          <TouchableOpacity
                            style={styles.quickActionIconBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleView(doc);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {viewingDocId === doc.id ? (
                              <ActivityIndicator size="small" color="#4F46E5" />
                            ) : (
                              <Ionicons
                                name="eye-outline"
                                size={15}
                                color="#4F46E5"
                              />
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.quickActionIconBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDownload(doc);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {downloadingDocId === doc.id ? (
                              <ActivityIndicator size="small" color="#64748B" />
                            ) : (
                              <Ionicons
                                name="download-outline"
                                size={15}
                                color="#64748B"
                              />
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.quickActionIconBtn, styles.quickActionDeleteBtn]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDelete(doc);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            disabled={deletingDocId === doc.id}
                          >
                            {deletingDocId === doc.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Ionicons
                                name="trash-outline"
                                size={15}
                                color="#EF4444"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer Bar */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.uploadNewBtn}
              onPress={() => {
                onClose();
                if (onOpenUpload) onOpenUpload();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.uploadNewBtnText}>
                + Upload / Scan Document
              </Text>
            </TouchableOpacity>

            <View style={styles.storageInfoRow}>
              <Ionicons name="cloud-done-outline" size={13} color="#64748B" />
              <Text style={styles.storageInfoText}>
                {documents.length > 0
                  ? `Vault Secured • ${documents.length} ${
                      documents.length === 1 ? "Report" : "Reports"
                    } Encrypted`
                  : "Vault Ready • 256-Bit Encrypted"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>

    {/* In-App 60-Second Self-Destructing Secure Document Viewer */}
    <SecureDocumentViewerModal
      visible={showSecureViewer}
      onClose={() => setShowSecureViewer(false)}
      doc={secureViewerDoc}
      onDelete={(d) => handleDelete(d as DocumentItem)}
    />
  </>
  );
};

const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.70)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWindow: {
    width: "90%",
    height: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  countBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitleText: {
    fontSize: 12,
    color: "#E0E7FF",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginLeft: 5,
  },

  /* Filters */
  filterSection: {
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  categoryScrollContainer: {
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },

  /* List View */
  listScrollContent: {
    padding: 16,
    gap: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  docGridCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardBodyCol: {
    marginBottom: 8,
  },
  cardHeaderBadges: {
    alignItems: "flex-end",
    gap: 3,
  },
  cardDateHeader: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    marginTop: "auto",
  },
  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 18,
  },
  docSummaryText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 15,
  },
  catBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: "55%",
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4F46E5",
  },
  docDateText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
  },

  /* Empty State */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  emptyStateUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyStateUploadText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  /* Detail View */
  detailScrollContent: {
    padding: 16,
  },
  backToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  backToListText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  detailMetaText: {
    fontSize: 11,
    color: "#64748B",
  },
  detailMetaDot: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  doctorNameText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  previewFrame: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  previewFilename: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#3730A3",
  },
  encryptedTag: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewBody: {
    padding: 14,
  },
  summaryHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  summaryBody: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  biomarkerHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  biomarkerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  biomarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  biomarkerPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4338CA",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3730A3",
  },
  tertiaryActionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    width: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deleteActionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    width: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: "auto",
  },
  openPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
  },
  cardQuickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickActionIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  quickActionDeleteBtn: {
    backgroundColor: "#FEF2F2",
  },

  /* Footer */
  footerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  uploadNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadNewBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  storageInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  storageInfoText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
});

export default DocumentWalletModal;
