import axios from "axios";

export async function login(email: string, password: string) {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);

  const response = await axios.post("https://172.21.57.4:8000/login/", formData);
  if (response.data.message === "login successful") {
    const { user_id, session_id, user_name } = response.data;
    console.log("Login response:", user_id, session_id);
    await AsyncStorage.setItem("sessionToken", session_id);
    await AsyncStorage.setItem("user_id", user_id.toString());
    await AsyncStorage.setItem("user_name", user_name);
    return { id: user_id, name: user_name };
  }
  throw new Error(response.data.message || "Login failed");
}
