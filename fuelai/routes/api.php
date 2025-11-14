<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ForumController;
use App\Http\Controllers\Api\V1\MealPlanController;
use App\Http\Controllers\Api\V1\MealController;
use App\Http\Controllers\Api\V1\TaskController;

// Authentication
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Users
    Route::put('/user/profile', [UserController::class, 'update']);
    Route::post('/users/{user}/follow', [UserController::class, 'follow']);
    Route::get('/users/{user}/followers', [UserController::class, 'followers']);

    // Forums
    Route::get('/forums', [ForumController::class, 'index']);
    Route::get('/forums/{post}', [ForumController::class, 'show']);
    Route::post('/forums', [ForumController::class, 'store']);
    Route::post('/forums/{post}/reply', [ForumController::class, 'reply']);
    Route::delete('/forums/{id}', [ForumController::class, 'destroy']);
    Route::get('/forums-categories', [ForumController::class, 'getCategories']);

    // Meals
    Route::get('/meals', [MealController::class, 'index']);
    Route::post('/meals', [MealController::class, 'store']);

    // Meal Plans
    Route::get('/meal-plans', [MealPlanController::class, 'index']);
    Route::post('/meal-plans', [MealPlanController::class, 'store']);
    Route::get('/meal-plans/{id}', [MealPlanController::class, 'show']);
    Route::delete('/meal-plans/{id}', [MealPlanController::class, 'destroy']);
    Route::post('/meal-plans/{id}/add-meal', [MealPlanController::class, 'addMeal']);
    Route::delete('/meal-plans-meals/{id}', [MealPlanController::class, 'removeMeal']);
    Route::post('/meal-plans/{id}/touch', [MealPlanController::class, 'touch']);

    // Tasks
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
    Route::post('/tasks/workout', [TaskController::class, 'storeWorkout']);
});
