<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class TablePagination
{
    public static function paginate(Builder $query, Request $request): LengthAwarePaginator
    {
        $validated = $request->validate(['page' => 'sometimes|integer|min:1']);
        $page = (int) ($validated['page'] ?? 1);
        $rows = $query->paginate(25, ['*'], 'page', $page);

        // A deletion can make the requested last page disappear.
        if ($page > $rows->lastPage()) {
            $rows = $query->paginate(25, ['*'], 'page', $rows->lastPage());
        }

        return $rows;
    }

    public static function metadata(LengthAwarePaginator $rows): array
    {
        return [
            'currentPage' => $rows->currentPage(),
            'lastPage' => $rows->lastPage(),
            'perPage' => $rows->perPage(),
            'total' => $rows->total(),
            'hasNextPage' => $rows->hasMorePages(),
            'hasPreviousPage' => $rows->currentPage() > 1,
        ];
    }
}
