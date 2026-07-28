# frozen_string_literal: true

require 'tempfile'

module Export
  class ExportResearchPlan
    # Long-side cap for Inkscape rasterization. Must stay large enough for
    # reaction schemes (~1560×440) while still allowing square molecule /
    # Ketcher SVGs to export as near-square PNGs (not the reaction-scheme
    # 1550×440 default canvas).
    STRUCTURE_EXPORT_MAX = 1550

    # Display width (px) for structure <img> tags. Pandoc interprets a bare
    # width as pixels at 96 dpi, so this value ÷ 96 is the on-page width in
    # inches (300 px ≈ 3.1 in). Keeps crisp high-resolution PNGs from being
    # embedded at their full pixel size, which would dominate the page.
    STRUCTURE_DISPLAY_WIDTH = 300

    def initialize(current_user, research_plan, export_format)
      @current_user = current_user
      @name = research_plan.name
      @fields = []
      @export_format = export_format
      # Retain PNG Tempfiles until the export finishes so GC does not delete
      # them before Pandoc/HTML rendering reads the paths.
      @png_tempfiles = []

      research_plan.body.each do |field|
        case field['type']

        when 'richtext'
          @fields << {
            type: field['type'],
            text: Chemotion::QuillToHtml.convert(field['value']),
          }
        when 'table'
          @fields << {
            type: field['type'],
            columns: field['value']['columns'],
            rows: field['value']['rows'],
          }
        when 'ketcher'
          # TODO: move  image location root path to model constant of method
          img_src = to_png(Rails.public_path.join("images/research_plans/#{field['value']['svg_file']}"))
          @fields << {
            type: field['type'],
            src: img_src,
            width: STRUCTURE_DISPLAY_WIDTH,
          }
        when 'image'
          attachment = Attachment.find_by(identifier: field['value']['public_name'])
          image_location = attachment&.attachment&.url || "/images/research_plans/#{field['value']['public_name']}"

          @fields << {
            type: field['type'],
            src: image_location,
          }
        when 'sample'
          next unless (sample = Sample.find_by(id: field['value']['sample_id']))

          if ElementPolicy.new(@current_user, sample).read?
            img_src = to_png(sample.current_svg_full_path)
            @fields << {
              type: field['type'],
              src: img_src,
              width: STRUCTURE_DISPLAY_WIDTH,
              p: sample['name'],
            }
          end
        when 'reaction'
          next unless (reaction = Reaction.find_by(id: field['value']['reaction_id']))

          if ElementPolicy.new(@current_user, reaction).read?
            img_src = to_png(reaction.current_svg_full_path)
            @fields << {
              type: field['type'],
              src: img_src,
              width: STRUCTURE_DISPLAY_WIDTH,
              p: reaction['name'],
            }
          end
        end
      end
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
      output_file = Tempfile.new(['output', '.png'])
      Reporter::Img::Conv.by_inkscape(svg_path, output_file.path, 'png', width: width, height: height)
      @png_tempfiles << output_file
      output_file.path
    end

    def to_html
      ApplicationController.render(
        template: 'export/research_plan.haml',
        assigns: { name: @name, fields: @fields },
        layout: false
      )
    end

    def to_relative_html
      # make src in html relative
      to_html.gsub "src='/images/", "src='images/"
    end

    def to_file
      PandocRuby.convert(to_relative_html, from: :html, to: @export_format, resource_path: Rails.public_path)
    end

    def to_zip
      Dir.mktmpdir('chemotion') do |tmpdir|
        # convert the html string using pandoc and save the images in tmpdir
        document = PandocRuby.convert(to_relative_html, from: :html, to: @export_format, resource_path: Rails.public_path, extract_media: tmpdir)

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
    end
  end
end
