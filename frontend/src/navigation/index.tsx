import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, PlusCircle, BarChart2, User } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { COLORS } from '../theme/colors';

// Screens
import Dashboard from '../screens/main/Dashboard';
import AddExpense from '../screens/main/AddExpense';
import Analytics from '../screens/main/Analytics';
import Profile from '../screens/main/Profile';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';

const Tab = createBottomTabNavigator();

const TabNavigator = () => (
    <Tab.Navigator
        screenOptions={{
            tabBarStyle: {
                backgroundColor: COLORS.surface,
                borderTopWidth: 0,
                height: 60,
                paddingBottom: 10,
            },
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            headerStyle: {
                backgroundColor: COLORS.background,
                elevation: 0,
                shadowOpacity: 0,
            },
            headerTintColor: COLORS.text,
        }}
    >
        <Tab.Screen
            name="Home"
            component={Dashboard}
            options={{
                tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            }}
        />
        <Tab.Screen
            name="Add"
            component={AddExpense}
            options={{
                tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size} />,
            }}
        />
        <Tab.Screen
            name="Analytics"
            component={Analytics}
            options={{
                tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
            }}
        />
        <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
                tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            }}
        />
    </Tab.Navigator>
);

export const AppNavigator = () => {
    const { token } = useStore();
    const [isRegistering, setIsRegistering] = React.useState(false);

    if (token) {
        return (
            <NavigationContainer>
                <TabNavigator />
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
