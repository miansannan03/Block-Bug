<?php

namespace Database\Seeders;

class CodeTechStudioSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return require database_path('seeders/CodeTechStudioSeeder_FINAL.php');
    }
}
