function findSubmissions() {
  var subjectStart = "Ingress Portal Submitted: ";
  var search = 'from:(ingress-support@google.com) subject:"' + subjectStart + '"';
  
  var threads = GmailApp.search(search, 0, 10);      
  
  var sheet = SpreadsheetApp.getActiveSheet();
  
  
  try {
    
    for (var x=0; x<threads.length; x++) {
      
      var msg = threads[x].getMessages()[0];
      
      var subject = msg.getSubject();
      var submitted = msg.getDate();
      subject = subject.replace(subjectStart, '');
      
      var column = 1; //column Index   
      var columnValues = sheet.getRange(2, column, sheet.getLastRow()).getValues(); //1st is header row
      var searchResult = columnValues.findIndex(subject); //Row Index - 2

      if(searchResult == -1) {
        var writeRow = sheet.getLastRow() + 1;
      
        sheet.getRange('A' + writeRow).setValue(subject);
        sheet.getRange('B' + writeRow).setValue(submitted);   
      }      
      
      
  
    }
    
    /*
    if (uniques.length) {
      rows = sheet.getRange(sheet.getLastRow()+1, 1, uniques.length, 1)
      rows.setValues(uniques);
    }
    
    if ( threads.length === 0 ) {
      removeTriggers();
      cleanList();
      GmailApp.sendEmail(Session.getActiveUser().getEmail(), "Email Extraction Completed", 
                         "The email addresses have been extracted successfully.\n\n " +
                         "Open the sheet and click Gmail Addresses -> Remove Duplicates\n\n" + ss.getUrl());
    } 
    */
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
    name : "Find Submissions",
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

Array.prototype.findIndex = function(search){
  if(search == "") return false;
  for (var i=0; i<this.length; i++)
    if (this[i] == search) return i;

  return -1;
} 

