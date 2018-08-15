select lits.* , literatures.title, literatures.doi, literatures.url, literatures.refs
, coalesce(reactions.short_label, samples.short_label ) as short_label
, coalesce(reactions.name, samples.name ) as name, samples.external_label
, coalesce(reactions.updated_at, samples.updated_at) as element_updated_at
from (
  select literals.element_type, literals.element_id, literals.literature_id, literals.category, count(*)
  from literals
  group by literals.element_type, literals.element_id, literals.literature_id, literals.category
) as lits
inner join literatures on lits.literature_id = literatures.id
left join samples on lits.element_type = 'Sample' and lits.element_id = samples.id
left join reactions on lits.element_type = 'Reaction' and lits.element_id = reactions.id;
