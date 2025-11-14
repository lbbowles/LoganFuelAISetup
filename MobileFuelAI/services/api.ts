import { Platform } from "react-native";

// Since we are hosting locally for presentation, base URL will just be the local port hosting
const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
console.log('API BASE URL:', BASE);

async function request(path: string, opts: RequestInit = {}) {
    const url = `${BASE ?? ""}${path}`;

    const headers = {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
    };

    const res = await fetch(url, {
        ...opts,
        headers: headers,
    });

    const text = await res.text();

    if (!res.ok) {
        const message = text || `HTTP ${res.status} ${res.statusText}`;
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${message}`);
    }

    // Parse the text as JSON
    try {
        return text ? JSON.parse(text) : null;
    } catch (e) {
        console.error("JSON parse error:", e, "Response:", text);
        return text;
    }
}

// Function for registering.  Therefore, outside of withAuth.
export async function register(username: string, email: string, password: string) {
    return request("/register", {
        method: "POST",
        body: JSON.stringify({
            username: username,
            email: email,
            password: password,
            password_confirmation: password,
            device_name: Platform.OS,
        }),
    });
}

// Function for logging in.  Therefore, outside of withAuth.
export async function login(login: string, password: string) {
    return request("/login", {
        method: "POST",
        body: JSON.stringify({
            login: login,
            password: password,
            device_name: Platform.OS,
        }),
    });
}

// After authentication / Token establishment, we can use these functions to make requests.
export function withAuth(token: string) {
    const auth = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    return {
        // Meal Plan methods
        async getMealPlans() {
            return request('/meal-plans', {
                method: "GET",
                headers: auth,
            });
        },

        async createMealPlan(name: string, description: string) {
            return request('/meal-plans', {
                method: "POST",
                headers: auth,
                body: JSON.stringify({ name, description }),
            });
        },

        async getMealPlan(id: number) {
            return request(`/meal-plans/${id}`, {
                method: "GET",
                headers: auth,
            });
        },

        async deleteMealPlan(id: number) {
            return request(`/meal-plans/${id}`, {
                method: "DELETE",
                headers: auth,
            });
        },

        // Meal methods
        async getMeals() {
            return request('/meals', {
                method: "GET",
                headers: auth,
            });
        },

        async createMeal(name: string, description: string, calories: number, protein: number, carbs: number, fat: number) {
            return request('/meals', {
                method: "POST",
                headers: auth,
                body: JSON.stringify({ name, description, calories, protein, carbs, fat }),
            });
        },

        async addMealToPlan(planId: number, mealId: number, dayOfWeek: string, mealTime: string) {
            return request(`/meal-plans/${planId}/add-meal`, {
                method: "POST",
                headers: auth,
                body: JSON.stringify({
                    meal_id: mealId,
                    day_of_week: dayOfWeek,
                    meal_time: mealTime
                }),
            });
        },

        async touchMealPlan(mealPlanId: number) {
            return request(`/meal-plans/${mealPlanId}/touch`, {
                method: "POST",
                headers: auth,
            });
        },

        // Forum methods
        async getAllPosts() {
            return request("/forums", {
                method: "GET",
                headers: auth,
            });
        },


        // Uncomment to resolve
        async getForumPosts() {
            return request("/forums", {
                method: "GET",
                headers: auth,
            });
        },

        async getForums() {
            return request('/forums-categories', {
                method: "GET",
                headers: auth,
            });
        },

        async createForumPost(title: string, content: string, categoryId: number) {
            return request("/forums", {
                method: "POST",
                headers: auth,
                body: JSON.stringify({
                    title,
                    content,
                    category_id: categoryId
                } as any),
            });
        },

        async getPost(id: number) {
            return request(`/forums/${id}`, {
                method: "GET",
                headers: auth,
            });
        },


        async getForumPost(id: number) {
            return request(`/forums/${id}`, {
                method: "GET",
                headers: auth,
            });
        },

        async replyToPost(postId: number, content: string) {
            return request(`/forums/${postId}/reply`, {
                method: "POST",
                headers: auth,
                body: JSON.stringify({ content }),
            });
        },

        async deletePost(postId: number) {
            return request(`/forums/${postId}`, {
                method: "DELETE",
                headers: auth,
            });
        },

        //Profile update Methods

        async updateProfile(username?: string, profileImageUrl?: string) {
            const body: any = {};
            if (username !== undefined) body.username = username;
            if (profileImageUrl !== undefined) body.profile_image_url = profileImageUrl;

            return request('/user/profile', {
                method: "PUT",
                headers: auth,
                body: JSON.stringify(body),
            });
        },

        // Task methods

        async getTasks() {
            return request('/tasks', {
                method: "GET",
                headers: auth,
            });
        },

        async createTask(content: string, difficulty: string, category: string, deadline: string | null) {
            return request('/tasks', {
                method: "POST",
                headers: auth,
                body: JSON.stringify({ content, difficulty, category, deadline }),
            });
        },

        async updateTask(taskId: number, updates: any) {
            return request(`/tasks/${taskId}`, {
                method: "PUT",
                headers: auth,
                body: JSON.stringify(updates),
            });
        },

        // I never added this as I thought it would be cool to collect all your tasks that are done, but pretty simple
        async deleteTask(taskId: number) {
            return request(`/tasks/${taskId}`, {
                method: "DELETE",
                headers: auth,
            });
        },

        async saveWorkoutToTasks(workoutTitle: string, exercises: any[], deadline: string | null) {
            return request('/tasks/workout', {
                method: "POST",
                headers: auth,
                body: JSON.stringify({ workout_title: workoutTitle, exercises, deadline }),
            });
        },

    };
}