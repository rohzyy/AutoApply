-- Default pricing. Operators edit these rows from /admin/pricing; the public pricing page reads them.
insert into public.plans (id, name, tagline, price_monthly, price_yearly, currency, features, limits, highlighted, sort_order, active) values
  ('entry', 'Entry', 'For a focused search in one or two markets.', 19, 180, 'USD',
    array['25 AI-ranked matches per week', 'Eligibility & sponsorship screening', '5 tailored applications per month', 'Application tracker'],
    '{"matchesPerWeek": 25, "tailoredPerMonth": 5, "humanReviewsPerMonth": 0}', false, 1, true),
  ('professional', 'Professional', 'For an active international search with human support.', 49, 468, 'USD',
    array['Unlimited AI-ranked matches', '30 tailored applications per month', '10 human-reviewed applications per month', 'Cover letters and skill-gap plans', 'Sponsorship likelihood insights'],
    '{"matchesPerWeek": null, "tailoredPerMonth": 30, "humanReviewsPerMonth": 10}', true, 2, true),
  ('executive', 'Executive', 'For senior leaders who want a dedicated specialist.', 149, 1428, 'USD',
    array['Everything in Professional', 'Unlimited tailored applications', '40 human-reviewed applications per month', 'Dedicated application specialist', 'Executive positioning review'],
    '{"matchesPerWeek": null, "tailoredPerMonth": null, "humanReviewsPerMonth": 40}', false, 3, true)
on conflict (id) do nothing;
