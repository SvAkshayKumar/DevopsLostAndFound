import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";

const ChatScreen = () => {
  const { chatId } = useLocalSearchParams(); // Capture chatId
  const navigation = useNavigation(); // Get navigation object

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚧 Feature Unavailable</Text>
      <Text style={styles.message}>
        The chat feature is not available yet. Stay tuned for updates! 🎉
      </Text>
      <Text style={styles.chatId}>Chat ID: {chatId}</Text>

      {/* Go Back Button */}
      <Button title="Go Back" onPress={() => navigation.goBack()} />
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
    marginBottom: 20,
  },
});

export default ChatScreen;
