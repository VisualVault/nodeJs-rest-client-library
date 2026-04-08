/**
 * VV.Form.Global.DatagridSelectObserve
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagridName) {
// Pass in datagridName as a parameter.

// Check if observer has already been set.
if (observer) {
    observer.disconnect()
  }
  
  // Logic to check if options exist for data grid.
  var datagridOptions = null
  
  if (typeof VV.Form.Template.DatagridSelectOptions === 'function') {
    if (VV.Form.Template.DatagridSelectOptions().hasOwnProperty(datagridName)) {
      datagridOptions = VV.Form.Template.DatagridSelectOptions()[datagridName]
    }
  }
  
  
  // Logic for only column selectable values
  var columnIndex = -1
  
  if (datagridOptions && datagridOptions['columnName']) {
    var textValues = []
  
    $(`[vvfieldnamewrapper="${datagridName}"] > div > kendo-grid > div > div > div > table > thead > tr`).children('.k-header .ng-star-inserted').each(function (index) {
      textValues.push($(this).children('.k-link').text().trim().replace(/[0-9]/g,''));
    });
    columnIndex = textValues.indexOf(datagridOptions['columnName'].trim().replace(/[0-9]/g,''))
  }
  
  
  // Select the node that will be observed for mutations. This must be an element that isn't removed from the DOM.
  var targetDatagrid = document.querySelector(`[vvfieldnamewrapper="${datagridName}"]`)
  
  // Options for the observer (which mutations to observe)
  var config = {subtree: true, childList: true};
  
  // Callback function to execute when mutations are observed
  var callback = function (mutationsList, observer) {
    var onClickAdded = false
    var currencyFormatted = false
    for (var i = 0; i < mutationsList.length; i++) {
      // Logic for formatting currency.
      if (!currencyFormatted) {
        if ($('.currencyFormatted').length === 0) {
  
          var currencyIndex = -1
  
          if (datagridOptions && datagridOptions['currencyColumn']) {
            var checkTextValues = []
          
            $(`[vvfieldnamewrapper="${datagridName}"] > div > kendo-grid > div > div > div > table > thead > tr`).children('.k-header .ng-star-inserted').each(function (index) {
              checkTextValues.push($(this).children('.k-link').text().trim().replace(/[0-9]/g,''));
            });
            currencyIndex = checkTextValues.indexOf(datagridOptions['currencyColumn'].trim().replace(/[0-9]/g,''))
          }
  
          if (currencyIndex !== -1) {
            // Create our number formatter.
            var formatter = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
  
              // These options are needed to round to whole numbers if that's what you want.
              //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
              //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
            });
  
  
            $(`[vvfieldnamewrapper="${datagridName}"] tr`).each(function (index) {
              var numberToConvert = $(this).children().eq(currencyIndex).text()
              var strToNum = Number(numberToConvert)
  
              if (!isNaN(strToNum)) {
                $(this).children().eq(currencyIndex).text(formatter.format(strToNum))
                $(this).children().eq(currencyIndex).addClass('currencyFormatted')
              }
            });
          }
        }
        currencyFormatted = true
      }
  
      if (!onClickAdded) {
        
  $(`[vvfieldnamewrapper="${datagridName}"] tr`).off()
  $(`[vvfieldnamewrapper="${datagridName}"] tr`).on('click', function () {
  
    // Check if max one row option has been passed in
    if (datagridOptions && datagridOptions['maxOneSelectedRow'] === true) {
      if ($(this).hasClass('selected')) {
  
        if (columnIndex !== -1) {
          if (datagridOptions['columnValues'].includes($(this).children().eq(columnIndex).text().trim())) {
            $(this).toggleClass('selected');
          }
        } else {
          $(this).toggleClass('selected');
        }
  
      } else {
        if (columnIndex !== -1) {
          if (datagridOptions['columnValues'].includes($(this).children().eq(columnIndex).text().trim())) {
            $(`[vvfieldnamewrapper="${datagridName}"] selected`).removeClass('selected')
  
            $(this).toggleClass('selected');
          }
        } else {
          $(`[vvfieldnamewrapper="${datagridName}"] .selected`).removeClass('selected')
  
          $(this).toggleClass('selected');
        }
      }
    } else {
      if (columnIndex !== -1) {
        if (datagridOptions['columnValues'].includes($(this).children().eq(columnIndex).text().trim())) {
          $(this).toggleClass('selected');
        }
      } else {
        $(this).toggleClass('selected');
      }
    }
  
    // Mark checkbox that tracks if rows have been selected
    setTimeout(function(){
      let value = $(`[vvfieldnamewrapper="${datagridName}"] > div > kendo-grid > div > kendo-grid-list > div > div.k-grid-table-wrap > table > tbody`).children("tr.selected").length > 0;
      VV.Form.SetFieldValue(`${datagridName} Selected`, value)
    },100);
   
  });
        onClickAdded = true
      }
    }
  };
  
  // Create an observer instance linked to the callback function
  var observer = new MutationObserver(callback);
  
  // Start observing the target node for configured mutations
  observer.observe(targetDatagrid, config);
}
