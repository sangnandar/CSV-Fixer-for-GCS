/**
 * Global variables and helper functions
 */

var ui; // return null if called from script editor
try {
  ui = SpreadsheetApp.getUi();
} catch (e) {
  Logger.log('You are using script editor.');
}
const ss = SpreadsheetApp.getActiveSpreadsheet();
const scriptProps = PropertiesService.getScriptProperties();

const {
  BUCKET_NAME,
} = scriptProps.getProperties();

function showAlert(message) {
  if (ui) {
    ui.alert(message);
  } else {
    Logger.log(message);
  }
}

/**
 * @param {string} dateString MM/DD/YY format, with or without leading zeroes.
 * @returns {boolean} true if the date is valid.
 */
function isValidDate(dateString)
{
  const [month, day, year] = dateString.split('/');

  // reject 1/012/3
  if (
    month.length > 2 ||
    day.length > 2 ||
    year !== 2
  ) return false;

  const pivotYear = 2000;
  const fullYear = parseInt(year) + pivotYear;

  const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

  // Ensure the date is valid
  const isValid = 
    date.getMonth() === parseInt(month) - 1 &&
    date.getDate() === parseInt(day) &&
    date.getFullYear() === fullYear;

  return isValid;
}

/**
 * @param {string} csvContent the content of the CSV file.
 * @returns {string|null} the newline character used in the CSV file.
 */
function detectNewlineCharacter(csvContent)
{
  return /\r\n|\n|\r/.exec(csvContent)?.[0] ?? null;
}
