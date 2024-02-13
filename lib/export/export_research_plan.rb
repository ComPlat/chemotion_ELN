# frozen_string_literal: true

require 'tempfile'

module Export
  class ExportResearchPlan
    def initialize(current_user, research_plan, export_format)
      @current_user = current_user
      @name = research_plan.name
      @fields = []
      @export_format = export_format

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
              p: reaction['name'],
            }
          end
        end
      end
    end

    def to_png(svg_path)
      return if svg_path.blank? || !File.file?(svg_path)

      output_file = Tempfile.new(['output', '.png'])
      Reporter::Img::Conv.by_inkscape(svg_path, output_file.path, 'png')
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
