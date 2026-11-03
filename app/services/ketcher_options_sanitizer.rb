# frozen_string_literal: true

# Cleans the Ketcher editor settings a user saves to their profile
# (+PUT /api/v1/profiles/editors/ketcher-options+) before they are written to
# disk, and again when they are read back.
#
# Ketcher stores its settings as a flat object of scalars. Known keys are
# checked against the rules of Ketcher's own settings schema; keys a newer
# Ketcher may add are kept only if they look harmless (short identifier,
# scalar value). Anything else is dropped, so Ketcher falls back to its
# default for that setting.
module KetcherOptionsSanitizer
  MAX_STRING_LENGTH = 64
  KEY_PATTERN = /\A[A-Za-z][A-Za-z0-9_-]{0,63}\z/.freeze
  CONTROL_CHARS = /[[:cntrl:]]/.freeze
  COLOR = /\A#\h{6}\z/.freeze
  UNITS = %w[px cm pt inch].freeze

  BOOLEAN = ->(v) { [true, false].include?(v) }
  FINITE_NUMBER = ->(v) { v.is_a?(Numeric) && v.to_f.finite? }

  def self.integer_in(range)
    ->(v) { v.is_a?(Integer) && range.cover?(v) }
  end

  def self.number_in(range)
    ->(v) { FINITE_NUMBER.call(v) && range.cover?(v) }
  end

  def self.one_of(*values)
    ->(v) { values.include?(v) }
  end

  def self.matching(pattern)
    ->(v) { v.is_a?(String) && pattern.match?(v) }
  end

  def self.short_string?(value)
    value.is_a?(String) && value.length <= MAX_STRING_LENGTH && !CONTROL_CHARS.match?(value)
  end

  SHORT_STRING = ->(v) { short_string?(v) }

  # Rules read from the settings schema of the Ketcher 3.18 standalone build
  # (public/editors/default). Update when a Ketcher upgrade changes them.
  RULES = {
    # editor
    'resetToSelect' => one_of(true, 'paste', false),
    'rotationStep' => integer_in(1..90),
    'showValenceWarnings' => BOOLEAN,
    'atomColoring' => BOOLEAN,
    'showStereoFlags' => BOOLEAN,
    'stereoLabelStyle' => one_of('Iupac', 'Classic', 'On', 'Off'),
    'colorOfAbsoluteCenters' => matching(COLOR),
    'colorOfAndCenters' => matching(COLOR),
    'colorOfOrCenters' => matching(COLOR),
    'colorStereogenicCenters' => one_of('LabelsOnly', 'BondsOnly', 'LabelsAndBonds', 'Off'),
    'autoFadeOfStereoLabels' => BOOLEAN,
    'absFlagLabel' => SHORT_STRING,
    'andFlagLabel' => SHORT_STRING,
    'mixedFlagLabel' => SHORT_STRING,
    'ignoreChiralFlag' => BOOLEAN,
    'orFlagLabel' => SHORT_STRING,
    # rendering
    'font' => SHORT_STRING,
    'fontsz' => number_in(0.1..96),
    'fontszUnit' => one_of(*UNITS),
    'fontszsub' => number_in(0.1..96),
    'fontszsubUnit' => one_of(*UNITS),
    'carbonExplicitly' => BOOLEAN,
    'showCharge' => BOOLEAN,
    'showValence' => BOOLEAN,
    'showHydrogenLabels' => one_of('Off', 'Hetero', 'Terminal', 'Terminal and Hetero', 'On'),
    'aromaticCircle' => BOOLEAN,
    'bondSpacing' => integer_in(1..100),
    'bondThickness' => number_in(0.1..96),
    'bondThicknessUnit' => one_of(*UNITS),
    'stereoBondWidth' => number_in(0.1..96),
    'stereoBondWidthUnit' => one_of(*UNITS),
    'bondLength' => number_in(0.1..1000),
    'bondLengthUnit' => one_of(*UNITS),
    'reactionComponentMarginSize' => number_in(0.1..1000),
    'reactionComponentMarginSizeUnit' => one_of(*UNITS),
    'hashSpacing' => number_in(0.1..1000),
    'hashSpacingUnit' => one_of(*UNITS),
    'imageResolution' => matching(/\A\d{1,4}\z/),
    # server
    'dearomatize-on-load' => BOOLEAN,
    'smart-layout' => BOOLEAN,
    'ignore-stereochemistry-errors' => BOOLEAN,
    'mass-skip-error-on-pseudoatoms' => BOOLEAN,
    'gross-formula-add-rsites' => BOOLEAN,
    'gross-formula-add-isotopes' => BOOLEAN,
    # debug
    'showAtomIds' => BOOLEAN,
    'showBondIds' => BOOLEAN,
    'showHalfBondIds' => BOOLEAN,
    'showLoopIds' => BOOLEAN,
    # 3D viewer
    'miewMode' => one_of('LN', 'BS', 'LC'),
    'miewTheme' => one_of('light', 'dark'),
    'miewAtomLabel' => one_of('no', 'bright', 'blackAndWhite', 'black'),
  }.freeze

  # Value rule for keys not in {RULES}: a boolean, a finite number or a short string.
  GENERIC = ->(v) { BOOLEAN.call(v) || FINITE_NUMBER.call(v) || short_string?(v) }

  # Splits Ketcher settings into the entries that may be stored and the keys that were dropped.
  #
  # @param raw [Hash] settings as received (string or symbol keys); anything else counts as empty
  # @return [Array(Hash, Array<String>)] +[clean, dropped_keys]+ — clean has string keys
  def self.call(raw)
    return [{}, []] unless raw.is_a?(Hash)

    raw.each_with_object([{}, []]) do |(key, value), (clean, dropped)|
      name = key.to_s
      if valid?(name, value)
        clean[name] = value
      else
        dropped << name
      end
    end
  end

  def self.valid?(name, value)
    rule = RULES[name]
    return rule.call(value) if rule

    KEY_PATTERN.match?(name) && GENERIC.call(value)
  end

  private_class_method :integer_in, :number_in, :one_of, :matching, :valid?
end
