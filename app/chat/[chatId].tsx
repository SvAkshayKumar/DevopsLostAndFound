import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

const ChatScreen = () => {
  const { chatId } = useLocalSearchParams(); // Capture chatId

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚧 Feature Unavailable</Text>
      <Text style={styles.message}>
        The chat feature is not available yet. Stay tuned for updates! 🎉
      </Text>
      <Text style={styles.chatId}>Chat ID: {chatId}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  chatId: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
  },
});

export default ChatScreen;
