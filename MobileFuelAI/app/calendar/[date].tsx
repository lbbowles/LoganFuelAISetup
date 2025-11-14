import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, useColorScheme, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { withAuth } from "@/services/api";

// Type definitions to avoid annoying type errors
type NutritionalInfo = {
    id: number;
    meal_id: number;
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

type MealPlanMeal = {
    id: number;
    meal_plan_id: number;
    meal_id: number;
    day_of_week: string;
    meal_time: string;
    meal: Meal;
};

type Task = {
    id: number;
    user_id: number;
    title: string | null;
    description: string;
    difficulty: string | null;
    category: string | null;
    is_completed: boolean;
    deadline: string | null;
    created_at: string;
    updated_at: string;
};

const mealTimes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function formatNice(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getDayOfWeek(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()];
}

// Returns YYYY-MM-DD so that it can compare to the MealPlan
function formatDateForComparison(dateStr: string): string {
    // If already in YYYY-MM-DD format, return as-is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
    }
    // Otherwise parse and format
    const [year, month, day] = dateStr.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function FoodForDay() {
    const { session } = useAuth();
    const { date } = useLocalSearchParams<{ date: string }>();
    const isDark = useColorScheme() === "dark";
    const dateKey = typeof date === "string" ? date : Array.isArray(date) ? date[0] : "";

    const [loading, setLoading] = useState(true);
    const [meals, setMeals] = useState<MealPlanMeal[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const dayOfWeek = getDayOfWeek(dateKey);

    useEffect(() => {
        fetchDayData();
    }, [dateKey]);

    const fetchDayData = async () => {
        try {
            setLoading(true);
            const api = withAuth(session.access_token);

            // Get all meal plans, sorted by most recently updated
            const mealPlansData = await api.getMealPlans();
            const sortedPlans = mealPlansData.meal_plans.sort((a: any, b: any) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );

            if (sortedPlans.length > 0) {
                // Get the most recently updated meal plan's meals
                const activePlan = await api.getMealPlan(sortedPlans[0].id);

                // Filter meals for this day of week
                const dayMeals = activePlan.meal_plan_meals.filter(
                    (mpm: MealPlanMeal) => mpm.day_of_week === dayOfWeek
                );
                setMeals(dayMeals);
            }

            // Get tasks with deadline matching this date
            const tasksData = await api.getTasks();
            const targetDate = formatDateForComparison(dateKey);
            const dayTasks = tasksData.tasks.filter((task: Task) => {
                if (!task.deadline) return false;
                const taskDate = formatDateForComparison(task.deadline);
                return taskDate === targetDate;
            });
            setTasks(dayTasks);

        } catch (error) {
            console.error('Failed to fetch day data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get meal for a specific time slot
    const getMealForTime = (mealTime: string) => {
        return meals.find(m => m.meal_time === mealTime);
    };

    const getDifficultyColor = (difficulty: string | null) => {
        switch (difficulty) {
            case 'easy': return '#10b981';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return isDark ? '#888' : '#666';
        }
    };

    const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
        try {
            const api = withAuth(session.access_token);
            await api.updateTask(taskId, { is_completed: !currentStatus });

            // Refresh tasks after toggling
            await fetchDayData();
        } catch (error) {
            console.error('Failed to toggle task:', error);
            Alert.alert('Error', 'Failed to update task status');
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

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <ScrollView className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"} px-6 py-16`} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Back Button */}
                <TouchableOpacity onPress={() => router.push('/calendar')} className="mb-4">
                    <Text className={`text-lg ${isDark ? "text-secondary" : "text-primary"}`}>
                        ← Back
                    </Text>
                </TouchableOpacity>

                {/* Date Header */}
                <Text className={`text-2xl font-bold text-center ${isDark ? "text-secondary" : "text-primary"} mb-2`}>
                    {formatNice(dateKey)}
                </Text>
                <Text className={`text-center ${isDark ? "text-secondary/70" : "text-primary/70"} mb-8`}>
                    Rome was built one day at a time...
                </Text>

                {/* Meals Section */}
                <View className="mb-8">
                    <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                        Your Meals
                    </Text>

                    {meals.length === 0 ? (
                        <View className={`rounded-2xl p-6 border ${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
                            <Text className={`text-center ${isDark ? "text-white/60" : "text-black/60"}`}>
                                No meals planned for {dayOfWeek}. Add some meals to your meal plan!
                            </Text>
                        </View>
                    ) : (
                        mealTimes.map((mealTime) => {
                            const mealSlot = getMealForTime(mealTime);
                            return (
                                <View
                                    key={mealTime}
                                    className={`mt-4 rounded-2xl p-4 border ${
                                        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                    }`}
                                >
                                    <Text className={`font-semibold mb-2 ${isDark ? "text-white/80" : "text-black/70"}`}>
                                        {mealTime}
                                    </Text>
                                    {mealSlot ? (
                                        <TouchableOpacity
                                            onPress={() => router.push(`/recipes/${mealSlot.meal.id}`)}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`font-bold text-lg ${isDark ? "text-white" : "text-black"}`}>
                                                {mealSlot.meal.name}
                                            </Text>
                                            <Text className={`${isDark ? "text-white/60" : "text-black/50"} text-sm mt-1`}>
                                                {mealSlot.meal.nutritional_info?.calories || 0} cal | {mealSlot.meal.nutritional_info?.protein || 0}g protein
                                            </Text>
                                            {mealSlot.meal.description && (
                                                <Text className={`mt-2 ${isDark ? "text-white/60" : "text-black/50"}`} numberOfLines={3}>
                                                    {mealSlot.meal.description}
                                                </Text>
                                            )}
                                            <Text className={`mt-2 text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                                Tap to view full recipe →
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text className={`${isDark ? "text-white/40" : "text-black/30"}`}>
                                            No meal planned
                                        </Text>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Tasks Section */}
                {tasks.length > 0 && (
                    <View>
                        <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                            Tasks Due Today
                        </Text>
                        {tasks.map((task) => (
                            <TouchableOpacity
                                key={task.id}
                                onPress={() => toggleTaskCompletion(task.id, task.is_completed)}
                                className={`mb-3 rounded-2xl p-4 border ${
                                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                                }`}
                            >
                                <View className="flex-row items-start gap-3">
                                    <View className={`w-6 h-6 rounded border-2 mt-1 ${
                                        task.is_completed
                                            ? 'bg-green-500 border-green-500'
                                            : (isDark ? 'border-white/40' : 'border-black/40')
                                    }`} />

                                    <View className="flex-1">
                                        {task.title && (
                                            <Text className={`font-bold text-lg ${isDark ? "text-white" : "text-black"} mb-1`}>
                                                {task.title}
                                            </Text>
                                        )}
                                        <Text className={`${isDark ? "text-white/80" : "text-black/80"} mb-2`}>
                                            {task.description}
                                        </Text>
                                        <View className="flex-row items-center gap-2 flex-wrap">
                                            {task.difficulty && (
                                                <View className="px-2 py-1 rounded" style={{ backgroundColor: getDifficultyColor(task.difficulty) + '30' }}>
                                                    <Text className="text-xs font-semibold" style={{ color: getDifficultyColor(task.difficulty) }}>
                                                        {task.difficulty}
                                                    </Text>
                                                </View>
                                            )}
                                            {task.category && (
                                                <View className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                                    <Text className={`text-xs ${isDark ? "text-white/70" : "text-black/70"}`}>
                                                        {task.category}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Quick Actions */}
                <View className="mt-8 gap-3">
                    <TouchableOpacity
                        onPress={() => router.push('/mealPlans')}
                        className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                    >
                        <Text className="text-center font-semibold text-white">
                            View Meal Plans
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/tasks/createTask')}
                        className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                    >
                        <Text className="text-center font-semibold text-white">
                            Create New Task
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ThemeProvider>
    );
}