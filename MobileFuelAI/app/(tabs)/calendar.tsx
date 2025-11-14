import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { icons } from "@/constants/icons";
import { Calendar } from 'react-native-calendars';
import { Link } from "expo-router";

const UserCalendar = () => {
    const [selected, setSelected] = useState('');
    const isDark = useColorScheme() === "dark";

    // Custom theme for the calendar
    const calendarTheme = {
        calendarBackground: isDark ? '#000000' : '#ffffff',
        textSectionTitleColor: isDark ? '#ffffff' : '#000000',
        selectedDayBackgroundColor: '#3b82f6',
        selectedDayTextColor: '#ffffff',
        todayTextColor: '#3b82f6',
        dayTextColor: isDark ? '#ffffff' : '#000000',
        textDisabledColor: isDark ? '#666666' : '#d9d9d9',
        monthTextColor: isDark ? '#ffffff' : '#000000',
        textMonthFontWeight: 'bold',
        textDayFontSize: 16,
        textMonthFontSize: 20,
        textDayHeaderFontSize: 14,
        arrowColor: isDark ? '#ffffff' : '#000000',
    };

    // Helper to format date without timezone issues, previously would show one day off the actual day.
    const formatDateForDisplay = (dateString: string) => {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    return (
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <ScrollView
                className={`flex-1 ${isDark ? "bg-primary" : "bg-secondary"}`}
                contentContainerClassName="pb-10"
            >
                {/* Header */}
                <View className="items-center mt-16 mb-6">
                    <Image source={icons.logo} className="w-14 h-14" />
                    <Text className={`mt-3 text-2xl font-semibold ${isDark ? 'text-secondary' : 'text-primary'}`}>
                        Your Calendar
                    </Text>
                    <Text className={`${isDark ? 'text-secondary/70' : 'text-primary/60'} mt-1`}>
                        Track your meals and nutrition
                    </Text>
                </View>

                {/* Calendar */}
                <View className="mx-5">
                    <View
                        className={`rounded-2xl overflow-hidden border ${
                            isDark ? 'border-secondary/15' : 'border-primary/10'
                        }`}
                    >
                        <Calendar
                            theme={calendarTheme}
                            onDayPress={day => {
                                setSelected(day.dateString);
                            }}
                            markedDates={{
                                [selected]: {
                                    selected: true,
                                    disableTouchEvent: true,
                                    selectedColor: '#3b82f6'
                                }
                            }}
                            enableSwipeMonths={true}
                            style={{
                                borderRadius: 16,
                            }}
                        />
                    </View>
                </View>

                {/* Selected Date Display */}
                {selected && (
                    <View className="mx-5 mt-6">
                        <View
                            className={`rounded-2xl p-4 border ${
                                isDark ? 'bg-secondary/10 border-secondary/15' : 'bg-primary/5 border-primary/10'
                            }`}
                        >
                            <Text className={`text-center text-sm ${isDark ? "text-white/60" : "text-black/60"}`}>
                                Selected Date
                            </Text>
                            <Text className={`text-center text-xl font-semibold mt-1 ${isDark ? "text-white" : "text-black"}`}>
                                {formatDateForDisplay(selected)}
                            </Text>
                        </View>


                        {/* Button to view the specific day */}
                        <Link href={`/calendar/${selected}`} asChild>
                            <TouchableOpacity
                                className={`rounded-2xl p-4 mt-4 border ${
                                    isDark ? 'bg-secondary/10 border-secondary/15' : 'bg-primary/5 border-primary/10'
                                }`}
                            >
                                <Text className={`text-center text-lg font-semibold ${isDark ? "text-secondary" : "text-primary"}`}>
                                    View Meals for This Day →
                                </Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}

                {/* If it is an empty state */}
                {!selected && (
                    <View className="mx-5 mt-6">
                        <View
                            className={`rounded-2xl p-6 border ${
                                isDark ? 'bg-secondary/10 border-secondary/15' : 'bg-primary/5 border-primary/10'
                            }`}
                        >
                            <Text className={`text-center ${isDark ? "text-white/60" : "text-black/50"}`}>
                                Select a date to view your meals and nutrition data
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </ThemeProvider>
    );
};

export default UserCalendar;