# frozen_string_literal: true

# == Schema Information
#
# Table name: molecules
#
#  id                     :integer          not null, primary key
#  inchikey               :string
#  inchistring            :string
#  density                :float            default(0.0)
#  molecular_weight       :float
#  molfile                :binary
#  melting_point          :float
#  boiling_point          :float
#  sum_formular           :string
#  names                  :string           default([]), is an Array
#  iupac_name             :string
#  molecule_svg_file      :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  deleted_at             :datetime
#  is_partial             :boolean          default(FALSE), not null
#  exact_molecular_weight :float
#  cano_smiles            :string
#  cas                    :text
#  molfile_version        :string(20)
#
# Indexes
#
#  index_molecules_on_deleted_at                           (deleted_at)
#  index_molecules_on_formula_and_inchikey_and_is_partial  (inchikey,sum_formular,is_partial) UNIQUE
#

# rubocop:disable Metrics/ClassLength

class Molecule < ApplicationRecord
  acts_as_paranoid

  # defer_pubchem_lookup lets a caller creating molecules in bulk suppress this instance's own
  # automatic scheduling, so an import enqueues one job for the whole run
  # (.schedule_pubchem_lookup_since) rather than one per molecule. It's a plain per-object
  # attribute, not shared/ambient state, so it's inherently thread-safe.
  attr_accessor :pcid, :ob_log, :defer_pubchem_lookup

  # How long a confirmed "PubChem has no record for this structure" is trusted before the
  # question is asked again. Long enough that an in-house compound stops costing a lookup on
  # every sweep; short enough that one later published in PubChem is still picked up.
  PUBCHEM_MISS_TTL = 30.days

  include Collectable
  include Taggable

  serialize :cas, Array

  has_many :samples
  has_many :collections, through: :samples
  has_many :molecule_names

  has_many :computed_props

  has_many :nmr_simulations, foreign_key: 'molecule_id', dependent: :destroy

  before_save :sanitize_molfile
  after_create :create_molecule_names
  after_create_commit :schedule_pubchem_lookup, unless: :defer_pubchem_lookup
  skip_callback :save, before: :sanitize_molfile, if: :skip_sanitize_molfile
  before_destroy :deindex_inchikey

  # validates_uniqueness_of :inchikey, scope: :is_partial

  # scope for suggestions
  scope :by_iupac_name, -> (query) {
    where('iupac_name ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_sum_formular, -> (query) {
    where('sum_formular ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_inchistring, -> (query) {
    where('inchistring ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_inchikey, -> (query) {
    where('inchikey ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_cano_smiles, -> (query) {
    where('cano_smiles ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }

  scope :with_reactions, lambda {
    joins(:samples).joins('inner join reactions_samples rs on rs.sample_id = samples.id')
  }

  scope :with_wellplates, lambda {
    joins(:samples).joins('inner join wells w on w.sample_id = samples.id')
  }

  # The placeholder used for decoupled samples. Not a structure, so there is nothing to ask
  # PubChem about — without the deferral its creation enqueues a lookup for the literal string
  # 'DUMMY', which resolves to a 404 and then occupies a miss marker. {#enrichable?} already
  # excluded it on the request path; {PubchemLookupJob#pending_scope} now excludes it on the
  # sweep, for rows created before this.
  def self.find_or_create_dummy
    Molecule.find_or_create_by(inchikey: 'DUMMY') do |mol|
      mol.defer_pubchem_lookup = true
    end
  end

  # @param defer_pubchem_lookup [Boolean] when true, a newly-created molecule's own automatic
  #   PubChem lookup is suppressed instead of firing immediately — the caller is responsible
  #   for triggering it later via .schedule_pubchem_lookup_since once its own batch of creations
  #   is done.
  # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/AbcSize
  def self.find_or_create_by_molfile(molfile, defer_pubchem_lookup: false, **babel_info)
    unless babel_info && babel_info[:inchikey]
      babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
    end
    inchikey = babel_info[:inchikey]
    return if inchikey.blank?

    # Coerced, not passed through: molecules.is_partial is NOT NULL DEFAULT FALSE, and a caller
    # that hands us an inchikey without the rest of babel_info (Import::ImportSamples does, when
    # OpenBabel could not read the molfile but smiles_to_inchikey still resolved a key) leaves
    # this nil. Assigning nil explicitly overrides the column default and raises
    # ActiveRecord::NotNullViolation, which the RecordNotUnique rescue below does not catch —
    # taking the whole import down on the row it was added to protect.
    is_partial = babel_info[:is_partial].present?
    partial_molfile = babel_info[:molfile]
    # NB: if the molfile has a R# group for solid support (is_partial) then
    #   it has been replaced by C befor getting babel_info (which would have added a fictif CH3 group)
    formula = babel_info[:formula]
    formula = SumFormula.new(formula).remove_fragment('CH3').valid.to_s if is_partial
    molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial, sum_formular: formula)
    if molecule.nil?
      begin
        # requires_new: true so the losing INSERT rolls back to a savepoint rather than
        # poisoning an enclosing transaction. Most callers run inside one — Sample's
        # before_save :find_or_create_molecule, Import::ImportSamples#write_to_db,
        # Import::ImportCollections#import — and without the savepoint a real
        # PG::UniqueViolation aborts that outer transaction, so the rescue's re-find below
        # would itself raise PG::InFailedSqlTransaction and take the whole import with it.
        #
        # PubChem enrichment (iupac_name/names/cid) is deferred to the async enrich job
        # (see .schedule_pubchem_lookup_for / .schedule_pubchem_lookup_since / PubchemLookupJob) so no
        # network call sits in the create/transaction critical section; create with
        # babel-only data here. svg_molfile is still passed explicitly as the original
        # (pre-partial-substitution) molfile so is_partial SVGs render from the R-group
        # molfile rather than mol.molfile's CH3-substituted partial_molfile.
        molecule = ActiveRecord::Base.transaction(requires_new: true) do
          Molecule.create(inchikey: inchikey, is_partial: is_partial, sum_formular: formula) do |mol|
            mol.defer_pubchem_lookup = true if defer_pubchem_lookup
            mol.molfile = (is_partial && partial_molfile) || molfile
            mol.assign_molecule_data(babel_info, {}, molfile)
          end
        end
      rescue ActiveRecord::RecordNotUnique
        # A concurrent worker created the same molecule between our find_by and insert; re-find
        # its row instead of letting PG::UniqueViolation abort the whole import
        # (index_molecules_on_formula_and_inchikey_and_is_partial). Nothing to schedule from
        # this losing call: the winning create's own after_create_commit hook (or the
        # caller's schedule_pubchem_lookup_since flush, when defer_pubchem_lookup is set) already covers
        # enrichment/LCSS for this row regardless of which concurrent call created it.
        molecule = Molecule.find_by(inchikey: inchikey, is_partial: is_partial, sum_formular: formula)
        raise if molecule.nil?
      end
    end
    molecule.ob_log = babel_info[:ob_log]
    molecule
  end
  # rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity, Metrics/AbcSize

  def self.find_or_create_by_cano_smiles(cano_smiles, defer_pubchem_lookup: false)
    molfile = Chemotion::OpenBabelService.molfile_from_cano_smiles(cano_smiles)
    Molecule.find_or_create_by_molfile(molfile, defer_pubchem_lookup: defer_pubchem_lookup)
  end

  def self.find_or_create_by_molfiles(molfiles_array)
    babel_info_array = Chemotion::OpenBabelService.molecule_info_from_molfiles(molfiles_array)
    babel_info_array.map.with_index do |babel_info, i|
      if babel_info && babel_info[:inchikey]
        Molecule.find_or_create_by_molfile(molfiles_array[i], babel_info)
      else
        nil
      end
    end
  end

  def refresh_molecule_data
    babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(self.molfile)
    # this is to not refresh is_partial, because the info has already been removed from the molfile
    babel_info[:is_partial] = self.is_partial
    inchikey = babel_info[:inchikey]

    return unless inchikey.present?
    pubchem_info = Chemotion::PubchemService.molecule_info_from_inchikey(inchikey)
    self.assign_molecule_data babel_info, pubchem_info
    self.save!
  end

  def assign_molecule_data(babel_info, pubchem_info = {}, svg_molfile = nil)
    self.inchistring = babel_info[:inchi]
    self.sum_formular = babel_info[:formula]
    self.molecular_weight = babel_info[:mol_wt]
    self.exact_molecular_weight = babel_info[:mass]
    assign_pubchem_data(pubchem_info)
    check_sum_formular
    svg = Molecule.svg_reprocess(babel_info[:svg], svg_molfile || molfile)
    attach_svg svg
    self.cano_smiles = babel_info[:cano_smiles]
    self.molfile_version = babel_info[:molfile_version]
    # NOT NULL column; babel_info may not carry the key at all (see .find_or_create_by_molfile).
    self.is_partial = babel_info[:is_partial].present?
  end

  def pubchem_lcss
    return unless cid.present?
    # if pubchem_lcss of taggable does not exist, try PubChem API and then update DB and return
    mol_tag = self.tag
    mol_tag_data = mol_tag.taggable_data || {}

    # nil means "not asked yet"; a stored false means "asked, PubChem has none" and must not
    # trigger another fetch — which a truthiness check would.
    if mol_tag_data['pubchem_lcss'].nil?
      lcss = Chemotion::PubchemService.lcss_from_cid(cid)
      # `false`, not nil, when PubChem has no GHS data for this cid. A nil is stored as JSON
      # null, and `taggable_data->>'pubchem_lcss' is null` matches that exactly like a missing
      # key — so the molecule never left either job's pending scope and was re-fetched on every
      # sweep, forever. `false` reads back as the string 'false' and clears the scope.
      mol_tag_data['pubchem_lcss'] = lcss || false
      # updated_at of element_tags(not molecule) is updated
      mol_tag.update taggable_data: mol_tag_data
    end

    mol_tag_data['pubchem_lcss']
  end

  # Idempotently persists PubChem-derived names/cid onto this molecule. Shared by every path
  # that enriches — {PubchemLookupJob}'s targeted runs and its periodic sweep, and the inline
  # attempt on the molecule endpoints — so the write semantics are identical whichever runs.
  # Repeated calls
  # are safe: +iupac_name+ is only set when blank, molecule names are found-or-created, and an
  # existing +pubchem_cid+ is never overwritten with nil. The +pubchem_cid+ write is atomic
  # (see {#merge_pubchem_cid!}); other writers still replace the full +taggable_data+ hash,
  # though, so the reverse — them clobbering this key — isn't ruled out without touching
  # {Taggable#update_tag} too.
  #
  # Every write here goes through +update_columns+ or +update_all+, so none of them bumps
  # +updated_at+ on +molecules+, +element_tags+ or +samples+. Anything keyed on that timestamp —
  # a cache, a sync cursor, list ordering — will not see enrichment land.
  #
  # @param info [Hash] +{ cid:, iupac_name:, names: }+ as returned by
  #   {Chemotion::PubchemService.molecule_info_from_inchikey}
  # @return [void]
  def assign_pubchem_names_and_cid!(info)
    return unless pubchem_info?(info)

    written_columns = assign_pubchem_columns!(info)
    merge_pubchem_cid!(info[:cid]) if info[:cid].present?

    Array(info[:names]).each do |name|
      MoleculeName.find_or_create_by(molecule_id: id, name: name, description: 'iupac_name')
    end

    repoint_samples_to_iupac_name!
    # Gated, because the rebuild is the expensive part of this method — one document load and
    # re-save per sample, each re-querying molecule. Of everything written above, only
    # iupac_name is read by a Sample multisearchable field, so only it can stale a search
    # document: names is not indexed, the cid is not indexed, and the re-point moves
    # molecule_name_id, which no indexed field reads. Ungated, a cid-only response or a
    # re-enrichment of an already-named molecule swept every sample for nothing — and the
    # latter is routine, since pending_scope selects on pubchem_lcss, so molecules that
    # already have their names are in the sweep by design.
    refresh_samples_search_documents! if written_columns.key?(:iupac_name)
  end

  # Fetches PubChem data for this molecule's inchikey and persists it via
  # {#assign_pubchem_names_and_cid!}. Performs a network call.
  #
  # Background jobs call it unbounded. A request path may pass a low +timeout+ to attempt
  # enrichment inline without holding the user up: a miss writes nothing (PubChem's client
  # rescues the timeout and returns nil, and every write below is guarded on presence), and the
  # PubchemLookupJob that Molecule's +after_create_commit :schedule_pubchem_lookup+ already queued does the work
  # instead. It must still never be called from inside a transaction — that is what C2 moved off
  # the create/import path.
  #
  # @param timeout [Numeric, nil] per-phase HTTP bound in seconds; nil uses PubChem's default
  # @return [void]
  def enrich_from_pubchem(timeout: nil)
    return if inchikey.blank?

    info, outcome = Chemotion::PubchemService.molecule_info_and_outcome_from_inchikey(
      inchikey, timeout: timeout
    )
    assign_pubchem_names_and_cid!(info)
    record_pubchem_miss! if pubchem_answered_with_nothing?(info, outcome)
  end

  # Mirrors {PubchemLookupJob#pending_scope}: the same molecule must be judged worth a lookup
  # by both paths, or the request path pays latency for a question the sweep would never ask.
  # Excluded, in order: the +DUMMY+ placeholder, whose inchikey is not blank and would
  # otherwise be sent to PubChem as a literal lookup; partial (R-group) molecules and
  # synthetic +POLYMER_*+ keys, which describe a fragment PubChem has nothing to say about;
  # molecules with no +element_tags+ row, which the writers below cannot record against;
  # and anything already carrying a cid or a recent miss.
  #
  # The +pubchem_checked_at+ check is what makes this safe to run on every request rather than
  # only on a freshly created molecule. PubChem holds no record for in-house compounds, so
  # nothing is ever written for them and +pubchem_check+ stays false — without the marker, every
  # later save of the same structure fired another blocking lookup, outside the rate-limit guard,
  # for a question already answered.
  #
  # @return [Boolean] whether an inline enrichment attempt is worth its latency
  def enrichable?
    return false if inchikey.blank? || inchikey == 'DUMMY'
    return false if is_partial?
    return false if tag.nil?
    return false if pubchem_check

    !pubchem_checked_recently?
  end

  # @return [Boolean] whether PubChem was asked about this structure within {PUBCHEM_MISS_TTL}
  #   and had nothing
  def pubchem_checked_recently?
    checked_at = tag&.taggable_data&.dig('pubchem_checked_at')
    return false if checked_at.blank?

    # Time.zone.parse returns nil for most unparseable input and raises for some; either way a
    # stamp we cannot read means "treat as never asked" rather than blocking enrichment forever.
    parsed = Time.zone.parse(checked_at.to_s)
    return false if parsed.nil?

    parsed > PUBCHEM_MISS_TTL.ago
  rescue ArgumentError
    false
  end

  def chem_repo
    { id: self.tag&.taggable_data&.fetch('chemrepo_id', nil) }
  end

  def attach_svg(svg_data)
    svg_data = svg_data.to_s if svg_data.is_a?(Nokogiri::XML::Document)
    return unless svg_data =~ /\A\s*<\?xml/

    svg_file_name = if is_partial
                      "#{SecureRandom.hex(64)}Part.svg"
                    else
                      "#{SecureRandom.hex(64)}.svg"
                    end
    # NB: successiv gsub seems to be faster than a single gsub with a regexp with multiple matches
    File.write(
      full_svg_path(svg_file_name),
      Chemotion::Sanitizer.scrub_svg(svg_data, encoding: 'UTF-8', remap_glyph_ids: true),
    )

    self.molecule_svg_file = svg_file_name
  end

  # remove additional H in formula and in molecular_weight
  def check_sum_formular
    return unless self.is_partial

    atomic_weight_h = Chemotion::PeriodicTable.get_atomic_weight('H') * 3
    self.molecular_weight -= atomic_weight_h # remove CH3
    self.exact_molecular_weight -= atomic_weight_h # remove CH3

    atomic_weight_c = Chemotion::PeriodicTable.get_atomic_weight 'C'
    self.molecular_weight -= atomic_weight_c # remove CH3
    self.exact_molecular_weight -= atomic_weight_c # remove CH3
    self.sum_formular = SumFormula.new(sum_formular).remove_fragment('CH3').valid.to_s
  end

  def load_cas
    return if inchikey.blank?

    self.cas = PubChem.get_cas_from_cid(cid)
    save
  end

  def create_molecule_names
    return if inchikey == 'DUMMY'

    if names.present?
      names.each do |nm|
        molecule_names.create(name: nm, description: 'iupac_name')
      end
    end
    molecule_names.create(name: sum_formular, description: 'sum_formular')
  end

  # Schedules a single PubchemLookupJob for the given ids, re-querying first so only molecules
  # that actually still exist get scheduled — a caller's own transaction rolling back after
  # collecting ids shouldn't schedule a job for rows that never persisted.
  #
  # Note the job is enrichment-first: it resolves the PubChem cid and only then fetches LCSS,
  # which is why this and its siblings are named for the lookup rather than for LCSS.
  def self.schedule_pubchem_lookup_for(molecule_ids)
    return if molecule_ids.blank?

    existing_ids = Molecule.where(id: molecule_ids).pluck(:id)
    return if existing_ids.blank?

    PubchemLookupJob.perform_later(existing_ids)
  end

  def schedule_pubchem_lookup
    self.class.schedule_pubchem_lookup_for([id])
  end

  # Schedules a PubchemLookupJob covering every molecule created after +timestamp+.
  # The bulk importers use this instead of collecting new molecule ids into an array:
  # capture Time.current once before the import loop begins, pass defer_pubchem_lookup: true to
  # suppress each new molecule's own immediate scheduling, then call this once at the
  # end (even a method that turned out to create nothing new can safely call this
  # unconditionally — the existence check below keeps that a no-op).
  def self.schedule_pubchem_lookup_since(timestamp)
    return if timestamp.blank?
    return unless Molecule.exists?(['created_at > ?', timestamp])

    PubchemLookupJob.perform_later(nil, created_after: timestamp)
  end

  def create_molecule_name_by_user(new_names, user_id)
    new_names.split(';').each do |new_name|
      next unless unique_molecule_name(new_name)

      molecule_names
        .create(name: new_name, description: "defined by user #{user_id}")
    end
  end

  def unique_molecule_name(new_name)
    mns = molecule_names.map(&:name)
    mns.exclude?(new_name)
  end

  def self.svg_reprocess(svg, struct, service: nil)
    return svg if svg_valid_and_not_openbabel?(svg)

    Chemotion::SvgRenderer.render_svg_from_molfile(struct, service: service)
  end

  def self.svg_valid_and_not_openbabel?(svg)
    svg.present? && svg.exclude?('Open Babel')
  end

  # return the full path of the svg file if it exsits or nil.
  def current_svg_full_path
    file_path = full_svg_path
    file_path&.file? ? file_path : nil
  end

  private

  # Fills the two PubChem-derived columns, each only while still blank so a later call cannot
  # clobber what an earlier one stored.
  #
  # +names+ is otherwise written only at create time, where deferred enrichment supplies +{}+ —
  # so it stayed empty for good, and ChemicalAPI's "Common Name" safety-datasheet lookup
  # (+molecule.names[0]+) had nothing to pass to the vendor service.
  #
  # @param info [Hash] as returned by {Chemotion::PubchemService.molecule_info_from_inchikey}
  # @return [void]
  # rubocop:disable Rails/SkipsModelValidations
  # Whether a PubChem response carried anything worth persisting.
  #
  # A +.blank?+ test on +info+ itself never fires: {Chemotion::PubchemService.interpret_record}
  # returns a fully-keyed hash of nils for an empty, faulted or unparseable response, so the
  # hash is truthy and non-empty even when PubChem said nothing. Only its contents distinguish
  # a real record from a miss — and without this, every miss still ran the sample repoint and a
  # full per-sample pg_search rebuild to write nothing.
  #
  # @param info [Hash, nil] as returned by {Chemotion::PubchemService.interpret_record}
  # @return [Boolean]
  def pubchem_info?(info)
    return false if info.blank?

    info[:cid].present? || info[:iupac_name].present? || Array(info[:names]).any?
  end

  # Whether PubChem gave us an answer and that answer was "no record", which is the only
  # outcome safe to remember via {#record_pubchem_miss!}.
  #
  # +:not_found+ is the explicit form. +:ok+ with nothing usable is the implicit one — a 200
  # carrying a +Fault+ body, or a record with no cid — and it has to count too, or such a
  # molecule never leaves {PubchemLookupJob}'s pending scope and costs a round trip on every
  # sweep forever. +:unavailable+ means we never got an answer; remembering that would strand
  # the molecule unenriched for good.
  #
  # @return [Boolean]
  def pubchem_answered_with_nothing?(info, outcome)
    return false unless %i[ok not_found].include?(outcome)

    !pubchem_info?(info)
  end

  # @return [Hash] the columns actually written, empty when nothing changed. The caller needs
  #   this to decide about the sample search-document rebuild — +iupac_name+ is the only column
  #   written here that a Sample multisearchable field reads
  #   (+Sample#molecule_iupac_name+); +names+ is not indexed.
  def assign_pubchem_columns!(info)
    changes = {}
    changes[:iupac_name] = info[:iupac_name] if iupac_name.blank? && info[:iupac_name].present?
    changes[:names] = Array(info[:names]) if names.blank? && info[:names].present?
    return changes if changes.empty?

    # One statement rather than two — a 1000-molecule {PubchemLookupJob} chunk would otherwise
    # issue an extra UPDATE per molecule for nothing.
    update_columns(changes)
    changes
  end
  # rubocop:enable Rails/SkipsModelValidations

  # Writes +pubchem_cid+ as an atomic JSONB merge rather than a read/modify/write of the whole
  # +taggable_data+ hash, so it can't clobber an unrelated key (+user_labels+, +chemrepo_id+)
  # written concurrently by another path.
  #
  # +update_all+ on a single-row scope looks odd, and it is not about updating many rows: it is
  # the only ActiveRecord write that puts a raw SQL *expression* on the right-hand side of the
  # SET. +update!+ / +update_columns+ take a Ruby value, which means building the new hash in
  # Ruby from a +taggable_data+ read earlier in the request — and any key another writer added
  # in between is silently dropped on write. Here the +||+ merge is evaluated by Postgres
  # against the row's current value, in the same statement, so only this one key is touched.
  # Same reason ChemrepoIdJob reaches for +jsonb_set+ through +update_all+.
  #
  # It does mean bypassing callbacks and +updated_at+ — see the caveat on
  # {#assign_pubchem_names_and_cid!}.
  #
  # @param cid [String, Integer] the PubChem compound id
  # @return [void]
  # rubocop:disable Rails/SkipsModelValidations
  def merge_pubchem_cid!(cid)
    et = tag
    return if et.nil?

    ElementTag.where(id: et.id).update_all(
      ["taggable_data = COALESCE(taggable_data, '{}'::jsonb) || jsonb_build_object('pubchem_cid', ?::jsonb)",
       cid.to_json],
    )
    # Mirror the merge onto the already-loaded association in memory (update_all bypasses it)
    # so an immediate caller-side read — e.g. PubchemLookupJob#enrich_and_fetch_lcss checking
    # pubchem_check right after this returns — sees the cid without a reload.
    et.taggable_data = (et.taggable_data || {}).merge('pubchem_cid' => cid)
  end
  # rubocop:enable Rails/SkipsModelValidations

  # Records that PubChem was asked about this structure and had nothing.
  #
  # Without it an in-house compound — the normal case in a synthesis lab — is asked about
  # forever: nothing is written, so the molecule never leaves either job's pending scope, and
  # the inline attempt, the per-molecule job and the CID sweep each ask again, on every rotation,
  # indefinitely.
  #
  # A timestamp rather than a permanent flag, because PubChem does add compounds. A structure
  # that is unknown today may be published later, so {PUBCHEM_MISS_TTL} bounds how long the
  # answer is trusted; after that it is asked again.
  #
  # Written with the same atomic JSONB merge as the cid, for the same reason — see
  # {#merge_pubchem_cid!}.
  #
  # @return [void]
  # rubocop:disable Rails/SkipsModelValidations
  def record_pubchem_miss!
    et = tag
    return if et.nil?

    now = Time.current
    ElementTag.where(id: et.id).update_all(
      ["taggable_data = COALESCE(taggable_data, '{}'::jsonb) || jsonb_build_object('pubchem_checked_at', ?::jsonb)",
       now.iso8601.to_json],
    )
    et.taggable_data = (et.taggable_data || {}).merge('pubchem_checked_at' => now.iso8601)
  end
  # rubocop:enable Rails/SkipsModelValidations

  # Moves samples off the sum-formula placeholder now that the real IUPAC name has arrived.
  #
  # Sample's before_create :check_molecule_name resolves
  # +molecule_iupac_name || molecule_sum_formular+. With enrichment deferred, iupac_name is
  # still nil at that moment, so every sample of a freshly created molecule binds to the
  # sum-formula MoleculeName — and nothing re-evaluates it afterwards, because
  # #update_molecule_name only fires when molecule_id itself changes. Without this the
  # sample would show and export as +H2O+ rather than +oxidane+ forever.
  #
  # Only samples still on that default binding are moved; one the user picked explicitly
  # (sample_api's molecule_name_id, /save_name, #create_molecule_name_by_user) is left alone.
  # update_all deliberately skips Sample's before_save chain — SVG regeneration, fingerprints,
  # elemental composition. It does *not* skip the +logidze_on_samples+ BEFORE UPDATE trigger,
  # which is a database object and fires regardless, so each re-pointed row does gain a
  # logidze version.
  #
  # @return [void]
  # rubocop:disable Rails/SkipsModelValidations
  def repoint_samples_to_iupac_name!
    return if iupac_name.blank?

    # PubChem's iupac_name is not guaranteed to appear in info[:names], so the row may not
    # exist yet: find_or_create rather than assume #create_molecule_names made one.
    iupac_row = molecule_names.find_or_create_by(name: iupac_name, description: 'iupac_name')
    # find_or_create_by returns an *unsaved* record when MoleculeName's SAFE_NAME_REGEX rejects
    # the name (PubChem does return names carrying zero-width and bidi characters). Its id is
    # nil, which would pass the sum_row comparison below and then unbind every sample of this
    # molecule — belongs_to :molecule_name is optional, so nothing would raise.
    return unless iupac_row&.persisted?

    sum_row = molecule_names.find_by(description: 'sum_formular')
    return if sum_row.nil? || iupac_row.id == sum_row.id

    Sample.where(molecule_id: id, molecule_name_id: sum_row.id)
          .update_all(molecule_name_id: iupac_row.id)
  end
  # rubocop:enable Rails/SkipsModelValidations

  # Rebuilds the pg_search document for every sample of this molecule.
  #
  # Sample is +multisearchable against: [… molecule_iupac_name …]+, and that document is built
  # from an +after_save+ callback. With enrichment deferred, +iupac_name+ is still nil when a
  # sample is saved, and none of the writes above go through Sample#save — so without this the
  # document keeps the pre-enrichment text and the sample is not findable by its IUPAC name in
  # global search, permanently, until someone happens to edit it. Before this PR the synchronous
  # lookup meant the name was already there when the callback ran.
  #
  # @return [void]
  def refresh_samples_search_documents!
    samples.find_each(&:update_pg_search_document)
  end

  def assign_pubchem_data(pubchem_info)
    self.iupac_name = pubchem_info[:iupac_name]
    # Array(...) rather than a bare assignment: with enrichment deferred, pubchem_info is {}
    # on the create path, and assigning nil sends an explicit NULL that bypasses the column's
    # default([]). Readers index into it without a nil guard (e.g. ChemicalAPI's
    # +molecule.names[0]+ when fetching a safety datasheet by common name).
    self.names = Array(pubchem_info[:names])
    self.pcid = pubchem_info[:cid]
  end

  # This frees the inchikey value from the index
  def deindex_inchikey
    return if inchikey.starts_with?("#{id}_")

    update_columns(inchikey: "#{id}_#{inchikey}") # rubocop:disable Rails/SkipsModelValidations
  end

  # TODO: check that molecules are OK and remove this method. fix is in editor
  def sanitize_molfile
    if self.molfile =~ /^(M +END$)/
      self.molfile = $` + $1
    end
  end

  # @return [Integer, nil] the PubChem compound id recorded on this molecule's tag
  #
  # No network fallback. It used to end +|| PubChem.get_cid_from_inchikey(inchikey)+, which was
  # unreachable — {PubchemLookupJob} gates the LCSS half on +pubchem_check+, so a caller of
  # {#pubchem_lcss} already has a tag cid — and useless when it did fire: that call returned the
  # response body as a String, and {PubChem.get_lcss_from_cid} rejects anything that isn't an
  # Integer. So it spent a PubChem round trip to produce a value guaranteed to be discarded. The
  # method itself has since been removed. A model reader making a synchronous PubChem call is
  # also exactly what the async enrichment work removed elsewhere.
  def cid
    tag.taggable_data['pubchem_cid']
  end

  # build the full path of the molecule svg, return nil if the path can't be built.
  def full_svg_path(svg_file_name = molecule_svg_file)
    return unless svg_file_name.present?

    Rails.public_path.join('images', 'molecules', svg_file_name)
  end
end
# rubocop:enable Metrics/ClassLength
