/**
 * Ingress Portal Tracker Scripts
 * 
 * @copyright 2014 Jonathan Campbell (http://www.healsdata.com/)
 * @license MIT License http://www.opensource.org/licenses/mit-license.php
 * @version 0.2.0
 */

function getKnownPortals(sheet) {
  return sheet.getRange(2, 1, sheet.getLastRow()).getValues(); // 1st is header row, portal names in 1st column
}

function hasBackgroundJobs() {
  return ScriptApp.getScriptTriggers().length > 0;
}

function backgroundSync() {
  if (hasBackgroundJobs()) {
    return;
  }

  ScriptApp.newTrigger('sync')
  .timeBased()
  .everyMinutes(1)
  .create();
  
  SpreadsheetApp.getActiveSpreadsheet()
  .toast("There are more submissions than can be updated in one pass. You will receive an email once all portals have been synced. You may close this window.", "Initialized");    
}

function finishSync() {
  var sheet = SpreadsheetApp.getActiveSheet();
  
  var allData = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

  for (var i = 0; i < allData.length; i++) {
    var theRow = allData[i];
   
    var portalStatus = theRow[2];
    
    if (portalStatus == 'Synced') {
      var writeRow = i + 2;
      var writeCell = sheet.getRange('C' + writeRow);  
      writeCell.setValue('');
    }     
  }    
  
  if (!hasBackgroundJobs()) {
    return;
  }  
  
  var triggers = ScriptApp.getScriptTriggers();
  
  for (i=0; i<triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }  
  
  GmailApp.sendEmail(
    Session.getActiveUser().getEmail(), 
    "Portal Tracker Sync Completed", 
    "The portal information has been synced successfully.\n\n " +
    "View the updated sheet here:" + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  );  
}

function findSubmissions() {
  var subjectStart = "Ingress Portal Submitted: ";
  var search = '(from:(ingress-support@google.com) OR from:(jon@healsdata.com)) AND (subject:"Ingress Portal Submitted:" OR subject:"Portal submission confirmation:")';
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var knownPortals = getKnownPortals(sheet);   
  for (var i=0; i < knownPortals.length; i++) {
    search = search + ' -"' + knownPortals[i] + '" ';    
  }
  
  var max = 10;
  var threads = GmailApp.search(search, 0, max);      
  var foundNewPortals = false;
    
  for (var x=0; x<threads.length; x++) {    
    var msg = threads[x].getMessages()[0];
    
    var subject = msg.getSubject();
    var submitted = msg.getDate();
    var portalName = subject.substring(subject.indexOf(":") + 1).trim();
    
    var searchResult = knownPortals.findIndex(portalName);
    
    if(searchResult == -1) {               
      var writeRow = sheet.getLastRow() + 1;
      sheet.getRange('A' + writeRow).setValue(portalName);
      sheet.getRange('B' + writeRow).setValue(submitted);   
      
      knownPortals.push(portalName);        
      foundNewPortals = true;
    }      
  }
  
  return foundNewPortals;
}

function updateStatus() {
  var sheet = SpreadsheetApp.getActiveSheet();
  
  var allData = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  var numSearches = 0;
  var max = 10;
  var updatedStatus = false;
  
  for (var i = 0; i < allData.length; i++) {
    var theRow = allData[i];
    var portalName = theRow[0];
    
    if (portalName.length === 0) {
      continue;
    }
        
    var portalStatus = theRow[2];
    
    if (portalStatus.length > 0) {
      continue;
    }
    
    var updatedStatus = true;
    var writeRow = i + 2;
    var writeCell = sheet.getRange('C' + writeRow);    
    
    var fragments = ['Rejected', 'Live', 'Duplicate', 'existing', 'accepted'];
    var statuses = ['Rejected', 'Live', 'Duplicate', 'Rejected', 'Live'];
    
    for (var x = 0; x < fragments.length; x++) {      
      var fragment = fragments[x];
      var status = statuses[x];
      
      if (fragment.toLowerCase() == fragment) {
        // Lowercase strings appear in the email body -- the new email format has a generic subject.
        var subjectStart = "Portal review complete";
        subjectStart = subjectStart + ": " + portalName;  
        var search = '(from:(ingress-support@google.com) OR from:(jon@healsdata.com)) subject:"' + subjectStart + '" ' + fragment;
      } else {
        // Old format put the response right in the subject.
        var subjectStart = "Ingress Portal ";
        subjectStart = subjectStart + fragment + ": " + portalName;  
        var search = '(from:(ingress-support@google.com) OR from:(jon@healsdata.com)) subject:"' + subjectStart + '"';    
      } 
      
      
      var threads = GmailApp.search(search, 0, 1);           
      numSearches++;
      
      var foundStatus = false;
      
      if (threads.length > 0) {
        writeCell.setValue(status);
        
        var msg = threads[0].getMessages()[0];
        var submitted = msg.getDate();        
        
        sheet.getRange('D' + writeRow).setValue(submitted);
        
        foundStatus = true;
        break;
      }
      
      if (!foundStatus) {
        writeCell.setValue('Synced');
      }
    }
        
    if (numSearches >= max) {
      break;
    }    
  }    
  
  return updatedStatus;
}

function sync() {
  var foundNewPortals, updatedStatus = false;
  foundNewPortals = findSubmissions();
  
  if (!foundNewPortals) {
    updatedStatus = updateStatus();
  }
   
  if (foundNewPortals || updatedStatus) {
    backgroundSync(); 
  } else {
    finishSync();
  }    
}
  
function onOpen() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var entries = [   
    {
      name : "Sync",
      functionName : "sync"
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
