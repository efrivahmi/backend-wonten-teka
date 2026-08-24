<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global scope that automatically filters queries by the authenticated user's company_id.
 * Applied via the BelongsToCompany trait on all tenant-scoped models.
 */
class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (Auth::hasUser() && Auth::user()->company_id && !Auth::user()->is_super_admin) {
            $builder->where($model->getTable() . '.company_id', Auth::user()->company_id);
        }
    }
}
