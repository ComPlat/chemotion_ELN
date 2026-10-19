# frozen_string_literal: true

require 'open3'

# Builds a text-layer PDF from plain lines with ghostscript, so an extractor spec can state
# the sheet it reads instead of depending on a vendor PDF that is not in the repository.
module SdsSheetHelpers
  LINES_PER_PAGE = 60
  LINE_HEIGHT = 12
  TOP = 770
  # Helvetica in ISO Latin-1, so a degree sign or umlaut survives; 45 stays a hyphen, not a minus.
  LATIN1_FONT = '/Helvetica findfont dup length dict begin { 1 index /FID ne { def } { pop pop } ifelse } forall ' \
                '/Encoding ISOLatin1Encoding 256 array copy dup 45 /hyphen put def ' \
                'currentdict end /SdsFont exch definefont pop'

  def sds_pdf_from_lines(lines, dir:, name: 'sheet.pdf')
    sds_pdf_from_postscript(sds_postscript(lines), dir: dir, name: name)
  end

  # A page that draws but holds no text, as a scanned sheet does.
  def sds_pdf_without_text(dir:, name: 'scan.pdf')
    sds_pdf_from_postscript("%!PS\n72 72 moveto 300 300 lineto stroke\nshowpage\n", dir: dir, name: name)
  end

  private

  def sds_pdf_from_postscript(postscript_source, dir:, name:)
    postscript = File.join(dir, "#{File.basename(name, '.pdf')}.ps")
    pdf = File.join(dir, name)
    File.write(postscript, postscript_source)
    _out, err, status = Open3.capture3('gs', '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=pdfwrite',
                                       "-sOutputFile=#{pdf}", postscript)
    raise "ghostscript could not build the fixture: #{err}" unless status.success?

    pdf
  end

  def sds_postscript(lines)
    pages = lines.each_slice(LINES_PER_PAGE).map do |page|
      shown = page.each_with_index.map do |line, index|
        "72 #{TOP - (index * LINE_HEIGHT)} moveto (#{sds_ps_escape(line)}) show"
      end
      "/SdsFont findfont 9 scalefont setfont\n#{shown.join("\n")}\nshowpage"
    end
    "%!PS\n#{LATIN1_FONT}\n#{pages.join("\n")}\n"
  end

  def sds_ps_escape(text)
    text.gsub(/[\\()]/) { |char| "\\#{char}" }
        .gsub(/[^\x00-\x7F]/) { |char| format('\\%03o', char.encode(Encoding::ISO_8859_1, undef: :replace).ord) }
  end
end
