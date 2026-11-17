import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchCatalog, type SearchEntry } from '../sky/align';
import { COLORS } from '../sky/theme';

type Props = { visible: boolean; catalog: SearchEntry[]; onPick: (e: SearchEntry) => void; onClose: () => void };

export function FindSheet({ visible, catalog, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const results = useMemo(() => searchCatalog(catalog, q), [catalog, q]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
          <Text style={styles.title}>Find in the sky</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Try Jupiter, Sirius, Orion, M31"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <FlatList
            data={results}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 320 }}
            ListEmptyComponent={<Text style={styles.empty}>Nothing by that name. Try a star, planet or Messier number.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => {
                  setQ('');
                  onPick(item);
                }}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.sub}</Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#0c1226', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  input: { color: COLORS.text, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.panelBorder },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  sub: { color: COLORS.muted, fontSize: 12 },
  empty: { color: COLORS.muted, paddingVertical: 16, textAlign: 'center' },
});
