function doGet(e) {
  try {
    // 1. Si la petición pide archivos de una materia específica
    if (e.parameter.folderId) {
      return getFilesInFolder(e.parameter.folderId);
    }
    
    // 2. Si no pide nada, devuelve solo el árbol de carpetas (Muy rápido)
    return getFolderTree();
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Error: " + error.message,
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getFolderTree() {
  // === ID DE TU CARPETA DE DRIVE ===
  var FOLDER_RAIZ_ID = '1YiEgdeTTYsI1m1r2tSjbreN5tLeyHLZB';
  var tree = [];
  var warnings = [];
  
  var rootFolder = DriveApp.getFolderById(FOLDER_RAIZ_ID);
  
  // Nivel / Ciclo
  var nivelesFolders = rootFolder.getFolders();
  while (nivelesFolders.hasNext()) {
    var nivelFolder = nivelesFolders.next();
    var nivelObj = { nivel: nivelFolder.getName(), grados: [] };
    
    // Grados
    var gradosFolders = nivelFolder.getFolders();
    while (gradosFolders.hasNext()) {
      var gradoFolder = gradosFolders.next();
      
      // 1. Buscar si hay Secciones
      var gradoFoldersIter = gradoFolder.getFolders();
      var hasSecciones = false;
      var secciones = [];
      
      while (gradoFoldersIter.hasNext()) {
        var sf = gradoFoldersIter.next();
        if (sf.getName().indexOf("Sección") === 0) {
           hasSecciones = true;
           secciones.push(sf);
        }
      }
      
      if (hasSecciones) {
        // Modo con Secciones
        for (var s = 0; s < secciones.length; s++) {
          var seccionFolder = secciones[s];
          var gradoObj = { grado: gradoFolder.getName() + " - " + seccionFolder.getName(), materias: [] };
          
          var materiasDirIter = seccionFolder.getFoldersByName("MATERIAS");
          if (materiasDirIter.hasNext()) {
            var materiasDir = materiasDirIter.next();
            var materiasFolders = materiasDir.getFolders();
            while (materiasFolders.hasNext()) {
              var materiaFolder = materiasFolders.next();
              gradoObj.materias.push({
                materia: materiaFolder.getName(),
                id: materiaFolder.getId()
              });
            }
          } else {
            warnings.push("La " + seccionFolder.getName() + " del Grado " + gradoFolder.getName() + " no tiene carpeta MATERIAS.");
          }
          nivelObj.grados.push(gradoObj);
        }
      } else {
        // Modo SIN Secciones (comportamiento original)
        var gradoObj = { grado: gradoFolder.getName(), materias: [] };
        var materiasDirIter = gradoFolder.getFoldersByName("MATERIAS");
        if (materiasDirIter.hasNext()) {
          var materiasDir = materiasDirIter.next();
          var materiasFolders = materiasDir.getFolders();
          while (materiasFolders.hasNext()) {
            var materiaFolder = materiasFolders.next();
            gradoObj.materias.push({
              materia: materiaFolder.getName(),
              id: materiaFolder.getId()
            });
          }
        } else {
          warnings.push("Grado " + gradoFolder.getName() + " no tiene carpeta MATERIAS ni Secciones.");
        }
        nivelObj.grados.push(gradoObj);
      }
    }
    tree.push(nivelObj);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    tree: tree,
    warnings: warnings
  })).setMimeType(ContentService.MimeType.JSON);
}

function getFilesInFolder(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var arrFiles = [];
  collectFilesRecursively(folder, arrFiles);
  
  arrFiles.sort(function(a, b) {
    return new Date(b.modifiedTime) - new Date(a.modifiedTime);
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    files: arrFiles
  })).setMimeType(ContentService.MimeType.JSON);
}

function collectFilesRecursively(folder, arrFiles) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    
    arrFiles.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      modifiedTime: f.getLastUpdated().toISOString(),
      createdTime: f.getDateCreated().toISOString(),
      webViewLink: f.getUrl(),
      thumbnailLink: "" // Apps script DriveApp doesn't support thumbnails easily, leave blank
    });
  }
  
  var subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    var sf = subFolders.next();
    if (!sf.isTrashed()) {
      collectFilesRecursively(sf, arrFiles);
    }
  }
}
