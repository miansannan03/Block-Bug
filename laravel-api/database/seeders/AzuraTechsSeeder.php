<?php

namespace Database\Seeders;

class AzuraTechsSeeder extends OrganizationDatasetSeeder
{
    protected function dataset(): array
    {
        return require database_path('seeders/AzuraTechsSeeder_FINAL.php');
    }
}
