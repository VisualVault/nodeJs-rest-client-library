/**
 * VV.Form.Global.DatagridSelectLoad
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (datagridName) {
// datagridName is a string that is the name of the datagrid to setup selectable rows for.
// Optionally pass in backgroundColor as a parameter to change the default color for a selected datagrid row.

VV.Form.SetFieldValue(`${datagridName} Selected`, 'False')

// Logic to check if options exist for data grid.
var datagridOptions = null

if (typeof VV.Form.Template.DatagridSelectOptions === 'function') {
  if (VV.Form.Template.DatagridSelectOptions().hasOwnProperty(datagridName)) {
    datagridOptions = VV.Form.Template.DatagridSelectOptions()[datagridName]
  }
}

// Logic for only column selectable values
var columnIndex = -1

if (datagridOptions !== null && datagridOptions['columnName']) {
  var textValues = []

  $(`[vvfieldnamewrapper="${datagridName}"] > div > kendo-grid > div > div > div > table > thead > tr`).children('.k-header .ng-star-inserted').each(function (index) {
    textValues.push($(this).children('.k-link').text().trim().replace(/[0-9]/g,''));
  });
  columnIndex = textValues.indexOf(datagridOptions['columnName'].trim().replace(/[0-9]/g,''))
}

// Logic for formatting currency.
var currencyIndex = -1

if (datagridOptions !== null && datagridOptions['currencyColumn']) {
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


// Default background color.
var rowBackgroundColor = '#F0F8FF'

// Change background color if passed in.
if (datagridOptions && datagridOptions['backgroundColor']) {
  rowBackgroundColor = datagridOptions['backgroundColor']
}

// Add CSS Style that will be used. 
var styles = document.styleSheets[0];

// using the length property we effectively "append" the rule to the end of the sheet
var ruleIndex = styles.insertRule(`.selected {background-color: ${rowBackgroundColor} !important}`, styles.cssRules.length)


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
          $(`[vvfieldnamewrapper="${datagridName}"] .selected`).removeClass('selected')

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
}
