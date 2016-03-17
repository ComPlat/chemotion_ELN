class Sample < ActiveRecord::Base
  acts_as_paranoid
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  multisearchable against: [:name, :iupac_name, :sum_formular]
  delegate :sum_formular, :iupac_name, to: :molecule, allow_nil: true

  # search scopes for exact matching
  pg_search_scope :search_by_sum_formula, associated_against: {
    molecule: :sum_formular
  }

  pg_search_scope :search_by_iupac_name, associated_against: {
    molecule: :iupac_name
  }

  pg_search_scope :search_by_sample_name, against: :name

  # search scope for substrings
  pg_search_scope :search_by_substring, against: :name,
                                        associated_against: {
                                          molecule: [:sum_formular, :iupac_name]
                                        },
                                        using: {trigram: {threshold:  0.0001}}

  # scopes for suggestions
  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }
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

  has_many :collections_samples, dependent: :destroy
  has_many :collections, through: :collections_samples

  has_many :reactions_starting_material_samples, dependent: :destroy
  has_many :reactions_reactant_samples, dependent: :destroy
  has_many :reactions_product_samples, dependent: :destroy

  has_many :reactions_as_starting_material, through: :reactions_starting_material_samples, source: :reaction
  has_many :reactions_as_reactant, through: :reactions_reactant_samples, source: :reaction
  has_many :reactions_as_product, through: :reactions_product_samples, source: :reaction

  belongs_to :molecule
  belongs_to :user

  has_one :well, dependent: :destroy
  has_many :wellplates, through: :well
  has_many :residues
  has_many :elemental_compositions

  composed_of :amount, mapping: %w(amount_value, amount_unit)

  before_save :auto_set_molfile_to_molecules_molfile
  before_save :find_or_create_molecule_based_on_inchikey

  has_ancestry

  validates :purity, :numericality => { :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :allow_nil => true }
  accepts_nested_attributes_for :molecule, update_only: true
  accepts_nested_attributes_for :residues, :elemental_compositions

  belongs_to :creator, foreign_key: :created_by, class_name: 'User', counter_cache: :samples_created_count

  before_save :auto_set_short_label, :attach_svg, :init_elemental_compositions

  def auto_set_short_label
    if parent
      parent.reload
      self.short_label ||= "#{parent.short_label}-#{parent.children.count.to_i + 1}"
    elsif creator
      creator.reload
      self.short_label ||= "#{creator.initials}-#{creator.samples.count.to_i + 1}"
    elsif
      self.short_label ||= 'NEW'
    end
  end

  def self.associated_by_user_id_and_reaction_ids(user_id, reaction_ids)
    (for_user(user_id).by_reaction_material_ids(reaction_ids) + for_user(user_id).by_reaction_reactant_ids(reaction_ids) + for_user(user_id).by_reaction_product_ids(reaction_ids)).uniq
  end

  def self.associated_by_user_id_and_wellplate_ids(user_id, wellplate_ids)
    for_user(user_id).by_wellplate_ids(wellplate_ids)
  end

  def reactions
    reactions_as_starting_material + reactions_as_reactant + reactions_as_product
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
    if self.sample_svg_file
      "/images/samples/#{self.sample_svg_file}"
    else
      "/images/molecules/#{self.molecule.molecule_svg_file}"
    end
  end

  def loading
    self.residues[0].custom_info['loading'].to_d
  end

  def attach_svg
    svg = self.sample_svg_file
    return unless svg.present?
    return unless svg.match /TMPFILE/

    svg_file_name = "#{self.short_label}.svg"
    svg_path = "#{Rails.root}/public/images/samples/#{svg}"

    FileUtils.mv(svg_path, svg_path.gsub(/(TMPFILE\S+)/, svg_file_name))

    self.sample_svg_file = svg_file_name
  end

  def init_elemental_compositions
    residue = self.residues[0]
    return unless m_formula = self.molecule.sum_formular
    elem_attrs_list = self.elemental_compositions
    items = {}
    elem_attrs_list.each { |i| items[i.composition_type.to_sym]= i.attributes }

    if residue.present?
      p_formula = residue.custom_info['formula']
      p_loading = residue.custom_info['loading'].try(:to_d)

      if loading_full = residue.custom_info['loading_full_conv']
        d = Chemotion::Calculations
                       .get_composition(m_formula, p_formula, loading_full.to_f)
        items = set_elem_composition_data items, :full_conv, d, loading_full
      end

      if p_formula.present? && p_loading.present?
        d = Chemotion::Calculations
                             .get_composition(m_formula, p_formula, p_loading)

        # if it is reaction product then loading has been calculated
        l_type = residue.custom_info['reaction_product'] ? :mass_diff : :loading
        items = set_elem_composition_data items, l_type, d, p_loading
      else
        {}
      end
    else
      d = Chemotion::Calculations.get_composition(m_formula)
      items = set_elem_composition_data items, :formula, d
    end
    self.elemental_compositions_attributes = items.values
  end

  # -- fake analyes
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

private
  def set_elem_composition_data items, d_type, d_values, loading = nil
    items[d_type] ||= {}
    items[d_type][:composition_type] = d_type
    items[d_type][:data] = d_values
    items[d_type][:loading] = loading

    items
  end
end
