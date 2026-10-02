# frozen_string_literal: true

require 'open3'

# Builds a text-layer PDF from plain lines with ghostscript, so an extractor spec can state
# the sheet it reads instead of depending on a vendor PDF that is not in the repository.
module SdsSheetHelpers
  LINES_PER_PAGE = 60
  LINE_HEIGHT = 12
  TOP = 770

  def sds_pdf_from_lines(lines, dir:, name: 'sheet.pdf')
    postscript = File.join(dir, 'sheet.ps')
    pdf = File.join(dir, name)
    File.write(postscript, sds_postscript(lines))
    _out, err, status = Open3.capture3('gs', '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=pdfwrite',
                                       "-sOutputFile=#{pdf}", postscript)
    raise "ghostscript could not build the fixture: #{err}" unless status.success?

    pdf
  end

  private

  def sds_postscript(lines)
    pages = lines.each_slice(LINES_PER_PAGE).map do |page|
      shown = page.each_with_index.map do |line, index|
        "72 #{TOP - (index * LINE_HEIGHT)} moveto (#{sds_ps_escape(line)}) show"
      end
      "/Helvetica findfont 9 scalefont setfont\n#{shown.join("\n")}\nshowpage"
    end
    "%!PS\n#{pages.join("\n")}\n"
  end

  def sds_ps_escape(text)
    text.gsub(/[\\()]/) { |char| "\\#{char}" }
  end
end
