class Sample < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable
  include ElementCodes
  include AnalysisCodes
  has_many :analyses_experiments

  multisearchable against: [
    :name, :short_label, :external_label, :molecule_sum_formular,
    :molecule_iupac_name, :molecule_inchistring, :molecule_cano_smiles
  ]

  # search scopes for exact matching
  pg_search_scope :search_by_sum_formula, associated_against: {
    molecule: :sum_formular
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecule: :iupac_name
  }

  pg_search_scope :search_by_inchistring, associated_against: {
    molecule: :inchistring
  }

  pg_search_scope :search_by_cano_smiles, associated_against: {
    molecule: :cano_smiles
  }

  pg_search_scope :search_by_sample_name, against: :name
  pg_search_scope :search_by_sample_short_label, against: :short_label
  pg_search_scope :search_by_sample_external_label, against: :external_label

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
  scope :by_short_label, ->(query) { where('short_label ILIKE ?',"%#{query}%") }
  scope :by_external_label, ->(query) { where('external_label ILIKE ?',"%#{query}%") }
  scope :with_reactions, -> {
    sample_ids = ReactionsProductSample.pluck(:sample_id) + ReactionsReactantSample.pluck(:sample_id) + ReactionsStartingMaterialSample.pluck(:sample_id)
    where(id: sample_ids)
  }
  scope :with_wellplates, -> {
    sample_ids = Wellplate.all.flat_map(&:samples).map(&:id)
    where(id: sample_ids)
  }
  scope :by_wellplate_ids,         ->(ids) { joins(:wellplates).where('wellplates.id in (?)', ids) }
  scope :by_reaction_reactant_ids, ->(ids) { joins(:reactions_as_reactant).where('reactions.id in (?)', ids) }
  scope :by_reaction_product_ids,  ->(ids) { joins(:reactions_as_product).where('reactions.id in (?)', ids) }
  scope :by_reaction_material_ids, ->(ids) { joins(:reactions_as_starting_material).where('reactions.id in (?)', ids) }
  scope :by_reaction_solvent_ids,  ->(ids) { joins(:reactions_as_solvent).where('reactions.id in (?)', ids) }
  scope :not_reactant, -> { where('samples.id NOT IN (SELECT DISTINCT(sample_id) FROM reactions_reactant_samples)') }
  scope :not_solvents, -> { where('samples.id NOT IN (SELECT DISTINCT(sample_id) FROM reactions_solvent_samples)') }

  scope :search_by_fingerprint, -> (molfile, userid, collection_id,
                                    type, threshold = 0.01) {
    fp_vector =
      Chemotion::OpenBabelService.fingerprint_from_molfile(molfile)

    if (type == 'similar')
      threshold = threshold.to_f
      fp_ids = Fingerprint.search_similar(fp_vector, threshold)
      scope = where(:fingerprint_id => fp_ids)
      scope = scope.order("position(fingerprint_id::text in '#{fp_ids.join(',')}')")
    else # substructure search
      fp_ids = Fingerprint.screen_sub(fp_vector)
      list_molfile = Sample.where(:fingerprint_id => fp_ids)
                           .for_user(userid)
                           .by_collection_id(collection_id.to_i)

      smarts_query = Chemotion::OpenBabelService.get_smiles_from_molfile(molfile)

      sample_ids = []
      list_molfile.each do |sample|
        if Chemotion::OpenBabelService.substructure_match(smarts_query, sample.molfile)
          sample_ids << sample.id
        end

      end
      scope = Sample.where(:id => sample_ids)
    end
    return scope
  }


  has_many :collections_samples, inverse_of: :sample, dependent: :destroy
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactions_solvent_samples, dependent: :destroy
  has_many :reactions_product_samples, dependent: :destroy

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_solvent, through: :reactions_solvent_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  has_many :devices_samples

  belongs_to :molecule
  belongs_to :fingerprints
  belongs_to :user

  has_one :well, dependent: :destroy
  has_many :wellplates, through: :well
  has_many :residues
  has_many :elemental_compositions

  has_many :sync_collections_users, through: :collections
  composed_of :amount, mapping: %w(amount_value, amount_unit)

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey
  before_save :check_molfile_polymer_section

  has_ancestry

  validates :purity, :numericality => { :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :allow_nil => true }
  validate :has_collections

  accepts_nested_attributes_for :molecule, update_only: true
  accepts_nested_attributes_for :residues, :elemental_compositions,
                                allow_destroy: true
  accepts_nested_attributes_for :collections_samples

  belongs_to :creator, foreign_key: :created_by, class_name: 'User'
  validates :creator, presence: true

  before_save :attach_svg, :init_elemental_compositions,
              :set_loading_from_ea

  before_save :auto_set_short_label, on: :create

  after_save :update_data_for_reactions
  before_create :check_short_label
  after_create :update_counter

  def molecule_sum_formular
    if self.molecule
      self.molecule.sum_formular
    else
      ""
    end
  end

  def molecule_iupac_name
    if self.molecule
      self.molecule.iupac_name
    else
      ""
    end
  end

  def molecule_inchistring
    if self.molecule
      self.molecule.inchistring
    else
      ""
    end
  end

  def molecule_cano_smiles
    if self.molecule
      self.molecule.cano_smiles
    else
      ""
    end
  end

  def self.associated_by_user_id_and_reaction_ids(user_id, reaction_ids)
    (for_user(user_id).by_reaction_material_ids(reaction_ids) + for_user(user_id).by_reaction_reactant_ids(reaction_ids) + for_user(user_id).by_reaction_product_ids(reaction_ids)).uniq
  end

  def self.associated_by_user_id_and_wellplate_ids(user_id, wellplate_ids)
    for_user(user_id).by_wellplate_ids(wellplate_ids)
  end

  def create_subsample user, collection_id, copy_ea = false
    subsample = self.dup

    if self.name.to_s != ''
      subsample.name = self.name
    end
    if self.external_label.to_s != ''
      subsample.external_label = self.external_label
    end

    children_count = self.children.count
    subsample.short_label = self.short_label + "-" + (children_count + 1).to_s

    subsample.parent = self
    subsample.created_by = user.id
    subsample.residues_attributes = self.residues.to_a.map do |r|
      result = r.attributes.to_h
      result.delete 'id'
      result.delete 'sample_id'
      result
    end

    if copy_ea
      subsample.elemental_compositions_attributes = self.elemental_compositions.map do |ea|
        result = ea.attributes.to_h
        result.delete 'id'
        result.delete 'sample_id'
        result
      end
    end

    subsample.collections << Collection.find(collection_id)

    subsample.save!

    subsample
  end

  def auto_set_short_label
    return if (self.short_label == 'reactant' || self.short_label == 'solvent')

    self.short_label = nil if self.short_label == 'NEW SAMPLE'

    if parent
      self.short_label ||= "#{parent.short_label}-#{parent.children.count.to_i + 1}"
    elsif creator && creator.counters['samples']
      self.short_label ||= "#{creator.initials}-#{creator.counters['samples'].succ}"
    elsif
      self.short_label ||= 'NEW'
    end
  end

  def reactions
    reactions_as_starting_material + reactions_as_reactant + reactions_as_solvent + reactions_as_product
  end

  #todo: find_or_create_molecule_based_on_inchikey
  def auto_set_molfile_to_molecules_molfile
    if molecule && molecule.molfile
      self.molfile ||= molecule.molfile
    end
  end

  def find_or_create_molecule_based_on_inchikey
    if molfile
      if molfile.include? ' R# '
        self.molecule = Molecule.find_or_create_by_molfile(molfile.clone, true)
      else
        babel_info = Chemotion::OpenBabelService.molecule_info_from_molfile(molfile)
        inchikey = babel_info[:inchikey]
        unless inchikey.blank?
          unless molecule && molecule.inchikey == inchikey
            self.molecule = Molecule.find_or_create_by_molfile(molfile)
          end
        end
      end
    end
  end

  def get_svg_path
    if self.sample_svg_file.present?
      "/images/samples/#{self.sample_svg_file}"
    else
      "/images/molecules/#{self.molecule.molecule_svg_file}"
    end
  end

  def loading
    self.residues[0] && self.residues[0].custom_info['loading'].to_f
  end

  def attach_svg
    svg = self.sample_svg_file
    return unless svg.present?
    svg_file_name = "#{SecureRandom.hex(64)}.svg"
    if svg.match /TMPFILE[0-9a-f]{64}.svg/
      svg_path = "#{Rails.root}/public/images/samples/#{svg}"
      FileUtils.mv(svg_path, svg_path.gsub(/(TMPFILE\S+)/, svg_file_name))

      self.sample_svg_file = svg_file_name
    elsif svg.match /\A<\?xml/
      svg_path = "#{Rails.root}/public/images/samples/#{svg_file_name}"

      svg_file = File.new(svg_path, 'w+')
      svg_file.write(svg)
      svg_file.close

      self.sample_svg_file = svg_file_name
    end
  end

  def init_elemental_compositions
    residue = self.residues[0]
    return unless m_formula = (self.molecule && self.molecule.sum_formular)

    if residue.present? && self.molfile.include?(' R# ')# case when residue will be deleted
      p_formula = residue.custom_info['formula']
      p_loading = residue.custom_info['loading'].try(:to_d)

      if loading_full = residue.custom_info['loading_full_conv']
        d = Chemotion::Calculations
                       .get_composition(m_formula, p_formula, loading_full.to_f)
        set_elem_composition_data 'full_conv', d, loading_full
      end

      if p_formula.present?
        d = Chemotion::Calculations
                 .get_composition(m_formula, p_formula, (p_loading || 0.0))

        # if it is reaction product then loading has been calculated
        l_type = if residue['custom_info']['loading_type'] == 'mass_diff'
          'mass_diff'
        else
          'loading'
        end

        unless p_loading.to_f == 0.0
          set_elem_composition_data l_type, d, p_loading
        end
      else
        {}
      end
    else
      d = Chemotion::Calculations.get_composition(m_formula)

      set_elem_composition_data 'formula', d
    end

    # init empty object keys for user-calculated composition input
    unless self.elemental_compositions.find {|i|i.composition_type== 'found'}
      clone_data = (d || {}).keys.map do |key|
        [key, nil]
      end.to_h

      set_elem_composition_data 'found', clone_data, 0.0
    end
  end

  # -- fake analyses
  def analyses
    unless analyses_dump.blank?
      JSON.parse(analyses_dump)
    else
      []
    end
  end

  def analyses= analyses
    json_dump = JSON.dump(analyses)
    self.analyses_dump = json_dump
  end

  def amount_mmol type = 'target'
    divisor = self["#{type}_amount_unit"] == 'mg' ? 1000.0 : 1.0
    if self.loading
      (self["#{type}_amount_value"] || 0.0) * loading.to_f
    else
      1000.0 * (self["#{type}_amount_value"] || 0.0) / self.molecule.molecular_weight
    end / divisor
  end

  def amount_mg type = 'target'
    multiplier = self["#{type}_amount_unit"] == 'g' ? 1000.0 : 1.0
    (self["#{type}_amount_value"] || 0.0) * multiplier
  end

  def amount_ml type = 'target'
    return if self.molecule.is_partial

    divisor = self["#{type}_amount_unit"] == 'mg' ? 1000.0 : 1.0

    (self["#{type}_amount_value"] || 0.0) / (self.molecule.density || 1.0) / divisor
  end

  def preferred_label
    self.external_label.present? ? self.external_label : self.molecule.iupac_name
  end

  def preferred_tag
    if (tag = self.preferred_label) && tag && tag.length > 20
      tag[0, 20] + "..."
    else
      tag
    end
  end

