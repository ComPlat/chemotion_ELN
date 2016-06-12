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

  def obtain_png_file
    unless @svg.nil?
      img = Svg2pdf.convert_to_img_data(@svg, :png)
      file = Tempfile.new(['image', '.png'])
      img.write_to_png(file.path)

      return file.path
    else
      raise "Fehler: Kein Bild angegeben"
    end
  end
end
