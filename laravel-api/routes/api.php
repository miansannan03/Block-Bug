<?php

use App\Http\Controllers\ApiController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [ApiController::class, 'health']);
Route::post('/organization-login', [ApiController::class, 'organizationLogin']);
Route::post('/login', [ApiController::class, 'login']);
Route::post('/member-login', [ApiController::class, 'memberLogin']);
Route::post('/signup', [ApiController::class, 'signup']);

Route::get('/users', [ApiController::class, 'users']);
Route::post('/users', [ApiController::class, 'createUser']);
Route::get('/roles', [ApiController::class, 'roles']);
Route::patch('/users/{id}', [ApiController::class, 'updateUser']);
Route::delete('/users/{id}', [ApiController::class, 'deleteUser']);
Route::post('/users/{id}/password', [ApiController::class, 'changePassword']);

Route::get('/projects', [ApiController::class, 'projects']);
Route::post('/projects', [ApiController::class, 'createProject']);
Route::delete('/projects/{id}', [ApiController::class, 'deleteProject']);
Route::get('/projects/{projectId}/sprints', [ApiController::class, 'sprints']);
Route::post('/projects/{projectId}/sprints', [ApiController::class, 'createSprint']);
Route::patch('/sprints/{id}', [ApiController::class, 'updateSprint']);
Route::post('/sprints/{id}/complete', [ApiController::class, 'completeSprint']);

Route::get('/bugs', [ApiController::class, 'bugs']);
Route::post('/bugs', [ApiController::class, 'createBug']);
Route::patch('/bugs/{id}', [ApiController::class, 'updateBug']);
Route::get('/bugs/{bugId}/attachments', [ApiController::class, 'attachments']);
Route::get('/bugs/{bugId}/comments', [ApiController::class, 'comments']);
Route::post('/bugs/{bugId}/comments', [ApiController::class, 'createComment']);

// Compatibility endpoint: exposes stored legacy proof records without invoking blockchain code.
Route::get('/bugs/{bugId}/blockchain-events', [ApiController::class, 'legacyProofEvents']);

Route::get('/activities', [ApiController::class, 'activities']);
Route::get('/notifications', [ApiController::class, 'notifications']);
Route::get('/preferences', [ApiController::class, 'preferences']);
Route::patch('/preferences', [ApiController::class, 'updatePreferences']);
Route::get('/system-settings', [ApiController::class, 'systemSettings']);
Route::patch('/system-settings', [ApiController::class, 'updateSystemSettings']);
Route::get('/api-keys', [ApiController::class, 'apiKeys']);
Route::post('/api-keys', [ApiController::class, 'createApiKey']);
Route::delete('/api-keys/{id}', [ApiController::class, 'revokeApiKey']);
Route::get('/integrations', [ApiController::class, 'integrations']);
Route::patch('/integrations/{id}', [ApiController::class, 'updateIntegration']);
Route::get('/stats', [ApiController::class, 'stats']);
Route::get('/dashboard', [ApiController::class, 'dashboard']);
Route::get('/reports', [ApiController::class, 'reports']);
Route::get('/maintenance/export', [ApiController::class, 'export']);
Route::post('/maintenance/clear-data', [ApiController::class, 'clearData']);
Route::post('/maintenance/reset-demo', [ApiController::class, 'resetDemo']);
