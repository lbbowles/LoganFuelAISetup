import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, useColorScheme } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { withAuth } from "@/services/api";

type NutritionalInfo = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
};

type Meal = {
    id: number;
    name: string;
    description: string;
    nutritional_info?: NutritionalInfo;
};

export default function MealDetail() {
    const { session } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isDark = useColorScheme() === "dark";

    const [meal, setMeal] = useState<Meal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMeal();
    }, [id]);

    const fetchMeal = async () => {
        try {
            setLoading(true);
            const api = withAuth(session.access_token);
            const data = await api.getMeals();

            const foundMeal = data.meals.find((m: Meal) => m.id === parseInt(id));
            setMeal(foundMeal || null);
        } catch (error) {
            console.error('Failed to fetch meal:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <View className={`flex-1 items-center justify-center ${isDark ? "bg-primary" : "bg-secondary"}`}>
                    <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                </View>
            </ThemeProvider>
        );
    }

    if (!meal) {
        return (
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <View className={`flex-1 items-center justify-center ${isDark ? "bg-primary" : "bg-secondary"} px-6`}>
                    <Text className={`text-xl ${isDark ? "text-white" : "text-black"}`}>
                        Meal not found
                    </Text>
                    <TouchableOpacity onPress={() => router.back()} className="mt-4">
                        <Text className="text-blue-500 text-lg">Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <ScrollView className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"} px-6 py-12`}>
                {/* Back Button */}
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Text className={`text-lg ${isDark ? "text-secondary" : "text-primary"}`}>
                        ← Back
                    </Text>
                </TouchableOpacity>

                {/* Meal Name */}
                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"} mb-6 text-center`}>
                    {meal.name}
                </Text>

                {/* Macros */}
                {meal.nutritional_info && (
                    <View className={`rounded-2xl p-5 mb-6 border ${
                        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    }`}>
                        <View className="flex-row justify-around">
                            <View className="items-center">
                                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                    {meal.nutritional_info.calories}
                                </Text>
                                <Text className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                                    calories
                                </Text>
                            </View>
                            <View className="items-center">
                                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                    {meal.nutritional_info.protein}g
                                </Text>
                                <Text className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                                    protein
                                </Text>
                            </View>
                            <View className="items-center">
                                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                    {meal.nutritional_info.carbs}g
                                </Text>
                                <Text className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                                    carbs
                                </Text>
                            </View>
                            <View className="items-center">
                                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                    {meal.nutritional_info.fat}g
                                </Text>
                                <Text className={`text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                                    fat
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Description & Instructions */}
                {meal.description && (
                    <View className="mb-6">
                        <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-3`}>
                            Recipe
                        </Text>
                        <Text className={`text-base leading-7 ${isDark ? "text-white/80" : "text-black/80"}`}>
                            {meal.description}
                        </Text>
                    </View>
                )}

                <View className="h-10" />
            </ScrollView>
        </ThemeProvider>
    );
}
