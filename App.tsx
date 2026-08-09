import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-bg gap-4 px-5">
      <Text className="text-text-faint text-eyebrow font-extrabold uppercase">Design foundation</Text>
      <Text className="text-text text-h1 font-extrabold">BrainTrain</Text>
      <Text className="text-text-secondary text-body text-center">
        Colors, type scale and button shadow all come from tokens.
      </Text>

      <Pressable className="bg-accent rounded-lg px-7 py-4 shadow-btn active:top-1 active:shadow-btn-pressed">
        <Text className="text-white text-button font-extrabold uppercase">Primary button</Text>
      </Pressable>

      <StatusBar style="light" />
    </View>
  );
}
