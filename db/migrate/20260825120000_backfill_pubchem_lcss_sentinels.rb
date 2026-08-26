# frozen_string_literal: true

class BackfillPubchemLcssSentinels < ActiveRecord::Migration[6.1]
  # Repairs the two bad shapes of `element_tags.taggable_data->'pubchem_lcss'` that the PubChem
  # client fix shipping alongside this migration stops producing. Neither shape self-heals, so the
  # code fix alone leaves the existing rows broken.
  #
  # 1. A JSON null. Molecule#pubchem_lcss stored the client's nil verbatim, and
  #    `taggable_data->>'pubchem_lcss' is null` -- the predicate PubchemLookupJob#pending_scope
  #    selects on -- matches a JSON null exactly as it matches a missing key. So the molecule never
  #    left the pending scope and was re-asked on every sweep, indefinitely. The convention the code
  #    uses now is `false`, meaning "asked, PubChem has none": it reads back through `->>` as the
  #    string 'false' and clears the scope. Rewriting these needs no network call, because the
  #    answer is already known.
  #
  # 2. A Fault body stored as GHS data. PubChem answers an unknown cid on the pug_view endpoint with
  #    HTTP 200 and a `{"Fault": ...}` body, and get_lcss_from_cid stored that body as if it were a
  #    classification. It is truthy, so these molecules were never in the pending scope and the
  #    Fault was being handed to the UI as safety data. The key is deleted rather than set to
  #    `false`: most of these are PUGVIEW.NotFound and will settle to `false` on the next sweep, but
  #    a Fault can also be transient (a busy server), and those deserve a real answer rather than a
  #    permanent "no". Re-asking is bounded by the pubchem_checked_at TTL pending_scope already
  #    applies, so this does not put the whole set back into every sweep.
  #
  # Both statements are idempotent: a second run matches nothing, because neither `false` nor an
  # absent key satisfies its WHERE. jsonb_typeof is used instead of the `?` containment operator so
  # the SQL carries no character the adapter could read as a bind placeholder; a missing key yields
  # SQL NULL from `->`, whose jsonb_typeof is NULL rather than the string 'null', so a molecule that
  # was never asked is untouched.

  def up
    say_with_time 'rewriting JSON-null pubchem_lcss values to false' do
      execute(<<~SQL.squish)
        UPDATE element_tags
        SET taggable_data = jsonb_set(taggable_data, '{pubchem_lcss}', 'false'::jsonb),
            updated_at = now()
        WHERE taggable_type = 'Molecule'
          AND jsonb_typeof(taggable_data->'pubchem_lcss') = 'null'
      SQL
    end

    say_with_time 'clearing PubChem Fault bodies stored as pubchem_lcss' do
      execute(<<~SQL.squish)
        UPDATE element_tags
        SET taggable_data = taggable_data - 'pubchem_lcss',
            updated_at = now()
        WHERE taggable_type = 'Molecule'
          AND jsonb_typeof(taggable_data->'pubchem_lcss') = 'object'
          AND (taggable_data->'pubchem_lcss')->>'Fault' IS NOT NULL
      SQL
    end
  end

  def down
    # Irreversible. A `false` written here is indistinguishable from one written by the application,
    # and the deleted Fault bodies were never valid data to restore.
    say 'BackfillPubchemLcssSentinels is not reversible (the previous values were not valid data).'
  end
end
