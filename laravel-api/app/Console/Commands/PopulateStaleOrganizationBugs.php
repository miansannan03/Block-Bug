<?php

namespace App\Console\Commands;

use App\Support\StaleOrganizationBugPopulation;
use Illuminate\Console\Command;

class PopulateStaleOrganizationBugs extends Command
{
    protected $signature = 'blockbug:populate-stale-bugs {--apply : Write the previewed local demo dataset}';

    protected $description = 'Preview or add September 2026 demo history for organizations inactive before September 15';

    public function handle(StaleOrganizationBugPopulation $population): int
    {
        $apply = (bool) $this->option('apply');
        $rows = $apply ? $population->populate() : $population->plan();
        $this->table(['Organization', 'Before', 'After', 'Added', 'Note'], array_map(fn ($row) => [
            $row['name'], $row['before'], $row['after'], $row['add'], $row['skip_reason'] ?? '',
        ], $rows));
        $this->info(($apply ? 'Added ' : 'Would add ').array_sum(array_column($rows, 'add')).' bugs with activity, database proof, and audit history.');
        $this->line('Existing bugs are preserved. Proofs are database-backed, not on-chain transactions.');
        if (! $apply) {
            $this->line('Preview only. Use --apply to write this local-only dataset.');
        }

        return self::SUCCESS;
    }
}
