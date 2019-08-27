require 'tempfile'

module Export
  class ExportResearchPlan

    def initialize(html, export_format)
      # make src in html relative
      @html = html
      @html.gsub! 'src="/images/', 'src="images/'

      @export_format = export_format
    end

    def to_file
      PandocRuby.convert(@html, :from => :html, :to => @export_format, :resource_path => Rails.public_path)
    end

    def to_zip
      Dir.mktmpdir('chemotion') do |tmpdir|
        # convert the html string using pandoc and save the images in tmpdir
        document = PandocRuby.convert(@html, :from => :html, :to => @export_format, :resource_path => Rails.public_path, :extract_media => tmpdir)

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
