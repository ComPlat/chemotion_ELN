# frozen_string_literal: true

module Export
  # rubocop:disable Metrics/ClassLength -- richtext-materialization helpers
  #   (rewrite_op / bundle_richtext_file / tempfile plumbing) are cohesive
  #   with the exporter and don't warrant a separate class.
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

    # Formats that produce a ZIP alongside a `files/` folder for bundled
    # attachments (see #to_zip). Single-file formats (docx/pdf/odt/...) can't
    # carry a companion folder, so file-attachment ops fall back to a
    # plain-text label there.
    BUNDLED_EXPORT_FORMATS = %w[html markdown latex].freeze

    def initialize(current_user, research_plan, export_format)
      @current_user = current_user
      @name = research_plan.name
      @fields = []
      @export_format = export_format
      # Retain PNG Tempfiles until the export finishes so GC does not delete
      # them before Pandoc/HTML rendering reads the paths.
      @png_tempfiles = []
      # attachment_identifier => { bundled_name:, path: } for files dropped
      # into a richtext field. Populated by rewrite_op → bundle_richtext_file,
      # consumed by to_zip when writing the `files/` entries.
      @richtext_file_bundles = {}
      @bundle_richtext_files = BUNDLED_EXPORT_FORMATS.include?(@export_format.to_s)

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
        template: 'export/research_plan.haml',
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

        # create a zipfile with the document, an image directory, and — for any
        # `attachment-file` op dropped into a richtext field — a `files/`
        # directory the rewritten <a href="files/…"> anchors resolve against.
        zip = Zip::OutputStream.write_buffer do |zip|
          zip.put_next_entry "document.#{@export_format}"
          zip.write document

          Dir.children(tmpdir).each do |tmpfile|
            zip.put_next_entry "images/#{tmpfile}"
            zip.write File.read(File.join(tmpdir, tmpfile))
          end

          @richtext_file_bundles.each_value do |bundle|
            zip.put_next_entry "files/#{bundle[:bundled_name]}"
            zip.write File.binread(bundle[:path])
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
      value = materialize_richtext_attachments(field['value'])
      html = Chemotion::QuillToHtml.convert(value, without_image: false)
      {
        type: field['type'],
        # `without_image: false` — after materialize_richtext_attachments the
        # only remaining `insert.image` ops are those we just rewrote to point
        # at an on-disk attachment path, so QuillUtils#filter_image must NOT
        # strip them. `insert.attachment-file` ops were rewritten to link ops
        # pointing at bundled `files/…` entries (see bundle_richtext_file),
        # `insert.attachment-image` ops were either rewritten to `insert.image`
        # (URL form) or dropped when the attachment was unresolvable.
        text: strip_unsafe_bundled_link_prefix(html),
      }
    end

    # quill-delta-to-html's default URL sanitizer prepends `unsafe:` to any
    # link whose scheme isn't in its allowlist (http/https/mailto/tel/sms/...).
    # Our bundled attachment links are relative paths (`files/<name>`) and
    # therefore fail that check. They are safe by construction — we generated
    # them ourselves — so unmask them post-conversion. Narrow regex so we
    # never touch a genuinely user-authored `unsafe:` link.
    def strip_unsafe_bundled_link_prefix(html)
      html.to_s.gsub(%r{href=(["'])unsafe:(files/[^"']+)\1}, 'href=\\1\\2\\1')
    end

    # Rewrite Quill embed ops that reference polymorphic Attachments so the
    # exporter's HTML pass (QuillToHtml → Pandoc) can render them:
    #
    #   {"insert":{"attachment-image":{"attachment_identifier":X,...}}}
    #     → {"insert":{"image":"/abs/path/to/file"}}   (Pandoc extracts + embeds)
    #
    #   {"insert":{"attachment-file":{"filename":Y,...}}}
    #     → {"insert":"[Y]"}                            (plain-text label; a file
    #                                                    pill has no portable
    #                                                    representation in
    #                                                    HTML/DOCX/MD/PDF)
    #
    # Unresolvable image ops (identifier not in DB, or the backing file is
    # missing) are dropped rather than passed through — otherwise Pandoc would
    # emit a broken <img> and the exported document would show a placeholder.
    def materialize_richtext_attachments(value)
      return value if value.blank?

      ops = value.is_a?(Hash) ? value['ops'] : value
      return value unless ops.is_a?(Array)

      rewritten = ops.filter_map { |delta_op| rewrite_op(delta_op) }
      value.is_a?(Hash) ? value.merge('ops' => rewritten) : rewritten
    end

    def rewrite_op(delta_op)
      return delta_op unless delta_op.is_a?(Hash)

      insert = delta_op['insert']
      return delta_op unless insert.is_a?(Hash)

      image_payload = insert['attachment-image']
      return rewrite_image_op(image_payload) if image_payload.is_a?(Hash)

      file_payload = insert['attachment-file']
      return rewrite_file_op(file_payload) if file_payload.is_a?(Hash)

      delta_op
    end

    def rewrite_image_op(payload)
      path = attachment_path_for(payload['attachment_identifier'])
      return nil unless path

      { 'insert' => { 'image' => path } }
    end

    def rewrite_file_op(payload)
      filename = payload['filename'].to_s
      filename = 'attachment' if filename.empty?
      bundled_name = bundle_richtext_file(payload['attachment_identifier'], filename)
      return { 'insert' => "[#{filename}]" } unless bundled_name

      { 'insert' => filename, 'attributes' => { 'link' => "files/#{bundled_name}" } }
    end

    # Bundle a file attachment referenced by an `attachment-file` op into the
    # export ZIP. Only wired for the ZIP-producing formats (see
    # BUNDLED_EXPORT_FORMATS) — single-file formats fall through to the
    # plain-text label branch in rewrite_op.
    #
    # Returns the ZIP-relative filename (e.g. `abc12345-report.pdf`) to link
    # against, or nil when the attachment can't be resolved to a file on disk
    # (which triggers the plain-text fallback).
    def bundle_richtext_file(identifier, filename)
      return nil unless @bundle_richtext_files && identifier.present?
      return @richtext_file_bundles[identifier][:bundled_name] if @richtext_file_bundles.key?(identifier)

      path = resolvable_attachment_path(identifier)
      return nil unless path

      ext = File.extname(filename)
      bundled_name = "#{identifier[0, 8]}-#{safe_file_basename(filename, ext)}#{ext}"
      copy_path = copy_to_export_tempfile(path, ext)
      @richtext_file_bundles[identifier] = { bundled_name: bundled_name, path: copy_path }
      bundled_name
    end

    def resolvable_attachment_path(identifier)
      attachment = Attachment.find_by(identifier: identifier)
      path = attachment&.abs_path.to_s
      return nil if path.empty? || !File.file?(path)

      path
    end

    # Strip path separators / control chars from the on-zip basename so a
    # crafted attachment filename can't traverse outside `files/`.
    def safe_file_basename(filename, ext)
      base = File.basename(filename, ext).gsub(/[^\w.-]+/, '_')
      base.empty? ? 'attachment' : base
    end

    def copy_to_export_tempfile(source_path, ext)
      copy = Tempfile.new(['rp_export_file', ext])
      IO.copy_stream(source_path, copy.path)
      copy.close
      @png_tempfiles << copy # ride the same cleanup lifecycle as image tempfiles
      copy.path
    end

    def attachment_path_for(identifier)
      return nil if identifier.blank?

      attachment = Attachment.find_by(identifier: identifier)
      path = attachment&.abs_path.to_s
      return nil if path.empty? || !File.file?(path)

      # Shrine stores blobs with a UUID name (no extension), but Pandoc's
      # extract-media names the extracted file after the source basename +
      # extension. If we hand it the raw path, extracted files land as
      # `<hash>.so` (Pandoc's fallback), which some viewers won't render.
      # Copy to a Tempfile whose extension matches the attachment's original
      # filename so the ZIP contains e.g. `images/<hash>.png`.
      ext = File.extname(attachment.filename.to_s)
      return path if ext.empty?

      copy = Tempfile.new(['rp_export_attachment', ext])
      IO.copy_stream(path, copy.path)
      copy.close
      @png_tempfiles << copy
      copy.path
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
  # rubocop:enable Metrics/ClassLength
end
