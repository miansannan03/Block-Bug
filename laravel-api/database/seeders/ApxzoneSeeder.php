<?php

namespace Database\Seeders;

class ApxzoneSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return require database_path('seeders/ApxzoneSeeder_FINAL.php');
    }
}
