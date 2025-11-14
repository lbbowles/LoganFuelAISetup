import React, { useState, useEffect } from "react";
import {ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, useColorScheme, View} from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { icons } from "@/constants/icons";
import { router } from "expo-router";
import {useAuth} from "@/app/context/AuthContext";
import {withAuth} from "@/services/api";

// Type definitions to avoid annoying type errors
type Task = {
    id: number;
    user_id: number;
    title: string | null;
    content: string | null;
    description: string;
    difficulty: string | null;
    category: string | null;
    is_completed: boolean;
    deadline: string | null;
    created_at: string;
    updated_at: string;
};

export default function Tasks() {
    const { session } = useAuth();
    const isDark = useColorScheme() === "dark";

    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const api = withAuth(session.access_token);
            const data = await api.getTasks();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            Alert.alert('Error', 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
        try {
            const api = withAuth(session.access_token);
            await api.updateTask(taskId, { is_completed: !currentStatus });
            await fetchTasks();
        } catch (error) {
            console.error('Failed to toggle task:', error);
            Alert.alert('Error', 'Failed to update task status');
        }
    };

    const getDifficultyColor = (difficulty: string | null) => {
        switch (difficulty) {
            case 'easy': return '#10b981';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return isDark ? '#888' : '#666';
        }
    };

    const sortTasksByDeadline = (taskList: Task[]) => {
        return [...taskList].sort((a, b) => {
            // If one has no deadline, it goes to the bottom
            if (!a.deadline && b.deadline) return 1;
            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && !b.deadline) return 0;

            // Both have deadlines - sort by soonest first
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
    };

    // Separate tasks
    const incompleteTasks = tasks.filter(t => !t.is_completed);
    const completedTasks = tasks.filter(t => t.is_completed);

    const regularTasks = sortTasksByDeadline(incompleteTasks.filter(t => t.category !== 'Exercise'));
    const exerciseTasks = sortTasksByDeadline(incompleteTasks.filter(t => t.category === 'Exercise'));

    const formatDeadline = (deadline: string | null) => {
        if (!deadline) return null;
        const date = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(date);
        deadlineDate.setHours(0, 0, 0, 0);

        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Format the deadline based on how close it is
        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays <= 7) return `${diffDays} days`;
        return date.toLocaleDateString();
    };

    const TaskCard = ({ task }: { task: Task }) => (
        <TouchableOpacity
            onPress={() => toggleTaskCompletion(task.id, task.is_completed)}
            className={`mb-3 rounded-2xl p-4 border ${
                isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            }`}
        >
            <View className="flex-row items-start gap-3">
                {/* Checkbox */}
                <View className={`w-6 h-6 rounded border-2 items-center justify-center mt-1 ${
                    task.is_completed
                        ? 'bg-green-500 border-green-500'
                        : (isDark ? 'border-white/40' : 'border-black/40')
                }`}>
                    {task.is_completed && (
                        <Text className="text-white text-sm font-bold">✓</Text>
                    )}
                </View>

                <View className="flex-1">
                    {task.title && (
                        <Text className={`font-bold text-lg ${
                            task.is_completed ? 'line-through opacity-60' : ''
                        } ${isDark ? "text-white" : "text-black"} mb-1`}>
                            {task.title}
                        </Text>
                    )}
                    <Text className={`${
                        task.is_completed ? 'line-through opacity-60' : ''
                    } ${isDark ? "text-white/80" : "text-black/80"} mb-2`} numberOfLines={3}>
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
                        {task.deadline && (
                            <View className={`px-2 py-1 rounded ${
                                formatDeadline(task.deadline) === 'Overdue'
                                    ? 'bg-red-500/30'
                                    : formatDeadline(task.deadline) === 'Today'
                                        ? 'bg-orange-500/30'
                                        : 'bg-blue-500/30'
                            }`}>
                                <Text className={`text-xs font-semibold ${
                                    formatDeadline(task.deadline) === 'Overdue'
                                        ? 'text-red-600'
                                        : formatDeadline(task.deadline) === 'Today'
                                            ? 'text-orange-600'
                                            : 'text-blue-600'
                                }`}>
                                    {formatDeadline(task.deadline)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const CompletedTaskCard = ({ task }: { task: Task }) => (
        <TouchableOpacity
            onPress={() => toggleTaskCompletion(task.id, task.is_completed)}
            className={`mb-3 rounded-2xl p-4 border ${
                isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            }`}
        >
            <View className="flex-row items-start gap-3">
                <View className="w-6 h-6 rounded bg-green-500 border-2 border-green-500 mt-1" />

                <View className="flex-1">
                    {task.title && (
                        <Text className={`font-bold text-lg ${isDark ? "text-white" : "text-black"} mb-1`}>
                            {task.title}
                        </Text>
                    )}
                    <Text className={`${isDark ? "text-white/80" : "text-black/80"} mb-2`} numberOfLines={3}>
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
                        {task.deadline && (
                            <View className={`px-2 py-1 rounded ${
                                formatDeadline(task.deadline) === 'Overdue'
                                    ? 'bg-red-500/30'
                                    : formatDeadline(task.deadline) === 'Today'
                                        ? 'bg-orange-500/30'
                                        : 'bg-blue-500/30'
                            }`}>
                                <Text className={`text-xs font-semibold ${
                                    formatDeadline(task.deadline) === 'Overdue'
                                        ? 'text-red-600'
                                        : formatDeadline(task.deadline) === 'Today'
                                            ? 'text-orange-600'
                                            : 'text-blue-600'
                                }`}>
                                    {formatDeadline(task.deadline)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

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
            <ScrollView className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"} px-6 py-12`} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Header */}
                <View className="items-center mt-16 mb-6">
                    <Image source={icons.logo} className="w-14 h-14" />
                    <Text className={`mt-3 text-2xl font-semibold ${isDark ? 'text-secondary' : 'text-primary'}`}>
                        Your Tasks
                    </Text>
                    <Text className={`${isDark ? 'text-secondary/70' : 'text-primary/60'} mt-1`}>
                        Track your goals and workouts
                    </Text>
                </View>

                {/* Stats */}
                <View className="flex-row gap-3 mb-6">
                    <View className={`flex-1 rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                            {incompleteTasks.length}
                        </Text>
                        <Text className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                            Active
                        </Text>
                    </View>
                    <View className={`flex-1 rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                            {completedTasks.length}
                        </Text>
                        <Text className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                            Completed
                        </Text>
                    </View>
                    <View className={`flex-1 rounded-2xl p-4 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>
                            {tasks.length}
                        </Text>
                        <Text className={`text-sm ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                            Total
                        </Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                        onPress={() => router.push('/tasks/createTask')}
                        className={`flex-1 rounded-2xl p-4 items-center ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                    >
                        <Text className="text-white font-semibold">+ New Task</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/exercises/generate')}
                        className="flex-1 bg-green-500 rounded-2xl p-4 items-center"
                    >
                        <Text className="text-white font-semibold">New Workout</Text>
                    </TouchableOpacity>
                </View>

                {/* Regular Tasks */}
                <View className="mb-6">
                    <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                        Tasks ({regularTasks.length})
                    </Text>
                    {regularTasks.length === 0 ? (
                        <View className={`rounded-2xl p-6 border ${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
                            <Text className={`text-center ${isDark ? "text-white/60" : "text-black/60"}`}>
                                No active tasks. Create one to get started!
                            </Text>
                        </View>
                    ) : (
                        regularTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                </View>

                {/* Exercise Tasks */}
                <View className="mb-6">
                    <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                        Workouts ({exerciseTasks.length})
                    </Text>
                    {exerciseTasks.length === 0 ? (
                        <View className={`rounded-2xl p-6 border ${isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"}`}>
                            <Text className={`text-center ${isDark ? "text-white/60" : "text-black/60"}`}>
                                No workout tasks. Generate a workout to add exercises!
                            </Text>
                        </View>
                    ) : (
                        exerciseTasks.map(task => <TaskCard key={task.id} task={task} />)
                    )}
                </View>

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <View>
                        <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-black"} mb-4`}>
                            Completed ({completedTasks.length})
                        </Text>
                        {completedTasks.map(task => <CompletedTaskCard key={task.id} task={task} />)}
                    </View>
                )}
            </ScrollView>
        </ThemeProvider>
    );
}