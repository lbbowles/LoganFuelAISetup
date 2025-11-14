<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MealPlan;
use App\Models\MealPlanMeal;
use Illuminate\Http\Request;

class MealPlanController extends Controller
{
    public function index()
    {
        $meal_plans = MealPlan::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'meal_plans' => $meal_plans
        ], 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $mealPlan = MealPlan::create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'description' => $validated['description'],
        ]);

        return response()->json([
            'message' => 'Meal plan created successfully',
            'meal_plan' => $mealPlan
        ], 201);
    }

    public function show($id)
    {
        $meal_plan = MealPlan::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $meal_plan_meals = MealPlanMeal::where('meal_plan_id', $id)
            ->with(['meal.nutritionalInfo'])
            ->get();

        return response()->json([
            'meal_plan' => $meal_plan,
            'meal_plan_meals' => $meal_plan_meals
        ], 200);
    }

    public function destroy($id)
    {
        $mealPlan = MealPlan::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $mealPlan->delete();

        return response()->json([
            'message' => 'Meal plan deleted successfully'
        ], 200);
    }

    public function addMeal(Request $request, $id)
    {
        $validated = $request->validate([
            'meal_id' => 'required|exists:meals,id',
            'day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'meal_time' => 'required|in:Breakfast,Lunch,Dinner,Snack',
        ]);

        $mealPlan = MealPlan::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $existing = MealPlanMeal::where('meal_plan_id', $id)
            ->where('day_of_week', $validated['day_of_week'])
            ->where('meal_time', $validated['meal_time'])
            ->first();

        if ($existing) {
            $existing->update([
                'meal_id' => $validated['meal_id'],
                'updated_at' => now()
            ]);

            $existing->load(['meal.nutritionalInfo']);

            return response()->json([
                'message' => 'Meal updated successfully!',
                'meal_plan_meal' => $existing
            ], 200);
        }

        $mealPlanMeal = MealPlanMeal::create([
            'meal_plan_id' => $id,
            'meal_id' => $validated['meal_id'],
            'day_of_week' => $validated['day_of_week'],
            'meal_time' => $validated['meal_time'],
        ]);

        $mealPlanMeal->load(['meal.nutritionalInfo']);

        return response()->json([
            'message' => 'Meal added successfully!',
            'meal_plan_meal' => $mealPlanMeal
        ], 201);
    }

    // Update the meal plan so that it is therefore set "active"
    public function touch($id)
    {
        $mealPlan = MealPlan::findOrFail($id);

        // Check if user owns this meal plan
        if ($mealPlan->user_id !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Touch updates the updated_at timestamp
        $mealPlan->touch();

        return response()->json([
            'message' => 'Meal plan set as active',
            'meal_plan' => $mealPlan
        ]);
    }

    public function removeMeal($mealPlanMealId)
    {
        $mealPlanMeal = MealPlanMeal::findOrFail($mealPlanMealId);

        $mealPlan = MealPlan::where('id', $mealPlanMeal->meal_plan_id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $mealPlanMeal->delete();

        return response()->json([
            'message' => 'Meal removed'
        ], 200);
    }
}
