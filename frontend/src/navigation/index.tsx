import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, PlusCircle, BarChart2, User, Receipt } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { COLORS } from '../theme/colors';

// Screens
import Dashboard from '../screens/main/Dashboard';
import AddExpense from '../screens/main/AddExpense';
import Analytics from '../screens/main/Analytics';
import Profile from '../screens/main/Profile';
import BudgetSettings from '../screens/main/BudgetSettings';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import ReceiptGallery from '../screens/main/ReceiptGallery';
import BillSplit from '../screens/main/BillSplit';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => (
    <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
            tabBarActiveTintColor: COLORS.text,
            tabBarInactiveTintColor: '#222',
            tabBarIndicatorStyle: {
                height: 0,
            },
            tabBarStyle: {
                backgroundColor: COLORS.background,
                elevation: 0,
                shadowOpacity: 0,
                height: 70,
                borderTopWidth: 1,
                borderTopColor: '#0A0A0A',
            },
            tabBarLabelStyle: {
                fontSize: 9,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 1,
            },
            tabBarShowIcon: true,
        }}
    >
        <Tab.Screen
            name="Home"
            component={Dashboard}
            options={{
                tabBarIcon: ({ color }) => <Home color={color} size={24} />,
            }}
        />
        <Tab.Screen
            name="Add"
            component={AddExpense}
            options={{
                tabBarIcon: ({ color }) => <PlusCircle color={color} size={24} />,
            }}
        />
        <Tab.Screen
            name="Analytics"
            component={Analytics}
            options={{
                tabBarIcon: ({ color }) => <BarChart2 color={color} size={24} />,
            }}
        />
        <Tab.Screen
            name="Gallery"
            component={ReceiptGallery}
            options={{
                tabBarIcon: ({ color }) => <Receipt color={color} size={24} />,
            }}
        />
        <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
                tabBarIcon: ({ color }) => <User color={color} size={24} />,
            }}
        />
    </Tab.Navigator>
);

const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="BudgetSettings" component={BudgetSettings} />
        <Stack.Screen name="BillSplit" component={BillSplit} />
    </Stack.Navigator>
);

export const AppNavigator = () => {
    const { token } = useStore();
    const [isRegistering, setIsRegistering] = React.useState(false);

    if (token) {
        return (
            <NavigationContainer>
                <MainStack />
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer>
            {isRegistering ? (
                <Register onBack={() => setIsRegistering(false)} />
            ) : (
                <Login onRegister={() => setIsRegistering(true)} />
            )}
        </NavigationContainer>
    );
};
