import { Platform, StyleSheet } from 'react-native';
export const theme = {
  colors: { background: '#EEF2F7', surface: '#F9FBFE', surfaceAlt: '#E9EEF5', text: '#101522', muted: '#667085', border: 'rgba(16,24,40,0.09)', primary: '#162033', gold: '#D4A72C', success: '#138A5B', successSoft: '#DDF4EA', danger: '#D64545', dangerSoft: '#FBE3E3', info: '#3D6FD8', infoSoft: '#E1E9FA', white: '#FFFFFF', overlay: 'rgba(16,21,34,0.32)' },
  spacing: { sm: 8, md: 12, base: 16, lg: 20, xl: 24 }, radius: { sm: 10, md: 14, control: 18, card: 24, pill: 999 },
  type: { hero: { fontSize: 27, lineHeight: 32, fontWeight: '700' as const }, title: { fontSize: 19, lineHeight: 24, fontWeight: '700' as const }, section: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const }, body: { fontSize: 15, lineHeight: 21 }, label: { fontSize: 13, lineHeight: 17, fontWeight: '700' as const }, caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const } }
};
export const shadow = StyleSheet.create({ card: { shadowColor: '#152033', shadowOpacity: Platform.OS === 'android' ? 0.12 : 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 } });
