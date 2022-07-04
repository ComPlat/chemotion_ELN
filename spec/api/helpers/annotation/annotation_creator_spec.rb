# frozen_string_literal: true

require 'helpers/annotation/annotation_creator'

describe AnnotationCreator do
  context 'with annotations' do
    describe '-> create' do
      it '-> successfully' do
        dir = Dir.mktmpdir('tmp')
        tempfile = Tempfile.new('example.png')
        creator = described_class.new(ImageAnalyzerMock.new)
        result = creator.create_derivative(dir, tempfile, 1, {}, nil)
        assert(File.file?(result[:annotation].path))
        file = File.open(result[:annotation].path)
        svg = file.read
        assert_equal(expected_string, svg)
      end
    end
  end
end

class ImageAnalyzerMock
  def get_image_dimension(_pathToImage)
    [100, 100]
  end
end

def expected_string
  '<svg   width="100"   height="100"   xmlns="http://www.w3.org/2000/svg"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns:xlink="http://www.w3.org/1999/xlink">     <g class="layer">      <title>Image</title>      <image height="100"        id="original_image"       width="100"       xlink:href="/api/v1/attachments/image/1"/>    </g>    <g class="layer">      <title>Annotation</title>      id="annotation"     </g></svg>'
end
