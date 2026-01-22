import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
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

const Tab = createMaterialTopTabNavigator();

const TabNavigator = () => (
    <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={{
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarIndicatorStyle: {
                backgroundColor: COLORS.primary,
                top: 0,
            },
            tabBarStyle: {
                backgroundColor: COLORS.surface,
                elevation: 0,
                shadowOpacity: 0,
                height: 60,
            },
            tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: 'bold',
                textTransform: 'none',
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
            name="Profile"
            component={Profile}
            options={{
                tabBarIcon: ({ color }) => <User color={color} size={24} />,
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
