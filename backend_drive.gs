function doGet(e) {
  // ==============================================================
  // PASO 1: PEGA AQUÍ EL ID DE LA CARPETA RAÍZ DE TU PORTAL
  // ==============================================================
  var FOLDER_RAIZ_ID = 'PEGAR_AQUI_EL_ID_DE_LA_CARPETA_RAIZ';
  
  var tree = [];
  var warnings = [];
  var filesByFolderId = {};

  try {
    // Para asegurar que los datos no se devuelvan en caché si cambian frecuentemente
    var rootFolder = DriveApp.getFolderById(FOLDER_RAIZ_ID);
    
    // Nivel / Ciclo
    var nivelesFolders = rootFolder.getFolders();
    while (nivelesFolders.hasNext()) {
      var nivelFolder = nivelesFolders.next();
      var nivelObj = {
        nivel: nivelFolder.getName(),
        grados: []
      };
      
      var nfFiles = nivelFolder.getFiles();
      while (nfFiles.hasNext()) {
         var f1 = nfFiles.next();
         if(!f1.isTrashed()) warnings.push("Archivo suelto en nivel " + nivelFolder.getName() + ": " + f1.getName());
      }
      
      // Grados
      var gradosFolders = nivelFolder.getFolders();
      while (gradosFolders.hasNext()) {
        var gradoFolder = gradosFolders.next();
        var gradoObj = {
          grado: gradoFolder.getName(),
          materias: []
        };
        
        var gfFiles = gradoFolder.getFiles();
        while (gfFiles.hasNext()) {
           var f2 = gfFiles.next();
           if(!f2.isTrashed()) warnings.push("Archivo suelto en grado " + gradoFolder.getName() + ": " + f2.getName());
        }
        
        // Materias
        var materiasFolders = gradoFolder.getFolders();
        while (materiasFolders.hasNext()) {
          var materiaFolder = materiasFolders.next();
          var materiaObj = {
            materia: materiaFolder.getName(),
            id: materiaFolder.getId()
          };
          gradoObj.materias.push(materiaObj);
          
          // Recolectar archivos de la materia recursivamente (Tareas, Guías, sueltos, etc)
          var arrFiles = [];
          collectFilesRecursively(materiaFolder, arrFiles);
          
          // Ordenar por fecha de modificación descendente
          arrFiles.sort(function(a, b) {
            return new Date(b.modifiedTime) - new Date(a.modifiedTime);
          });
          
          filesByFolderId[materiaFolder.getId()] = arrFiles;
        }
        
        nivelObj.grados.push(gradoObj);
      }
      tree.push(nivelObj);
    }
    
    var output = JSON.stringify({
      tree: tree,
      warnings: warnings,
      filesByFolderId: filesByFolderId
    });

    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función recursiva para buscar en cualquier subcarpeta (Guías, Tareas, etc)
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
      webViewLink: f.getUrl()
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
