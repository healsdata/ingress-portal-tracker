function getKnownPortals(sheet) {
  return sheet.getRange(2, 1, sheet.getLastRow()).getValues(); // 1st is header row, portal names in 1st column
}

function backgroundFindSubmissions() {
  if (ScriptApp.getScriptTriggers().length > 0) {
    return;
  }

  ScriptApp.newTrigger('findSubmissions')
  .timeBased()
  .everyMinutes(5)
  .create();
  
  SpreadsheetApp.getActiveSpreadsheet()
  .toast("There are more submissions than can be found in one pass. You will receive an email once all portals have been found. You may close this window.", "Initialized");    
}

function finishFindSubmissions() {
  var triggers = ScriptApp.getScriptTriggers();
  
  for (i=0; i<triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }  
  
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(), 
    "Portal Tracker Completed", 
    "The portals have been extracted successfully.\n\n " +
    "Open the sheet here:" + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  );  
}


function findSubmissions() {
  var sheet = SpreadsheetApp.getActiveSheet();
  
  var subjectStart = "Ingress Portal Submitted: ";
  
  var search = 'from:(ingress-support@google.com) subject:"' + subjectStart + '"';
  var knownPortals = getKnownPortals(sheet);   
  for (var i=0; i<knownPortals.length; i++) {
    search = search + ' -"' + knownPortals[i] + '" ';    
  }
  
  var max = 10;
  var threads = GmailApp.search(search, 0, max);      
  
  try {
    
    for (var x=0; x<threads.length; x++) {
      
      var msg = threads[x].getMessages()[0];
      
      var subject = msg.getSubject();
      var submitted = msg.getDate();
      var portalName = subject.replace(subjectStart, '');
      
      var searchResult = knownPortals.findIndex(portalName);

      if(searchResult == -1) {
        var writeRow = sheet.getLastRow() + 1;
        sheet.getRange('A' + writeRow).setValue(portalName);
        sheet.getRange('B' + writeRow).setValue(submitted);   
        
        knownPortals.push(portalName);        
      }      
      
      
  
    }
    
    if (threads.length === max) {
      backgroundFindSubmissions();      
    } else {
      finishFindSubmissions();
    }          
  } catch (e) {
    Logger.log(e.toString());
  }  
  
}

function updateStatus() {
  
}



/**
 * For more information on using the Spreadsheet API, see
 * https://developers.google.com/apps-script/service_spreadsheet
 */
function onOpen() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var entries = [
    {
    name : "Find New Submissions",
    functionName : "findSubmissions"
  },
    
    {
    name : "Update Status",
    functionName : "updateStatus"
    }    
                
                ]
  
  ;
  spreadsheet.addMenu("Portal Tracker", entries);
};

/**
 * Polyfill for findIndex 
 */
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(search){
    if(search == "") return false;
    for (var i=0; i<this.length; i++)
      if (this[i] == search) return i;
    
    return -1;
  } 
}