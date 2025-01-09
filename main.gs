function onOpen()
{
  ui
    .createMenu('Custom Menu')
      .addItem('Check for errors', 'ETLTest')
      .addItem('Fix file', 'fixCsv')
    .addToUi();
}

/**
 * Read the CSV files from GCS and test the records.
 * Create a new sheet for each file.
 * @returns {void}
 */
function ETLTest()
{
  const sheetName = 'Files';
  if (ss.getActiveSheet().getSheetName() !== sheetName) {
    showAlert('Can\'t run on this sheet.');
    return;
  }

  const sheet = ss.getSheetByName(sheetName);
  const filenames = sheet.getRange('A2:B' + sheet.getLastRow()).getValues()
    .reduce((acc, x) => {
      if (!( x[1] )) return acc; // filter
      acc.push(x[0]);
      return acc;
    }, []);

  for (const filename of filenames) {

    const folder = 'csv/';
    const objectName = folder + filename + '.csv';

    // Read the CSV file from GCS
    const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(objectName)}?alt=media`;
    const fileContent = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
      },
    }).getContentText();

    const rows = Utilities.parseCsv(fileContent);
    const dataFixes = [];
    let maxCol = 0;

    rows.forEach((row, index) => {
      if (index === 0) return; // skip header

      const errors = [];

      /**
       * This is the part where we rigorously test the record
       */
      if (row.length === 9) {
        // check if Col-1 is a valid date format & value
        if (!isValidDate(row[0])) errors.push('Col-1; wrong date format/value');
        // check if Col-2 is a valid date format & value
        if (!isValidDate(row[1])) errors.push('Col-2; wrong date format/value');
        // check if Col-5 can be casted to integer
        if (isNaN(parseInt(row[4].replace(',', '')))) errors.push('Col-5; is not an integer');

      } else {
        // length test is the major test, if it fails we don't need to test the rest
        if (row.length !== 9) errors.push('Number of columns doesn\'t match');

      }
      /**
       * End of testing
       */

      if (errors.length) {
        // if rows are not in the same length, get the max length.
        maxCol = Math.max(maxCol, row.length);
        // force to text to prevent Google Sheets auto-format the value
        const forcedRow = row.map(x => "'" + x);
        forcedRow.unshift(
          errors.join('\n'),
          index
        );
        dataFixes.push(forcedRow);
      }

    });

    // create sheet and write data
    const sheetName = filename;
    if (ss.getSheetByName(sheetName)) {
      showAlert(`Sheet "${sheetName}" already exists.`);
      return
    }

    const newSheet = ss.insertSheet(sheetName);
    if (dataFixes.length) {
      dataFixes.forEach((row, index) => {
        dataFixes[index] = [
          ...row,
          ...Array(maxCol + 2 - row.length).fill(null) // pad the row so all have the same length
        ];
      });

      const headers = ['Errors', 'Line', ...Array.from({ length: maxCol }, (_, i) => `Col-${i + 1}`)];
      dataFixes.unshift(headers);
      newSheet.getRange(1, 1, 1, headers.length).setBackground('black').setFontColor('white').setFontWeight('bold');
      newSheet.getRange(1, 1, dataFixes.length, maxCol + 2).setValues(dataFixes);
    }

  }
}

/**
 * Fix the CSV file and upload back to GCS.
 * @returns {void}
 */
function fixCsv()
{
  let url;

  const sheet = ss.getActiveSheet();
  if (sheet.getSheetName() === 'Files') {
    showAlert('Can\'t run on this sheet.');
    return;
  }

  const filename = sheet.getSheetName();

  // read from sheet, create a map of lineNumber -> value
  const fixes = new Map(
    sheet.getRange(2, 2, sheet.getLastRow() - 1, sheet.getLastColumn() - 1).getValues()
      .map(
        ([lineNumber, ...row]) => [
          lineNumber,
          row.map(x => '"' + x.replace(/"/g, '""') + '"').join(',')
        ]
      )
  );

  const oldObjectName = 'csv/fail/' + filename + '.csv';

  // Read the CSV file from GCS
  url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(oldObjectName)}?alt=media`;
  const fileContent = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    },
  }).getContentText();

  const newlineCharacter = detectNewlineCharacter(fileContent);
  const rows = fileContent.split(newlineCharacter);

  // in case the CSV ended with new line character
  if (rows[rows.length - 1] === '') rows.pop();

  // Fix the CSV file
  const processedRows = rows.map((row, index) => {
    if (fixes.has(index)) {
      return fixes.get(index);
    } else {
      return row;
    }
  }).join(newlineCharacter);

  // Write the processed file back to GCS
  const newObjectName = 'csv/' + filename + '.csv';
  url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(newObjectName)}`;
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'text/csv',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    },
    payload: processedRows
  });

  // delete old file
  url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(oldObjectName)}`;
  UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
    }
  });
}
