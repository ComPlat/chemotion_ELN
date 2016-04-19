class Report::Image
  def set_path path
    File.open(path, "rb") {|io| svg = io.read }
  end

  def set_blob blob
    @svg = blob
  end

  def size hash = nil
    unless hash.nil?
      @size = hash
    end
    @size
  end

  def obtain_png_file scaling = nil
    unless @svg.nil?
      img, data = Magick::Image.from_blob(@svg) {
        self.format = 'SVG'
        self.background_color = 'transparent'
      }

      file = Tempfile.new(['image', '.png'])

      if scaling
        img.adaptive_resize(scaling).write(file.path)
      else
        img.write(file.path)
      end

      return file.path
    else
      raise "Fehler: Kein Bild angegeben"
    end
  end
end
