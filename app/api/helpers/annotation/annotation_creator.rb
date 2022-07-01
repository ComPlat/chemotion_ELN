# frozen_string_literal: true

# Class for creating an annotation via the builder pattern
class AnnotationCreator

    require_relative 'mini_magick_image_analyser';

    def initialize(imageAnalyzer=nil)
        if imageAnalyzer
            @imageAnalyzer=imageAnalyzer;
        else
            @imageAnalyzer=MiniMagickImageAnalyser.new;
        end
    end

    def createDerivative(tmpPath,originalFile,dbId,result,record)
        tmpFile=createTmpFile(tmpPath,File.basename(originalFile,".*"));

        dimension=getImageDimension(originalFile);

        svgString=createAnnotationString(dimension[0],dimension[1],dbId);

        File.open(tmpFile.path, 'w') { |file| file.write(svgString) };

        result[:annotation] = File.open(tmpFile.path, 'rb')

        return result;

    end


    def createTmpFile(tmpPath,originalFileName)
        annotationTmpPath = "#{tmpPath}/#{originalFileName}.annotation.svg"
        return Tempfile.new(annotationTmpPath, encoding: 'ascii-8bit');

    end

    def getImageDimension(original)
        @imageAnalyzer.getImageDimension(original.path)
    end

    def createAnnotationString(height,width,id)
        return "<svg "+
        "  width=\"#{width}\" "+
        "  height=\"#{height}\" "+
        "  xmlns=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:svg=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:xlink=\"http://www.w3.org/1999/xlink\"> "+
        "    <g class=\"layer\">"+
        "      <title>Image</title>"+
        "      <image height=\"#{height}\"  "+
        "      id=\"original_image\" "+
        "      width=\"#{width}\" "+
        "      xlink:href=\"/api/v1/attachments/image/#{id}\"/>"+
        "    </g>"+
        "    <g class=\"layer\">"+
        "      <title>Annotation</title>"+
        "      id=\"annotation\" "+
        "    </g>"+
        "</svg>";
    end

end