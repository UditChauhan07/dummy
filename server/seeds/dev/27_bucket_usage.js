exports.seed = function (knex) {
    return knex('bucket_usage').del()
        .then(() => {
            return knex('bucket_usage').insert([
                {
                    tenant: '11111111-1111-1111-1111-111111111111',
                    bucket_plan_id: knex('bucket_plans').where({ tenant: '11111111-1111-1111-1111-111111111111', plan_id: knex('billing_plans').where({ tenant: '11111111-1111-1111-1111-111111111111', plan_name: 'Wonderland Basic' }).select('plan_id').first() }).select('bucket_plan_id').first(),
                    company_id: knex('companies').where({ tenant: '11111111-1111-1111-1111-111111111111', company_name: 'Wonderland' }).select('company_id').first(),
                    period_start: knex.raw("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'"),
                    period_end: knex.raw("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'"),
                    hours_used: 35,
                    overage_hours: 0,
                    service_catalog_id: knex('service_catalog').where({ service_name: 'Basic Support' }).select('service_id').first()
                },
                {
                    tenant: '11111111-1111-1111-1111-111111111111',
                    bucket_plan_id: knex('bucket_plans').where({ tenant: '11111111-1111-1111-1111-111111111111', plan_id: knex('billing_plans').where({ tenant: '11111111-1111-1111-1111-111111111111', plan_name: 'Oz Premium' }).select('plan_id').first() }).select('bucket_plan_id').first(),
                    company_id: knex('companies').where({ tenant: '11111111-1111-1111-1111-111111111111', company_name: 'Emerald City' }).select('company_id').first(),
                    period_start: knex.raw("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'"),
                    period_end: knex.raw("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'"),
                    hours_used: 110,
                    overage_hours: 10,
                    service_catalog_id: knex('service_catalog').where({ service_name: 'Premium Support' }).select('service_id').first()
                }
            ]);
        });
};
