import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Switch } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { withAuth } from "@/services/api";

// Nutritional info type
type NutritionalInfo = {
    id: number;
    meal_id: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
};

// General meal, for adding it to the DB
type Meal = {
    id: number;
    name: string;
    description: string;
    nutritional_info?: NutritionalInfo; // Add this relationship
};

// The meal we are appending to the meal plan
type MealPlanMeal = {
    id: number;
    meal_plan_id: number;
    meal_id: number;
    day_of_week: string;
    meal_time: string;
    meal: Meal;
};

// The meal plan we are viewing
type MealPlan = {
    id: number;
    user_id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
};

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTimes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Load Meal Plan Visually
const MealPlanView = () => {
    const { session } = useAuth();
    const isDark = useColorScheme() === "dark";
    const { id } = useLocalSearchParams<{ id: string }>();

    // State management
    const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
    const [mealPlanMeals, setMealPlanMeals] = useState<MealPlanMeal[]>([]);
    const [allMeals, setAllMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);

    // Create meal modal state
    const [showCreateMeal, setShowCreateMeal] = useState(false);
    const [newMealName, setNewMealName] = useState('');
    const [newMealDescription, setNewMealDescription] = useState('');
    const [newMealCalories, setNewMealCalories] = useState('');
    const [newMealProtein, setNewMealProtein] = useState('');
    const [newMealCarbs, setNewMealCarbs] = useState('');
    const [newMealFat, setNewMealFat] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add meal to slot modal state
    const [showSelectMeal, setShowSelectMeal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
    const [repeatForAllDays, setRepeatForAllDays] = useState(false);

    // Fetch all information about the Meal Plan and Meals attached.
    useEffect(() => {
        fetchMealPlan();
        fetchAllMeals();
    }, [id]);

    const fetchMealPlan = async () => {
        try {
            setLoading(true);
            // Confirm session token
            const api = withAuth(session.access_token);
            const data = await api.getMealPlan(Number(id));
            setMealPlan(data.meal_plan);
            setMealPlanMeals(data.meal_plan_meals || []);
        } catch (error) {
            console.error('Failed to fetch meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load all meals within the DB so that they can be shown within the Modal
    const fetchAllMeals = async () => {
        try {
            const api = withAuth(session.access_token);
            const data = await api.getMeals();
            setAllMeals(data.meals || []);
        } catch (error) {
            console.error('Failed to fetch meals:', error);
        }
    };

    // Update the active meal plan for calendar
    const setAsActivePlan = async () => {
        try {
            const api = withAuth(session.access_token);

            // Use the API service instead of direct fetch
            await api.touchMealPlan(Number(id));

            Alert.alert('Success', 'This meal plan is now active on your calendar!');
        } catch (error) {
            console.error('Failed to set active plan:', error);
            Alert.alert('Error', 'Failed to set as active plan');
        }
    };

    // Function to get the meal for a specific slot (day -> meal)
    const getMealForSlot = (day: string, time: string) => {
        return mealPlanMeals.find(
            (mpm) => mpm.day_of_week === day && mpm.meal_time === time
        );
    };

    const handleSlotClick = (day: string, time: string) => {
        setSelectedSlot({ day, time });
        setRepeatForAllDays(false);
        setShowSelectMeal(true);
    };

    // Function to add a meal to a specific slot (day -> meal)
    const handleAddMealToSlot = async (meal: Meal) => {
        if (!selectedSlot) return;

        setIsSubmitting(true);
        try {
            const api = withAuth(session.access_token);

            // If repeat for all days is selected, add the meal for all days.
            if (repeatForAllDays) {

                for (const day of daysOfWeek) {
                    await api.addMealToPlan(Number(id), meal.id, day, selectedSlot.time);
                }
                Alert.alert('Success', `${meal.name} added to ${selectedSlot.time} for all days!`);
            } else {
                // Add meal to just this specific slot
                await api.addMealToPlan(Number(id), meal.id, selectedSlot.day, selectedSlot.time);
                Alert.alert('Success', `${meal.name} added to ${selectedSlot.day} ${selectedSlot.time}!`);
            }

            setShowSelectMeal(false);
            setSelectedSlot(null);
            await fetchMealPlan(); // Refresh the meal plan
        } catch (error) {
            console.error('Failed to add meal:', error);
            Alert.alert('Error', 'Failed to add meal to plan');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Create the meal and check requirements
    const handleCreateMeal = async () => {
        if (!newMealName.trim()) {
            Alert.alert('Error', 'Meal name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const api = withAuth(session.access_token);
            await api.createMeal(
                newMealName,
                newMealDescription,
                Number(newMealCalories) || 0,
                Number(newMealProtein) || 0,
                Number(newMealCarbs) || 0,
                Number(newMealFat) || 0
            );

            setNewMealName('');
            setNewMealDescription('');
            setNewMealCalories('');
            setNewMealProtein('');
            setNewMealCarbs('');
            setNewMealFat('');
            setShowCreateMeal(false);

            // Refresh meals list so that the user can use it.
            await fetchAllMeals();
            Alert.alert('Success', 'Meal created successfully!');
        } catch (error) {
            console.error('Failed to create meal:', error);
            Alert.alert('Error', 'Failed to create meal');
        } finally {
            setIsSubmitting(false);
        }
    };

    // If loading, darken
    if (loading) {
        return (
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <View className={`flex-1 items-center justify-center ${isDark ? "bg-primary" : "bg-secondary"}`}>
                    <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                </View>
            </ThemeProvider>
        );
    }

    // If no meal plan, show an error
    if (!mealPlan) {
        return (
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <View className={`flex-1 items-center justify-center ${isDark ? "bg-primary" : "bg-secondary"}`}>
                    <Text className={isDark ? "text-white" : "text-black"}>Meal plan not found</Text>
                </View>
            </ThemeProvider>
        );
    }

    // Actually display the meal plan with the aforementioned functions.
    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <View className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"}`}>
                <ScrollView className="flex-1 px-5" contentContainerClassName="pb-16">
                    <View className="mt-16 mb-6">


                        {/*Back Button*/}
                        <TouchableOpacity onPress={() => router.back()} className="mb-4">
                            <Text className={`text-lg ${isDark ? "text-secondary" : "text-primary"}`}>
                                ← Back to Meal Plans
                            </Text>
                        </TouchableOpacity>

                        {/*Rest of header*/}
                        <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}>
                            {mealPlan.name}
                        </Text>

                        {mealPlan.description && (
                            <Text className={`${isDark ? "text-white/70" : "text-black/60"} mt-2 mb-6`}>
                                {mealPlan.description}
                            </Text>
                        )}

                        {/* Set active mealplan by updating in DB */}
                        <TouchableOpacity
                            onPress={setAsActivePlan}
                            className={`mb-4 rounded-xl p-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                        >
                            <Text className="text-center text-lg font-semibold text-white">
                                Set as Active Plan
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/recipes/generate')}
                            className={`mt-4 rounded-xl p-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                        >
                            <Text className="text-center text-lg font-semibold text-white">
                                Generate Meal with FuelAI
                            </Text>
                        </TouchableOpacity>

                        <View className="flex-row items-center my-4">
                            <View className={`flex-1 h-px ${isDark ? 'bg-gray-400' : 'bg-gray-500'}`} />
                            <Text className={`mx-4 font-bold text-lg ${isDark ? 'text-white' : 'text-black'}`}>Or</Text>
                            <View className={`flex-1 h-px ${isDark ? 'bg-gray-400' : 'bg-gray-500'}`} />
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setShowCreateMeal(true)}
                                className={`flex-1 rounded-xl p-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                            >
                                <Text className="text-center font-semibold text-white">Manually Create Meal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/recipes/scan')}
                                className={`flex-1 rounded-xl p-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                            >
                                <Text className="text-center font-semibold text-white">Scan Meal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Days of the week with meal slots */}
                    {daysOfWeek.map((day) => (
                        <View key={day} className="mb-6">
                            <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-black"}`}>
                                {day}
                            </Text>

                            <View className="space-y-2">
                                {mealTimes.map((time) => {
                                    const mealSlot = getMealForSlot(day, time);
                                    return (
                                        <TouchableOpacity
                                            key={`${day}-${time}`}
                                            onPress={() => handleSlotClick(day, time)}
                                            className={`rounded-xl p-4 border ${
                                                isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                                            }`}
                                        >
                                            <Text className={`font-semibold mb-1 ${isDark ? "text-white/80" : "text-black/70"}`}>
                                                {time}
                                            </Text>
                                            {mealSlot ? (
                                                <View>
                                                    <Text className={`font-bold ${isDark ? "text-white" : "text-black"}`}>
                                                        {mealSlot.meal.name}
                                                    </Text>
                                                    <Text className={`${isDark ? "text-white/60" : "text-black/50"} text-sm`}>
                                                        {mealSlot.meal.nutritional_info?.calories || 0} cal | {mealSlot.meal.nutritional_info?.protein || 0}g protein
                                                    </Text>
                                                    {mealSlot.meal.description && (
                                                        <Text className={`mt-1 ${isDark ? "text-white/60" : "text-black/50"}`} numberOfLines={2}>
                                                            {mealSlot.meal.description}
                                                        </Text>
                                                    )}
                                                </View>
                                            ) : (
                                                <Text className={`${isDark ? "text-white/40" : "text-black/30"}`}>
                                                    Tap to add meal
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Select Meal Modal */}
                <Modal
                    visible={showSelectMeal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => !isSubmitting && setShowSelectMeal(false)}
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className={`rounded-t-3xl p-6 ${isDark ? "bg-gray-900" : "bg-white"}`}>
                            <Text className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-black"}`}>
                                Select Meal for {selectedSlot?.day} {selectedSlot?.time}
                            </Text>

                            {/* Repeat for all days toggle */}
                            <View className="flex-row items-center justify-between mb-4 p-3 rounded-xl"
                                  style={{ backgroundColor: isDark ? "#ffffff0f" : "#00000008" }}>
                                <Text className={isDark ? "text-white" : "text-black"}>
                                    Repeat for all {selectedSlot?.time}s
                                </Text>
                                <Switch
                                    value={repeatForAllDays}
                                    onValueChange={setRepeatForAllDays}
                                    trackColor={{ false: "#767577", true: "#3b82f6" }}
                                    thumbColor={repeatForAllDays ? "#2563eb" : "#f4f3f4"}
                                />
                            </View>

                            {/* Meals List with fixed height */}
                            <ScrollView style={{ height: 400, marginBottom: 16 }} showsVerticalScrollIndicator={true}>
                                {allMeals.length === 0 ? (
                                    <Text className={`text-center ${isDark ? "text-white/60" : "text-black/50"} py-8`}>
                                        No meals available. Create one first!
                                    </Text>
                                ) : (
                                    allMeals.map((meal) => (
                                        <TouchableOpacity
                                            key={meal.id}
                                            onPress={() => handleAddMealToSlot(meal)}
                                            disabled={isSubmitting}
                                            className={`p-4 mb-2 rounded-xl border ${
                                                isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                                            }`}
                                        >
                                            <Text className={`font-bold ${isDark ? "text-white" : "text-black"}`}>
                                                {meal.name}
                                            </Text>
                                            <Text className={`${isDark ? "text-white/60" : "text-black/50"} text-sm mt-1`}>
                                                {meal.nutritional_info?.calories || 0} cal | {meal.nutritional_info?.protein || 0}g protein | {meal.nutritional_info?.carbs || 0}g carbs | {meal.nutritional_info?.fat || 0}g fat
                                            </Text>
                                            {meal.description && (
                                                <Text className={`${isDark ? "text-white/50" : "text-black/40"} text-sm mt-1`} numberOfLines={2}>
                                                    {meal.description}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                onPress={() => setShowSelectMeal(false)}
                                disabled={isSubmitting}
                                className="bg-gray-500 rounded-xl p-3"
                            >
                                <Text className="text-white text-center font-semibold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Create Meal Modal */}
                <Modal
                    visible={showCreateMeal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => !isSubmitting && setShowCreateMeal(false)}
                >
                    <ScrollView className="flex-1 bg-black/50 px-6 py-20">
                        <View className={`rounded-2xl p-6 ${isDark ? "bg-gray-900" : "bg-white"}`}>
                            <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-black"}`}>
                                Create New Meal
                            </Text>

                            <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>
                                Meal Name <Text className="text-red-500">*</Text>
                            </Text>
                            <TextInput
                                value={newMealName}
                                onChangeText={setNewMealName}
                                placeholder="e.g., Grilled Chicken Salad"
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                className={`border rounded-xl p-3 mb-4 ${
                                    isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                }`}
                            />

                            <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>
                                Description
                            </Text>
                            <TextInput
                                value={newMealDescription}
                                onChangeText={setNewMealDescription}
                                placeholder="Describe the meal..."
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                multiline
                                numberOfLines={2}
                                className={`border rounded-xl p-3 mb-4 ${
                                    isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                }`}
                                style={{ textAlignVertical: 'top' }}
                            />

                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>Calories</Text>
                                    <TextInput
                                        value={newMealCalories}
                                        onChangeText={setNewMealCalories}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={isDark ? '#666' : '#999'}
                                        className={`border rounded-xl p-3 ${
                                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                        }`}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>Protein (g)</Text>
                                    <TextInput
                                        value={newMealProtein}
                                        onChangeText={setNewMealProtein}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={isDark ? '#666' : '#999'}
                                        className={`border rounded-xl p-3 ${
                                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                        }`}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-3 mb-6">
                                <View className="flex-1">
                                    <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>Carbs (g)</Text>
                                    <TextInput
                                        value={newMealCarbs}
                                        onChangeText={setNewMealCarbs}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={isDark ? '#666' : '#999'}
                                        className={`border rounded-xl p-3 ${
                                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                        }`}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>Fat (g)</Text>
                                    <TextInput
                                        value={newMealFat}
                                        onChangeText={setNewMealFat}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={isDark ? '#666' : '#999'}
                                        className={`border rounded-xl p-3 ${
                                            isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                        }`}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowCreateMeal(false);
                                        setNewMealName('');
                                        setNewMealDescription('');
                                        setNewMealCalories('');
                                        setNewMealProtein('');
                                        setNewMealCarbs('');
                                        setNewMealFat('');
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gray-500 rounded-xl p-3"
                                >
                                    <Text className="text-white text-center font-semibold">Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleCreateMeal}
                                    disabled={isSubmitting || !newMealName.trim()}
                                    className={`flex-1 rounded-xl p-3 ${
                                        isSubmitting || !newMealName.trim() ? 'bg-gray-400' : 'bg-blue-500'
                                    }`}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {isSubmitting ? 'Creating...' : 'Create Meal'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </Modal>

            </View>
        </ThemeProvider>
    );
};

export default MealPlanView;