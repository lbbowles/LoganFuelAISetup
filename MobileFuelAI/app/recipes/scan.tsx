import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, useColorScheme } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { withAuth } from "@/services/api";

type PredictionLabel = {
    label: string;
    confidence: number;
};

type MealData = {
    title: string;
    description: string;
    instruction: string;
    calories: number;
    protein: number;
    carb: number;
    fat: number;
    fiber: number;
    sugar: number;
};

export default function ScanMeal() {
    const { session } = useAuth();
    const isDark = useColorScheme() === "dark";

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [predictions, setPredictions] = useState<PredictionLabel[]>([]);
    const [llmLoading, setLlmLoading] = useState(false);
    const [mealData, setMealData] = useState<MealData | null>(null);
    const [saving, setSaving] = useState(false);

    const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

    /**
     * Opens camera for user to take a photo of their meal
     * Requests camera permissions if not already granted
     */
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Camera permission is needed to take photos");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setPredictions([]);
            setMealData(null);
            // Immediately send image to ML model for food recognition
            await analyzeMeal(result.assets[0].uri);
        }
    };

    /**
     * STEP 1: Send image to ML model API
     * Returns 5 food predictions with confidence scores
     */
    const analyzeMeal = async (uri: string) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", {
                uri: uri,
                type: "image/jpeg",
                name: "meal.jpg",
            } as any);

            // Call teammate's ML API for food recognition
            const response = await fetch("https://web-production-c0e3d.up.railway.app/predict_food", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.predictions && Array.isArray(data.predictions)) {
                setPredictions(data.predictions);
            } else if (data.error) {
                Alert.alert("Error", data.error);
            }
        } catch (error) {
            console.error('ML API Error:', error);
            Alert.alert("Error", "Failed to analyze image");
        } finally {
            setLoading(false);
        }
    };

    /**
     * STEP 2: User selects a prediction, then call OpenRouter LLM
     * LLM generates detailed meal information (description, instructions, nutrition)
     */
    const fetchMealDataFromLLM = async (label: string) => {
        setLlmLoading(true);
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o-mini",
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "user",
                            content: `Given the food item "${label}", respond ONLY with JSON:
{
  "meal": {
    "title": "String",
    "description": "String", 
    "instruction": "String"
  },
  "nutrition": {
    "calories": number,
    "protein": number,
    "carb": number,
    "fat": number,
    "fiber": number,
    "sugar": number
  }
}`
                        }
                    ],
                    temperature: 0.7,
                }),
            });

            const data = await response.json();
            const parsed = JSON.parse(data.choices?.[0]?.message?.content);

            // Store the generated meal data for preview
            setMealData({
                title: parsed.meal.title,
                description: parsed.meal.description,
                instruction: parsed.meal.instruction,
                calories: parsed.nutrition.calories,
                protein: parsed.nutrition.protein,
                carb: parsed.nutrition.carb,
                fat: parsed.nutrition.fat,
                fiber: parsed.nutrition.fiber,
                sugar: parsed.nutrition.sugar,
            });
        } catch (error) {
            console.error('OpenRouter Error:', error);
            Alert.alert("Error", "Failed to generate meal data");
        } finally {
            setLlmLoading(false);
        }
    };

    /**
     * STEP 3: Save the generated meal to database
     */
    const saveMeal = async () => {
        if (!mealData) return;

        setSaving(true);
        try {
            const api = withAuth(session.access_token);
            await api.createMeal(
                mealData.title,
                mealData.description,
                mealData.calories,
                mealData.protein,
                mealData.carb,
                mealData.fat
            );

            Alert.alert("Success", "Meal saved successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Save Error:', error);
            Alert.alert("Error", "Failed to save meal");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <ScrollView className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"} px-6 py-16`}>
                {/* Back Button */}
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Text className={`text-lg ${isDark ? "text-secondary" : "text-primary"}`}>
                        ← Back
                    </Text>
                </TouchableOpacity>

                {/* Header */}
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"} mb-2`}>
                    Scan Your Meal
                </Text>
                <Text className={`${isDark ? "text-white/70" : "text-black/70"} mb-6`}>
                    Take a photo and let AI identify your food
                </Text>

                {/* Camera Button */}
                {!imageUri && (
                    <TouchableOpacity
                        onPress={pickImage}
                        className={`rounded-2xl p-6 items-center mb-6 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                    >
                        <Text className="text-white text-lg font-semibold">Take Photo</Text>
                    </TouchableOpacity>
                )}

                {/* Image Preview */}
                {imageUri && (
                    <View className="mb-6">
                        <Image
                            source={{ uri: imageUri }}
                            style={{ width: '100%', height: 250, borderRadius: 16 }}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            onPress={pickImage}
                            className="mt-3 bg-gray-500 rounded-xl p-3"
                        >
                            <Text className="text-white text-center font-semibold">Retake Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Loading ML Predictions */}
                {loading && (
                    <View className="items-center py-8">
                        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                        <Text className={`mt-4 ${isDark ? "text-white" : "text-black"}`}>
                            Analyzing your meal...
                        </Text>
                    </View>
                )}

                {/* Prediction Labels - User selects which food the ML model detected */}
                {predictions.length > 0 && !mealData && (
                    <View className="mb-6">
                        <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-3`}>
                            What did we find?
                        </Text>
                        <Text className={`${isDark ? "text-white/70" : "text-black/70"} mb-4`}>
                            Tap the best match:
                        </Text>
                        {predictions.map((pred, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => fetchMealDataFromLLM(pred.label)}
                                disabled={llmLoading}
                                className={`mb-3 rounded-xl p-4 border ${
                                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                }`}
                            >
                                <View className="flex-row justify-between items-center">
                                    <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-black"}`}>
                                        {pred.label.replace(/_/g, ' ')}
                                    </Text>
                                    <Text className={`${isDark ? "text-white/60" : "text-black/60"}`}>
                                        {(pred.confidence * 100).toFixed(0)}%
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Loading LLM Response */}
                {llmLoading && (
                    <View className="items-center py-8">
                        <ActivityIndicator size="large" color={isDark ? "#422ad5" : "#f88f07"} />
                        <Text className={`mt-4 ${isDark ? "text-white" : "text-black"}`}>
                            Generating meal details...
                        </Text>
                    </View>
                )}

                {/* Meal Data Preview - reviews before saving */}
                {mealData && (
                    <View className="mb-6">
                        <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                            {mealData.title}
                        </Text>

                        {/* Macros */}
                        <View className={`rounded-xl p-4 mb-4 border ${
                            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                        }`}>
                            <View className="flex-row justify-around">
                                <View className="items-center">
                                    <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                        {mealData.calories}
                                    </Text>
                                    <Text className={`text-xs ${isDark ? "text-white/60" : "text-black/60"}`}>
                                        cal
                                    </Text>
                                </View>
                                <View className="items-center">
                                    <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                        {mealData.protein}g
                                    </Text>
                                    <Text className={`text-xs ${isDark ? "text-white/60" : "text-black/60"}`}>
                                        protein
                                    </Text>
                                </View>
                                <View className="items-center">
                                    <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                        {mealData.carb}g
                                    </Text>
                                    <Text className={`text-xs ${isDark ? "text-white/60" : "text-black/60"}`}>
                                        carbs
                                    </Text>
                                </View>
                                <View className="items-center">
                                    <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                                        {mealData.fat}g
                                    </Text>
                                    <Text className={`text-xs ${isDark ? "text-white/60" : "text-black/60"}`}>
                                        fat
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Description */}
                        <Text className={`${isDark ? "text-white/80" : "text-black/80"} mb-4`}>
                            {mealData.description}
                        </Text>

                        {/* Action Buttons */}
                        <View className="gap-3">
                            <TouchableOpacity
                                onPress={saveMeal}
                                disabled={saving}
                                className={`rounded-xl p-4 ${saving ? 'bg-gray-400' : 'bg-green-500'}`}
                            >
                                <Text className="text-white text-center text-lg font-semibold">
                                    {saving ? 'Saving...' : '✓ Save Meal'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setImageUri(null);
                                    setPredictions([]);
                                    setMealData(null);
                                }}
                                className="bg-gray-500 rounded-xl p-4"
                            >
                                <Text className="text-white text-center font-semibold">
                                    Start Over
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </ThemeProvider>
    );
}