<?php

namespace Database\Seeders;

class TurtleTechSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return require database_path('seeders/TurtleTechSeeder_FINAL.php');
    }
}
