<?php

namespace Database\Seeders;

use App\Support\StaleOrganizationBugPopulation;
use Illuminate\Database\Seeder;

class StaleOrganizationBugActivitySeeder extends Seeder
{
    public function run(): void
    {
        $rows = app(StaleOrganizationBugPopulation::class)->populate();
        $this->command?->info('Added '.array_sum(array_column($rows, 'add')).' demo bugs with activity, database proofs, and audits.');
    }
}
