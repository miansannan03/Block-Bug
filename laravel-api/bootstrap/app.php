<?php

use App\Http\Middleware\AuthenticateBlockBug;
use App\Http\Middleware\LogApplicationErrors;
use App\Http\Middleware\RequestContext;
use App\Http\Middleware\RequireOrganizationUser;
use App\Http\Middleware\RequireSuperAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: ['api/*']);
        $middleware->api(prepend: [RequestContext::class, LogApplicationErrors::class]);
        $middleware->alias([
            'auth.blockbug' => AuthenticateBlockBug::class,
            'organization.user' => RequireOrganizationUser::class,
            'super.admin' => RequireSuperAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
