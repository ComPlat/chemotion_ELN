const getFileName = response => {
  const disposition = response.headers.get('Content-Disposition')

  if (disposition && disposition.indexOf('attachment') !== -1) {
    let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    let matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }
  }
}

const downloadBlob = (file_name, blob) => {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.style = "display: none";
  a.href = url;
  a.download = file_name

  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

export { getFileName, downloadBlob }
