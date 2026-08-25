# frozen_string_literal: true

require 'caxlsx'

# rubocop:disable-next Metrics/ClassLength
module Import
  # Builds the workbook an import hands back to the user: their own sheet, with every row marked for
  # what became of it and every cell marked that could not be used as written.
  #
  # The notification can only say "rows 3, 9 could not be imported", which is not enough to act on --
  # it does not say why, and it says nothing at all about the values that were quietly dropped from
  # rows that *did* import. This puts the answer next to the data it belongs to, in the file the user
  # already understands.
  #
  # Values are written back as they were read. The sheet is rebuilt rather than edited in place: the
  # only xlsx writer available here is caxlsx, which cannot open an existing workbook. Cell values and
  # header order survive; original formatting and formulas do not.
  class ImportReportWorkbook
    STATUS_IMPORTED = 'imported'
    STATUS_IMPORTED_WITH_NOTES = 'imported, some values not used'
    STATUS_UPDATED = 'updated'
    STATUS_FAILED = 'not imported'
    STATUS_SKIPPED = 'skipped'

    STATUS_HEADER = 'import status'
    NOTES_HEADER = 'import notes'
    SAMPLE_ID_HEADER = 'sample id'
    EXTRA_HEADERS = [STATUS_HEADER, NOTES_HEADER, SAMPLE_ID_HEADER].freeze

    # The sheet the importer reads back. Named so that re-importing this very file picks up only the
    # rows that still need something, instead of asking the user to delete the rest by hand.
    DEFAULT_RETRY_SHEET = 'sample'

    RED = 'F4CCCC'
    AMBER = 'FFF2CC'
    GREY = 'EFEFEF'
    HEADER_GREY = 'D9D9D9'

    SHEET_NAME = 'import report'
    LEGEND_NAME = 'legend'

    NOTES_WIDTH = 62
    STATUS_WIDTH = 26
    LINK_BLUE = '0563C1'

    # rows          - { sheet_row_number => [cell values in header order] }, every row of the sheet
    # statuses      - { sheet_row_number => { status:, reason:, sample_id: } }
    # field_notes   - { sheet_row_number => [{ header:, value:, note: }] }
    def initialize(file_name:, header:, rows:, statuses:, field_notes:)
      @file_name = file_name
      @header = header.map(&:to_s)
      @rows = rows
      @statuses = statuses
      @field_notes = field_notes
      @columns = used_column_indices
    end

    # sample_url - optional callable, sample_id -> url; makes the sample id column clickable. Passed
    # here rather than to the constructor because it is about rendering, not about what happened.
    def write(path, sample_url: nil, retry_sheet_name: DEFAULT_RETRY_SHEET)
      @sample_url = sample_url
      @retry_sheet_name = retry_sheet_name
      package = Axlsx::Package.new
      build_styles(package.workbook)
      add_report_sheet(package.workbook)
      add_retry_sheet(package.workbook)
      add_legend_sheet(package.workbook)
      package.serialize(path.to_s)
      path
    end

    # Whether #write actually produced a correction sheet. Only meaningful once #write has run, and the
    # caller needs it: a report with no rows to correct must not tell the user to correct one.
    def retry_sheet_written?
      @retry_sheet_written
    end

    private

    # Only the columns the user actually filled in. A shipped template carries dozens of headers a
    # given lab never uses, and reproducing all of them pushes the status and notes columns off the
    # screen -- which is where the report says what went wrong.
    def used_column_indices
      used = (0...@header.size).select do |index|
        next false if own_column?(@header[index])

        @rows.any? { |_number, values| filled?(Array(values)[index]) }
      end
      # An entirely empty sheet keeps its headers, so the report still looks like the file it describes.
      used.presence || (0...@header.size).to_a
    end

    def filled?(value)
      value.to_s.strip.present?
    end

    # The legend tells the user to correct this file and import it again, so a report is a plausible
    # input to the next import. Reproducing our own columns would make each round wider than the last.
    def own_column?(name)
      EXTRA_HEADERS.any? { |header| header.casecmp(name.to_s.strip).zero? }
    end

    def out_header
      @columns.map { |index| @header[index] }
    end

    def build_styles(workbook)
      @style = {
        header: workbook.styles.add_style(b: true, bg_color: HEADER_GREY, fg_color: '000000'),
        plain: workbook.styles.add_style({}),
        amber: workbook.styles.add_style(bg_color: AMBER),
        red: workbook.styles.add_style(bg_color: RED),
        grey: workbook.styles.add_style(bg_color: GREY, i: true),
        legend_title: workbook.styles.add_style(b: true, sz: 12),
        link: workbook.styles.add_style(fg_color: LINK_BLUE, u: true),
      }
      # One note per line is only what the user sees if the cell wraps: Excel renders an unwrapped
      # newline as a single run, so the notes arrive squashed onto one line.
      @wrapped = {
        plain: wrapped_style(workbook, nil),
        red: wrapped_style(workbook, RED),
        grey: wrapped_style(workbook, GREY),
      }
    end

    def wrapped_style(workbook, fill)
      options = { alignment: { wrap_text: true, vertical: :top } }
      options[:bg_color] = fill if fill
      workbook.styles.add_style(options)
    end

    def add_report_sheet(workbook)
      workbook.add_worksheet(name: SHEET_NAME) do |sheet|
        sheet.add_row(out_header + EXTRA_HEADERS, style: @style[:header])
        @rows.keys.sort.each { |number| add_data_row(sheet, number) }
        freeze_header(sheet)
        sheet.column_widths(*Array.new(@columns.size, nil), STATUS_WIDTH, NOTES_WIDTH, 10)
      end
    end

    def add_data_row(sheet, number)
      values = Array(@rows[number])
      entry = @statuses[number] || {}
      notes = Array(@field_notes[number])
      cells = @columns.map { |index| values[index] }

      row = sheet.add_row(
        cells + [entry[:status], row_notes(entry, notes), entry[:sample_id]],
        style: row_styles(entry[:status], notes, linked: entry[:sample_id].present?),
        types: cell_types(cells),
      )
      link_sample(sheet, row, entry[:sample_id])
    end

    # Makes the sample id open the sample. The host comes from the caller rather than being built here,
    # so it follows the instance the import ran on instead of being hard-coded.
    def link_sample(sheet, row, sample_id)
      return if sample_id.blank? || @sample_url.nil?

      url = @sample_url.call(sample_id)
      return if url.blank?

      sheet.add_hyperlink(location: url, ref: row.cells.last.r, target: :external)
    rescue StandardError
      # A report without clickable ids is still a report.
      nil
    end

    # A cell the sheet held as text stays text. Left to infer, caxlsx would read a numeric-looking
    # string as a number and turn a lot number of "007" into 7 -- a silent edit to the user's own data,
    # in the one file whose job is to report faithfully. Values that arrive already typed (a real
    # number, a date) are left alone so they still read as what they are.
    def cell_types(cells)
      cells.map { |value| value.is_a?(String) ? :string : nil } + %i[string string integer]
    end

    # A whole-row fill for a row that did not make it, an individual cell fill for a value that was
    # dropped from a row that did. Rows that imported cleanly are left unfilled: colouring those green
    # as well makes the sheet uniformly loud and hides the cells that actually need attention.
    def row_styles(status, notes, linked: false)
      styles = case status
               when STATUS_FAILED then Array.new(total_columns, @style[:red])
               when STATUS_SKIPPED then Array.new(total_columns, @style[:grey])
               else amber_cell_styles(notes)
               end
      styles[notes_column] = @wrapped[fill_for(status)]
      styles[total_columns - 1] = @style[:link] if linked
      styles
    end

    def fill_for(status)
      case status
      when STATUS_FAILED then :red
      when STATUS_SKIPPED then :grey
      else :plain
      end
    end

    def amber_cell_styles(notes)
      flagged = notes.filter_map { |note| output_index(note[:header]) }.to_set
      Array.new(total_columns) { |column| flagged.include?(column) ? @style[:amber] : @style[:plain] }
    end

    # Notes are filed under the header they came from, which may sit at a different position once the
    # unused columns are dropped.
    def output_index(name)
      @columns.index { |index| @header[index] == name.to_s }
    end

    def total_columns
      @columns.size + EXTRA_HEADERS.size
    end

    def notes_column
      @columns.size + 1
    end

    def row_notes(entry, notes)
      lines = [entry[:reason].presence]
      lines += notes.map { |note| "#{note[:header]} — #{note[:note]}" }
      lines.compact.join("\n")
    end

    # Rows that still need something, in a form that can be corrected and imported again as-is:
    #
    #   * a row that did not import carries all of its original values and no sample id, so importing
    #     it creates the sample it failed to create.
    #   * a row that imported but lost values carries its sample id and *only* the cells that were not
    #     used, so importing it updates those fields on the sample that already exists. Every other
    #     cell is left empty precisely because empty means "leave this alone".
    #
    # Rows that imported cleanly are absent: there is nothing to do to them.
    def add_retry_sheet(workbook)
      entries = retry_entries
      @retry_sheet_written = entries.any?
      return if entries.empty?

      # Only the columns some row on this sheet actually uses -- the same rule as the report sheet, and
      # for the same reason: a correction sheet thirty columns wide hides the two cells to correct.
      # Pruning is safe here because the sample id column always stays, and check_required_fields
      # accepts that on its own, so the header row can never lose the column that lets it be imported.
      columns = retry_columns(entries)

      workbook.add_worksheet(name: @retry_sheet_name) do |sheet|
        sheet.add_row([SAMPLE_ID_HEADER] + columns.map { |index| @header[index] } + [NOTES_HEADER],
                      style: @style[:header])
        entries.each { |entry| add_retry_row(sheet, entry, columns) }
        freeze_header(sheet)
        sheet.column_widths(10, *Array.new(columns.size, nil), NOTES_WIDTH)
      end
    end

    def retry_columns(entries)
      (0...@header.size).select do |index|
        next false if own_column?(@header[index])

        entries.any? { |entry| filled?(entry[:values][index]) }
      end
    end

    def add_retry_row(sheet, entry, columns)
      values = columns.map { |index| entry[:values][index] }
      cells = [entry[:sample_id]] + values + [entry[:notes]]
      styles = Array.new(cells.size, entry[:fill])
      styles[cells.size - 1] = @wrapped[entry[:wrapped]]
      sheet.add_row(cells, style: styles,
                           types: [:integer] + values.map { |v| v.is_a?(String) ? :string : nil } +
                                  [:string])
    end

    def retry_entries
      @rows.keys.sort.filter_map { |number| retry_entry(number) }
    end

    def retry_entry(number)
      values = Array(@rows[number])
      entry = @statuses[number] || {}
      notes = Array(@field_notes[number])
      # A blank row is skipped, but there is nothing in it to correct.
      return nil unless values.any? { |value| filled?(value) }

      case entry[:status]
      when STATUS_FAILED, STATUS_SKIPPED
        not_imported_entry(number, values, entry, notes)
      when STATUS_IMPORTED_WITH_NOTES
        unusable_values_entry(number, values, entry, notes)
      end
    end

    # sample_id: whatever the row named. The source column is pruned as one of the report's own, so this
    # is where it survives -- without it a corrected update row re-imports as a create and duplicates.
    def not_imported_entry(number, values, entry, notes)
      {
        sample_id: entry[:sample_id].presence || original_sample_id(values),
        values: @header.each_index.map { |index| values[index] },
        notes: row_notes(entry, notes),
        fill: entry[:status] == STATUS_FAILED ? @style[:red] : @style[:grey],
        wrapped: entry[:status] == STATUS_FAILED ? :red : :grey,
        number: number,
      }
    end

    # The sample id the source sheet carried for this row, if it had that column at all.
    def original_sample_id(values)
      index = @header.index { |name| name.to_s.strip.casecmp(SAMPLE_ID_HEADER).zero? }
      return nil if index.nil?

      values[index].presence
    end

    def unusable_values_entry(number, values, entry, notes)
      return nil if entry[:sample_id].blank?

      flagged = notes.filter_map { |note| @header.index(note[:header].to_s) }.to_set
      {
        sample_id: entry[:sample_id],
        values: @header.each_index.map { |index| flagged.include?(index) ? values[index] : nil },
        notes: row_notes(entry, notes),
        fill: @style[:plain],
        wrapped: :plain,
        number: number,
      }
    end

    def freeze_header(sheet)
      sheet.sheet_view.pane do |pane|
        pane.top_left_cell = 'A2'
        pane.state = :frozen
        pane.y_split = 1
      end
    end

    def add_legend_sheet(workbook)
      workbook.add_worksheet(name: LEGEND_NAME) do |sheet|
        sheet.add_row(["Import report for #{@file_name}"], style: @style[:legend_title])
        sheet.add_row([])
        sheet.add_row(%w[marking meaning], style: @style[:header])
        legend_rows.each { |fill, text| sheet.add_row(['', text], style: [@style[fill], @wrapped[:plain]]) }
        sheet.add_row([])
        explanation_rows.each { |text| sheet.add_row([text], style: [@wrapped[:plain]]) }
        sheet.column_widths(12, 100)
      end
    end

    def legend_rows
      [
        [:red, "#{STATUS_FAILED} — this row created no sample. The reason is in the import notes column."],
        [:amber, 'This cell could not be used as written. The sample was still created; the import ' \
                 'notes column says what happened to the value.'],
        [:grey, "#{STATUS_SKIPPED} — this row was not imported. The import notes column says why."],
        [:plain, 'No fill — the row imported and every value in it was used as given.'],
        [:plain, "#{STATUS_UPDATED} — this row carried a sample id, so it changed a sample that already " \
                 'existed instead of creating a new one.'],
      ]
    end

    def explanation_rows
      [
        'The sample id column is the id of the sample this row created, and links straight to it.',
        "To fix what did not work: correct the '#{@retry_sheet_name}' sheet and import this file again. " \
        'Nothing needs deleting - that sheet holds only the rows that still need something, and it is ' \
        'the one the importer reads.',
        'On that sheet a row with no sample id creates the sample it failed to create, and a row with ' \
        'a sample id updates that sample. Update rows carry only the values that could not be used: an ' \
        'empty cell means "leave this field as it is", so filling one in is what changes it.',
        'Columns that were empty in every row of the uploaded file are left out of this report.',
        'This report replaces the uploaded file in your Inbox - it holds the same values plus the ' \
        'verdict for every row.',
        'This sheet is a copy of the values as the importer read them. Original formatting and ' \
        'formulas from the uploaded file are not carried over.',
      ]
    end
  end
end
