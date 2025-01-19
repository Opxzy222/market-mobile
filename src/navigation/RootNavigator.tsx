import { createStackNavigator } from '@react-navigation/stack';
import HomePage from '@/screens/homepage';
import SignIn from '@/screens/SignIn';

const Stack = createStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomePage} />
      <Stack.Screen name="SignIn" component={SignIn} />
    </Stack.Navigator>
  );
}
