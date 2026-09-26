import { useEffect, useMemo, useState } from 'react';
import { Button, Linking, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ExpoLinking from 'expo-linking';

type Language = 'en' | 'si' | 'ta';
const copy = {
  en: { title: 'Velantin Live', login: 'Session token', save: 'Save securely', referral: 'Referral code', join: 'Join referral', camera: 'Camera', mic: 'Microphone', low: 'Low-data mode', push: 'Enable push notifications', saved: 'Saved on this device' },
  si: { title: 'වෙලන්ටින් Live', login: 'Session token', save: 'ආරක්ෂිතව සුරකින්න', referral: 'Referral code', join: 'Referral එකට join වෙන්න', camera: 'කැමරාව', mic: 'මයික්', low: 'අඩු දත්ත mode', push: 'Push notifications enable කරන්න', saved: 'මෙම device එකේ ආරක්ෂිතව සුරකින ලදී' },
  ta: { title: 'வெலன்டின் Live', login: 'Session token', save: 'பாதுகாப்பாக சேமிக்கவும்', referral: 'Referral code', join: 'Referral-ல் சேரவும்', camera: 'கேமரா', mic: 'மைக்ரோஃபோன்', low: 'குறைந்த தரவு mode', push: 'Push notifications enable செய்யவும்', saved: 'இந்த சாதனத்தில் பாதுகாப்பாக சேமிக்கப்பட்டது' },
} as const;

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [token, setToken] = useState('');
  const [referral, setReferral] = useState('');
  const [saved, setSaved] = useState(false);
  const [lowData, setLowData] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const t = useMemo(() => copy[language], [language]);

  useEffect(() => {
    SecureStore.getItemAsync('velantin.session.token').then(value => value && setToken(value));
    const handleUrl = (url: string | null) => {
      const parsed = url ? ExpoLinking.parse(url) : null;
      const code = parsed?.queryParams?.ref;
      if (typeof code === 'string') setReferral(code);
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  async function saveToken() {
    if (!token.trim()) return;
    await SecureStore.setItemAsync('velantin.session.token', token.trim(), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    setSaved(true);
  }
  async function enablePush() {
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.granted) await Notifications.getExpoPushTokenAsync();
  }
  async function toggleCamera() {
    if (!cameraOn && !cameraPermission?.granted) await requestCamera();
    setCameraOn(value => !value);
  }
  async function toggleMic() {
    if (!micOn && !micPermission?.granted) await requestMic();
    setMicOn(value => !value);
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><Text style={styles.title}>{t.title}</Text><View style={styles.languages}>{(['en', 'si', 'ta'] as Language[]).map(code => <Button key={code} title={code.toUpperCase()} onPress={() => setLanguage(code)} />)}</View></View>
    <Text style={styles.label}>{t.login}</Text><TextInput value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" placeholder="Paste the API session token" style={styles.input} /><Button title={t.save} onPress={saveToken} />{saved && <Text style={styles.success}>{t.saved}</Text>}
    <Text style={styles.label}>{t.referral}</Text><TextInput value={referral} onChangeText={setReferral} autoCapitalize="none" placeholder="velantin://invite?ref=..." style={styles.input} /><Button title={t.join} onPress={() => referral && Linking.openURL(`https://velantin.express/?ref=${encodeURIComponent(referral)}`)} />
    <View style={styles.row}><Text>{t.camera}</Text><Switch value={cameraOn} onValueChange={toggleCamera} /></View><View style={styles.row}><Text>{t.mic}</Text><Switch value={micOn} onValueChange={toggleMic} /></View><View style={styles.row}><Text>{t.low}</Text><Switch value={lowData} onValueChange={setLowData} /></View>
    {cameraOn && <CameraView style={styles.preview} facing="front" />}
    <View style={styles.push}><Button title={t.push} onPress={enablePush} /></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#fff7f8' }, container: { padding: 24, gap: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 28, fontWeight: '800', color: '#9f1239' }, languages: { flexDirection: 'row', gap: 2 }, label: { fontWeight: '700', marginTop: 8 }, input: { borderWidth: 1, borderColor: '#e5b8c2', borderRadius: 10, padding: 12, backgroundColor: '#fff' }, success: { color: '#166534' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, preview: { height: 260, borderRadius: 14, overflow: 'hidden' }, push: { marginTop: 12 } });
