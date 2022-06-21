#frozen_string_literal: true

require 'helpers/annotation/annotation_creator';

describe AnnotationCreator do
    context '-> annotations' do
        describe '-> create' do
            it '-> successfully' do
                    dir=Dir.mktmpdir("tmp");
                    tempfile = Tempfile.new('example.png');
                    creator=AnnotationCreator.new(ImageAnalyzerMock.new);
                    result=creator.createDerivative(dir,tempfile,1,{});
                    assert(File.file?(result[:annotation].path));
                    file = File.open(result[:annotation].path);
                    svg=file.read;
                    assert_equal(getExpectedString(),svg)
            end
        end
    end
end

class ImageAnalyzerMock
    def  getImageDimension(pathToImage)
        return[100,100];
    end
end

def getExpectedString()
return "<svg   width=\"100\"   height=\"100\"   xmlns=\"http://www.w3.org/2000/svg\"   xmlns:svg=\"http://www.w3.org/2000/svg\"   xmlns:xlink=\"http://www.w3.org/1999/xlink\">     <g class=\"layer\">      <title>Image</title>      <image height=\"100\"        id=\"original_image\"       width=\"100\"       xlink:href=\"/api/v1/attachments/image/1\"/>    </g>    <g class=\"layer\">      <title>Annotation</title>      id=\"annotation\"     </g></svg>"
end





