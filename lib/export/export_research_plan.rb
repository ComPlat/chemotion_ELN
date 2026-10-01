# frozen_string_literal: true

module Export
  class ExportResearchPlan
    # Long-side cap for Inkscape rasterization. Must stay large enough for
    # reaction schemes (~1560×440) while still allowing square molecule /
    # Ketcher SVGs to export as near-square PNGs (not the reaction-scheme
    # 1550×440 default canvas).
    STRUCTURE_EXPORT_MAX = 1550

    # Display width (px) for roughly square structures (samples, Ketcher
    # drawings). Pandoc interprets a bare width as pixels at 96 dpi, so this
    # value ÷ 96 is the on-page width in inches (300 px ≈ 3.1 in). Keeps crisp
    # high-resolution PNGs from being embedded at their full pixel size, which
    # would dominate the page.
    STRUCTURE_DISPLAY_WIDTH = 300

    # Display width (px) for wide reaction schemes (~1560×440). At 300 px a
    # reaction is only ~0.9 in tall and hard to read; this asks Pandoc for the
    # full page text column (Word clamps anything wider), so a reaction fills
    # the width at a legible height (~1.6 in) while samples stay compact.
    REACTION_DISPLAY_WIDTH = 600

    def initialize(current_user, research_plan, export_format)
      @current_user = current_user
      @name = research_plan.name
      @fields = []
      @export_format = export_format
      # Retain PNG Tempfiles until the export finishes so GC does not delete
      # them before Pandoc/HTML rendering reads the paths.
      @png_tempfiles = []

      research_plan.body.each { |field| add_field(field) }
    end

    # Rasterize an SVG to PNG with an export canvas that matches the SVG's
    # declared page aspect ratio. Sample/reaction *reports* compose structures
    # into a 1560×440 reaction-scheme SVG before calling +by_inkscape+ with its
    # matching defaults; research-plan export feeds raw editor SVGs (often
    # roughly square) and must not force them through that canvas — otherwise
    # +--export-area-page+ leaves most of the PNG blank.
    def to_png(svg_path)
      return if svg_path.blank? || !File.file?(svg_path)

      width, height = Reporter::Img::Conv.export_size_for(
        svg_path,
        max_width: STRUCTURE_EXPORT_MAX,
        max_height: STRUCTURE_EXPORT_MAX,
      )
      # ext_to_path returns a *closed* Tempfile: Inkscape writes to its path and
      # Pandoc later reads it, but the file descriptor is released immediately so
      # a research plan with many structures cannot exhaust the FD limit. Track
      # it before rasterizing so cleanup_png_tempfiles still close!/unlinks it
      # even if by_inkscape raises on a malformed SVG.
      output_file = Reporter::Img::Conv.ext_to_path('png')
      @png_tempfiles << output_file
      Reporter::Img::Conv.by_inkscape(svg_path, output_file.path, 'png', width: width, height: height)
      output_file.path
    end

    def to_html
      ApplicationController.render(
        # No handler suffix in the name (Rails infers it; '.' in the name is deprecated).
        template: 'export/research_plan',
        assigns: { name: @name, fields: @fields },
        layout: false,
      )
    end

    def to_relative_html
      # make src in html relative
      to_html.gsub "src='/images/", "src='images/"
    end

    def to_file
      PandocRuby.convert(to_relative_html, from: :html, to: @export_format, resource_path: Rails.public_path)
    ensure
      cleanup_png_tempfiles
    end

    def to_zip
      Dir.mktmpdir('chemotion') do |tmpdir|
        # convert the html string using pandoc and save the images in tmpdir
        document = PandocRuby.convert(
          to_relative_html,
          from: :html,
          to: @export_format,
          resource_path: Rails.public_path,
          extract_media: tmpdir,
        )

        # substitute tmp dir with images in the document
        document.gsub! tmpdir, 'images'

        # create a zipfile with the document and an image directory
        zip = Zip::OutputStream.write_buffer do |zip|
          zip.put_next_entry "document.#{@export_format}"
          zip.write document

          Dir.children(tmpdir).each do |tmpfile|
            zip.put_next_entry "images/#{tmpfile}"
            zip.write File.read(File.join(tmpdir, tmpfile))
          end
        end
        zip.rewind
        zip.read
      end
    ensure
      cleanup_png_tempfiles
    end

    private

    def add_field(field)
      built = build_field(field)
      @fields << built if built
    end

    # Returns the field hash for +field+, or nil when it contributes nothing
    # (an unknown type, or a sample/reaction that is missing or unreadable).
    def build_field(field)
      case field['type']
      when 'richtext' then richtext_field(field)
      when 'table'    then table_field(field)
      when 'ketcher'  then ketcher_field(field)
      when 'image'    then image_field(field)
      when 'sample'   then sample_field(field)
      when 'reaction' then reaction_field(field)
      end
    end

    def richtext_field(field)
      {
        type: field['type'],
        text: Chemotion::QuillToHtml.convert(field['value']),
      }
    end

    def table_field(field)
      {
        type: field['type'],
        columns: field['value']['columns'],
        rows: field['value']['rows'],
      }
    end

    def ketcher_field(field)
      # TODO: move image location root path to model constant of method
      img_src = to_png(Rails.public_path.join("images/research_plans/#{field['value']['svg_file']}"))

      {
        type: field['type'],
        src: img_src,
        width: STRUCTURE_DISPLAY_WIDTH,
      }
    end

    def image_field(field)
      attachment = Attachment.find_by(identifier: field['value']['public_name'])
      image_location = attachment&.attachment&.url || "/images/research_plans/#{field['value']['public_name']}"

      {
        type: field['type'],
        src: image_location,
      }
    end

    def sample_field(field)
      element = Sample.find_by(id: field['value']['sample_id'])
      element_field(field, element, STRUCTURE_DISPLAY_WIDTH)
    end

    def reaction_field(field)
      element = Reaction.find_by(id: field['value']['reaction_id'])
      element_field(field, element, REACTION_DISPLAY_WIDTH)
    end

    # Shared builder for a linked Sample/Reaction: skips (returns nil) when the
    # record is missing or unreadable, otherwise rasterizes its current SVG at
    # the given display width.
    def element_field(field, element, width)
      return unless element
      return unless ElementPolicy.new(@current_user, element).read?

      {
        type: field['type'],
        src: to_png(element.current_svg_full_path),
        width: width,
        p: element['name'],
      }
    end

    # Closes and unlinks the PNG Tempfiles retained during structure export,
    # once Pandoc has finished reading them. Safe to call more than once
    # (Tempfile#close! tolerates an already-closed file).
    def cleanup_png_tempfiles
      @png_tempfiles.each(&:close!)
      @png_tempfiles.clear
    end
  end
end
