import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { colors } from '../constants/colors';

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {visible && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
            }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />
        )}
        <View style={styles.frame} pointerEvents="none" />
        <Text style={styles.hint}>Point the camera at a barcode</Text>
        <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 160, borderWidth: 2, borderColor: colors.white, borderRadius: 12 },
  hint: { color: colors.white, marginTop: 20, fontSize: 15 },
  cancel: { position: 'absolute', bottom: 48, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999 },
  cancelText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
