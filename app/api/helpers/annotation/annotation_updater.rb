# frozen_string_literal: true

class AnnotationUpdater
    def updateAnnotation(annotationSvgString,attachmentId)
        att = Attachment.find(attachmentId);
        sanitizedSvgString=sanitizeSvgString(annotationSvgString);
        locationOfSvgFile=saveSvgStringToFileSystem(sanitizedSvgString,att);
    end

    def sanitizeSvgString(svgString)
        return svgString;
    end

    def saveSvgStringToFileSystem(sanitizedSvgString,attachment)
        location=attachment.attachment_data['derivatives']['annotation']['id'];
        f = File.new(location, 'w')
        f.write(sanitizedSvgString)
        f.close
        return location;
    end
end