private

  def has_collections
    if self.collections_samples.blank?
      errors.add(:base, 'must have least one collection')
    end
  end

  def set_elem_composition_data d_type, d_values, loading = nil
    attrs = {
      composition_type: d_type,
      data: d_values,
      loading: loading
    }

    if item = self.elemental_compositions.find{|i| i.composition_type == d_type}
      item.assign_attributes attrs
    else
      self.elemental_compositions << ElementalComposition.new(attrs)
    end
  end

  def check_molfile_polymer_section
    return unless self.molfile.include? 'R#'

    lines = self.molfile.lines
    polymers = []
    m_end_index = nil
    lines[4..-1].each_with_index do |line, index|
      polymers << index if line.include? 'R#'
      (m_end_index = index) && break if line.match /M\s+END/
    end

    reg = /(> <PolymersList>[\W\w.\n]+[\d]+)/m
    unless (lines[5 + m_end_index].to_s + lines[6 + m_end_index].to_s).match reg
      if lines[5 + m_end_index].to_s.include? '> <PolymersList>'
        lines.insert(6 + m_end_index, polymers.join(' ') + "\n")
      else
        lines.insert(4 + m_end_index, "> <PolymersList>\n")
        lines.insert(5 + m_end_index, polymers.join(' ') + "\n")
      end
    end

    self.molfile = lines.join
    self.fingerprint_id = Fingerprint.find_or_create_by_molfile(self.molfile.clone)
  end

  def set_loading_from_ea
    return unless residue = self.residues.first

    # select from cached attributes, don't make a SQL query
    return unless el_composition = self.elemental_compositions.find do |i|
      i.composition_type == 'found'
    end

    el_composition.set_loading self
  end

  def update_data_for_reactions
    update_equivalent_for_reactions
    update_svg_for_reactions
  end

  def update_equivalent_for_reactions
    %w(product reactant).each do |name|
      self.send("reactions_#{name}_samples").each do |record|
        record.update_equivalent
      end
    end

    self.reactions_starting_material_samples.each do |record|
      %w(product reactant).each do |name|
        record.reaction.send("reactions_#{name}_samples").each do |record|
          record.update_equivalent
        end
      end
    end
  end

  def update_svg_for_reactions
    reactions.each do |reaction|
      reaction.save
    end
  end

  def check_short_label
    return if self.parent
    return if !!(self.short_label =~ /(solvent|solvents|reactant|reactants)/)

    abbr = self.creator.name_abbreviation
    if Sample.where(short_label: self.short_label).count > 0
      self.short_label = "#{abbr}-#{self.creator.counters['samples'].to_i + 1}"
    end
  end

  def update_counter
    return if (self.short_label == 'reactants' || self.short_label == 'solvents')
    self.creator.increment_counter 'samples' unless self.parent
  end
end
