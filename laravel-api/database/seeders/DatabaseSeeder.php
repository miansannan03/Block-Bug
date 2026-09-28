<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $integrations = [
            ['int-slack', 'Slack', 'Get notifications in Slack when bugs are updated', 'SL', 'connected'],
            ['int-github', 'GitHub', 'Link bugs to GitHub issues', 'GH', 'connected'],
            ['int-jira', 'Jira', 'Sync BlockBug issues with Jira projects', 'JI', 'available'],
            ['int-teams', 'Microsoft Teams', 'Share bug updates with Teams channels', 'MT', 'available'],
        ];
        foreach ($integrations as [$id, $name, $description, $icon, $status]) {
            DB::table('integrations')->updateOrInsert(['name' => $name], ['id' => $id, 'description' => $description, 'icon' => $icon, 'status' => $status, 'created_at' => now(), 'updated_at' => now()]);
        }

        $this->call([
            ApxzoneSeeder::class,
            AzuraTechsSeeder::class,
            CodeTechStudioSeeder::class,
            JashabhsoftSeeder::class,
            OrbitorsSeeder::class,
            SoftbreezeSeeder::class,
            SystemLinksSeeder::class,
            TurtleTechSeeder::class,
            DemoOrganizationInvitationsSeeder::class,
            BugProofHistorySeeder::class,
        ]);
    }
}
