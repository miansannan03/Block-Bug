<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\SuperAdminController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [ApiController::class, 'health']);
Route::get('/public-settings', [ApiController::class, 'publicSettings']);
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/invitations/inspect', [InvitationController::class, 'inspect'])->middleware('throttle:30,1');
Route::post('/invitations/accept', [InvitationController::class, 'accept'])->middleware('throttle:10,1');

Route::middleware('auth.blockbug')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('super.admin')->prefix('super-admin')->group(function (): void {
        Route::get('/dashboard', [SuperAdminController::class, 'dashboard']);
        Route::get('/organizations', [SuperAdminController::class, 'organizations']);
        Route::get('/organizations/{id}', [SuperAdminController::class, 'organization']);
        Route::patch('/organizations/{id}', [SuperAdminController::class, 'updateOrganization']);
        Route::delete('/organizations/{id}', [SuperAdminController::class, 'deleteOrganization']);
        Route::get('/invitations', [InvitationController::class, 'organizationInvitations']);
        Route::post('/invitations', [InvitationController::class, 'createOrganizationInvitation']);
        Route::post('/invitations/{id}/regenerate', [InvitationController::class, 'regenerate']);
        Route::post('/invitations/{id}/revoke', [InvitationController::class, 'revoke']);
        Route::get('/audit-logs', [SuperAdminController::class, 'auditLogs']);
        Route::get('/error-logs', [SuperAdminController::class, 'errorLogs']);
    });

    Route::middleware('organization.user')->group(function (): void {
        Route::get('/users', [ApiController::class, 'users']);
        Route::get('/roles', [ApiController::class, 'roles']);
        Route::patch('/users/{id}', [ApiController::class, 'updateUser']);
        Route::delete('/users/{id}', [ApiController::class, 'deleteUser']);
        Route::post('/users/{id}/password', [ApiController::class, 'changePassword']);
        Route::get('/user-invitations', [InvitationController::class, 'userInvitations']);
        Route::post('/user-invitations', [InvitationController::class, 'createUserInvitation']);
        Route::post('/user-invitations/{id}/regenerate', [InvitationController::class, 'regenerate']);
        Route::post('/user-invitations/{id}/revoke', [InvitationController::class, 'revoke']);

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
        Route::get('/attachments/{id}/download', [ApiController::class, 'downloadAttachment']);
        Route::get('/bugs/{bugId}/comments', [ApiController::class, 'comments']);
        Route::post('/bugs/{bugId}/comments', [ApiController::class, 'createComment']);
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
        Route::get('/organization-audit-logs', [ApiController::class, 'organizationAuditLogs']);
        Route::get('/maintenance/export', [ApiController::class, 'export']);
        Route::post('/maintenance/clear-data', [ApiController::class, 'clearData']);
        Route::post('/maintenance/reset-demo', [ApiController::class, 'resetDemo']);
    });
});
