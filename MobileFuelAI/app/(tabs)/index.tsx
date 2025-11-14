import React, { useState, useEffect } from "react";
import { View, useColorScheme, Image, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { images } from "@/constants/images";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext.js";
import { withAuth } from "@/services/api";
import AsyncStorage from '@react-native-async-storage/async-storage';

type Task = {
    id: number;
    user_id: number;
    title: string | null;
    description: string;
    difficulty: string;
    category: string;
    is_completed: boolean;
    deadline: string | null;
    created_at: string;
    updated_at: string;
};

export default function Index() {
    const isDark = useColorScheme() === "dark";
    const { user, signout, session } = useAuth();

    // Profile edit modal state
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [newUsername, setNewUsername] = useState(user?.username || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tasks state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const username = user?.username ? `${user.username}` : "guest";
    const email = user?.email || "No email";
    const profileImage = user?.profile_image_url || images.profile;

    // Fetch tasks on load
    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoadingTasks(true);
            const api = withAuth(session.access_token);
            const data = await api.getTasks();

            // Get incomplete tasks with deadlines, sorted by deadline (soonest first), limit to 5
            const tasksWithDeadlines = data.tasks
                .filter((task: Task) => !task.is_completed && task.deadline)
                .sort((a: Task, b: Task) => {
                    const dateA = new Date(a.deadline!).getTime();
                    const dateB = new Date(b.deadline!).getTime();
                    return dateA - dateB;
                })
                .slice(0, 5);

            setTasks(tasksWithDeadlines);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    };

    // Handle profile update
    const handleUpdateProfile = async () => {
        if (!newUsername.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const api = withAuth(session.access_token);
            const result = await api.updateProfile(newUsername, null);

            // Update AsyncStorage to not sign out user.
            const updatedUser = { ...user, ...result.user };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            setShowEditProfile(false);
            Alert.alert('Success', 'Profile updated! Reload app to see it.');
        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert('Error', `Failed to update profile: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#10b981';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const formatDeadline = (deadline: string | null) => {
        if (!deadline) return null;
        const date = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(date);
        deadlineDate.setHours(0, 0, 0, 0);

        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Overdue', color: '#ef4444' };
        if (diffDays === 0) return { text: 'Today', color: '#f59e0b' };
        if (diffDays === 1) return { text: 'Tomorrow', color: '#3b82f6' };
        if (diffDays <= 7) return { text: `${diffDays} days`, color: '#3b82f6' };
        return { text: date.toLocaleDateString(), color: '#6b7280' };
    };

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <View className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"}`}>
                <View className="flex-1 px-6 py-12 items-center">
                    {/* Avatar */}
                    <View className="w-28 h-28 rounded-full overflow-hidden items-center justify-center border"
                          style={{ borderColor: isDark ? "#ffffff22" : "#00000022" }}>
                        <Image
                            source={user?.profile_image_url ? { uri: profileImage } : profileImage}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>

                    {/* Username */}
                    <Text className={`mt-4 text-2xl font-bold ${isDark ? "text-secondary" : "text-primary"}`}>
                        {username}
                    </Text>

                    {/* Email */}
                    <Text className={`${isDark ? "text-secondary/70" : "text-primary/70"} mt-1 text-sm`}>
                        {email}
                    </Text>

                    {/* Bio section */}
                    <Text className={`${isDark ? "text-secondary/70" : "text-primary/70"} mt-1`}>
                        Fueling your day with better choices
                    </Text>

                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        onPress={() => {
                            setNewUsername(user?.username || '');
                            setShowEditProfile(true);
                        }}
                        className={`mt-4 px-6 py-2 rounded-full ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                    >
                        <Text className="text-white font-semibold">Edit Profile</Text>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View className="w-full max-w-md mt-8">
                        <TouchableOpacity
                            onPress={() => router.push(`/calendar/${new Date().toISOString().split('T')[0]}`)}
                            className="rounded-2xl px-4 py-4"
                            style={{
                                backgroundColor: isDark ? "#ffffff0f" : "#00000008",
                                borderWidth: 1
                            }}
                        >
                            <Text className={`text-lg font-semibold ${isDark ? "text-secondary" : "text-primary"}`}>
                                View Your Current Day
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Upcoming Tasks Section */}
                    <View className="w-full max-w-md mt-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`text-xl font-bold ${isDark ? "text-secondary" : "text-primary"}`}>
                                Upcoming Deadlines
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                                <Text className={`${isDark ? "text-secondary/70" : "text-primary/70"}`}>
                                    View All
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loadingTasks ? (
                            <View className="py-8 items-center">
                                <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                            </View>
                        ) : tasks.length === 0 ? (
                            <View className="rounded-2xl p-6 border mb-4"
                                  style={{ backgroundColor: isDark ? "#ffffff0f" : "#00000008" }}>
                                <Text className={`text-center ${isDark ? "text-secondary/70" : "text-primary/60"}`}>
                                    No tasks with deadlines yet!
                                </Text>
                            </View>
                        ) : (
                            <View className="space-y-2 mb-4">
                                {tasks.map((task) => {
                                    const deadlineInfo = formatDeadline(task.deadline);
                                    return (
                                        <View
                                            key={task.id}
                                            className="rounded-xl p-3 border"
                                            style={{ backgroundColor: isDark ? "#ffffff0f" : "#00000008" }}
                                        >
                                            <View className="flex-row items-start justify-between">
                                                <View className="flex-1 pr-2">
                                                    {task.title && (
                                                        <Text className={`font-bold ${isDark ? "text-white" : "text-black"} mb-1`}>
                                                            {task.title}
                                                        </Text>
                                                    )}
                                                    <Text className={`font-semibold ${isDark ? "text-white" : "text-black"}`} numberOfLines={2}>
                                                        {task.description}
                                                    </Text>
                                                    <View className="flex-row gap-2 mt-2">
                                                        <View className="px-2 py-1 rounded" style={{ backgroundColor: getDifficultyColor(task.difficulty) + '20' }}>
                                                            <Text className="text-xs font-semibold" style={{ color: getDifficultyColor(task.difficulty) }}>
                                                                {task.difficulty}
                                                            </Text>
                                                        </View>
                                                        <View className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                                            <Text className={`text-xs ${isDark ? "text-white/70" : "text-black/70"}`}>
                                                                {task.category}
                                                            </Text>
                                                        </View>
                                                        {deadlineInfo && (
                                                            <View className="px-2 py-1 rounded" style={{ backgroundColor: deadlineInfo.color + '20' }}>
                                                                <Text className="text-xs font-semibold" style={{ color: deadlineInfo.color }}>
                                                                    {deadlineInfo.text}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => router.push('/tasks/createTask')}
                            className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                        >
                            <Text className="text-lg font-semibold text-white text-center">
                                + Create New Task
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* My Forum Posts */}
                    <View className="w-full max-w-md mt-10">
                        <TouchableOpacity
                            onPress={() => router.push('/forum/userForum')}
                            className={`rounded-2xl px-4 py-4 ${isDark ? 'bg-dark-100' : 'bg-light-100'}`}
                        >
                            <Text className="text-lg font-semibold text-white text-center">
                                My Forum Posts
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Separator Line */}
                    <View className="w-full max-w-md my-6">
                        <View className={`h-px ${isDark ? 'bg-white/20' : 'bg-black/20'}`} />
                    </View>

                    {/* Sign out */}
                    <View className="w-full max-w-md">
                        <TouchableOpacity
                            onPress={async () => {
                                await signout();
                                router.replace('/signin');
                            }}
                            className="rounded-2xl px-4 py-4 bg-red-500"
                        >
                            <Text className="text-lg font-semibold text-white text-center">
                                Sign Out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Edit Profile Modal - Simplified */}
                <Modal
                    visible={showEditProfile}
                    transparent
                    animationType="fade"
                    onRequestClose={() => !isSubmitting && setShowEditProfile(false)}
                >
                    <View className="flex-1 bg-black/50 justify-center px-6">
                        <View className={`rounded-2xl p-6 ${isDark ? "bg-gray-900" : "bg-white"}`}>
                            <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-black"}`}>
                                Edit Username
                            </Text>

                            {/* Username Input */}
                            <Text className={`mb-2 ${isDark ? "text-white/80" : "text-black/80"}`}>
                                Username <Text className="text-red-500">*</Text>
                            </Text>
                            <TextInput
                                value={newUsername}
                                onChangeText={setNewUsername}
                                placeholder="Enter username"
                                placeholderTextColor={isDark ? '#666' : '#999'}
                                className={`border rounded-xl p-3 mb-6 ${
                                    isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'
                                }`}
                            />

                            {/* Action Buttons */}
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowEditProfile(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-gray-500 rounded-xl p-3"
                                >
                                    <Text className="text-white text-center font-semibold">Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleUpdateProfile}
                                    disabled={isSubmitting || !newUsername.trim()}
                                    className={`flex-1 rounded-xl p-3 ${
                                        isSubmitting || !newUsername.trim() ? 'bg-gray-400' : isDark ? 'bg-dark-100' : 'bg-light-100'
                                    }`}
                                >
                                    <Text className="text-white text-center font-semibold">
                                        {isSubmitting ? 'Updating...' : 'Update'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ThemeProvider>
    );
}