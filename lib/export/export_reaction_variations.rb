# frozen_string_literal: true

module Export
  # The variations of the reactions of an archived report as a spreadsheet, one sheet per reaction.
  # A variation stores only what it changes about its reaction (db/schemas/reaction_variations.schema.json);
  # the values written here are resolved against the reaction by Reporter::Docx::DetailReaction, the
  # same way the docx report resolves them.
  class ExportReactionVariations
    # Material collections in the order the Variations tab shows them.
    MATERIAL_GROUPS = {
      'startingMaterials' => 'Starting materials',
      'reactants' => 'Reactants',
      'solvents' => 'Solvents',
      'products' => 'Products',
    }.freeze

    SHEET_NAME_MAX_LENGTH = 31

    # Group, notes, temperature and duration are text; Axlsx would turn a group like '1.0' into a number.
    TEXT_COLUMNS = [nil, :string, :string, :string, :string].freeze

    delegate :empty?, to: :@sheet_names

    def initialize(user)
      @user = user
      @xfile = Axlsx::Package.new
      @xfile.workbook.styles.fonts.first.name = 'Calibri'
      @header_style = @xfile.workbook.styles.add_style(b: true)
      @sheet_names = []
    end

    def file_extension
      'xlsx'
    end

    # @param reaction [Reaction] a reaction the user may read
    def add_reaction(reaction)
      records = Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(serialize(reaction))) # rubocop:disable Style/OpenStructUse
                                              .variation_records
      return if records.empty?

      columns = material_columns(records)
      sheet = @xfile.workbook.add_worksheet(name: sheet_name(reaction))
      sheet.add_row(headers(columns), style: @header_style)
      records.each { |record| sheet.add_row(row(record, columns), types: TEXT_COLUMNS) }
    end

    def read
      @xfile.to_stream.read
    end

    private

    # Serialized the way Reporter::Worker#extract hands reactions to the docx report, so the user's
    # detail level for the reaction applies here too.
    def serialize(reaction)
      Entities::ReactionReportEntity.new(
        reaction,
        current_user: @user,
        detail_levels: ElementDetailLevelCalculator.new(user: @user, element: reaction).detail_levels,
      ).serializable_hash
    end

    # One set of columns per material position, for as many positions as any variation of the group
    # has - a variation can bring materials of its own. Each is labelled by the first variation that
    # has a material there.
    def material_columns(records)
      MATERIAL_GROUPS.flat_map do |key, group_label|
        count = records.map { |record| Array(record[:materials][key]).size }.max || 0
        Array.new(count) do |index|
          label = material_label(records, key, index) || (index + 1)
          { key: key, index: index, prefix: "#{group_label} / #{label}", product: key == 'products' }
        end
      end
    end

    def material_label(records, key, index)
      records.lazy.map { |record| record[:materials][key]&.dig(index, :label) }.find(&:present?)
    end

    def headers(columns)
      %w[ID Group Notes Temperature Duration] + columns.flat_map do |column|
        last = column[:product] ? 'Yield (%)' : 'Equivalent'
        ['Mass (g)', 'Volume (ml)', 'Amount (mmol)', last].map { |name| "#{column[:prefix]} / #{name}" }
      end
    end

    def row(record, columns)
      [record[:idx], record[:group], record[:notes], record[:temperature], record[:duration]] +
        columns.flat_map do |column|
          material = record[:materials][column[:key]]&.at(column[:index]) || {}
          last = column[:product] ? material[:yield_percent] : material[:equivalent]
          [material[:mass_g], material[:volume_ml], material[:amount_mmol], last].map { |value| cell(value) }
        end
    end

    def cell(value)
      value.is_a?(Float) && value.finite? ? value.round(6) : value
    end

    # Excel limits sheet names to 31 characters, forbids some characters and wants them unique.
    def sheet_name(reaction)
      base = reaction.short_label.to_s.gsub(%r{[\[\]:*?/\\]}, '_').strip
      base = "Reaction #{reaction.id}" if base.blank?
      name = base[0, SHEET_NAME_MAX_LENGTH]
      suffix = 1
      while @sheet_names.include?(name)
        suffix += 1
        tail = " (#{suffix})"
        name = base[0, SHEET_NAME_MAX_LENGTH - tail.length] + tail
      end
      @sheet_names << name
      name
    end
  end
end
