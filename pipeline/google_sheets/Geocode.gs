/**
 * ASW partner geocoder for the CSV produced by export_mymaps.py.
 *
 * Import partners_to_geocode.csv into Google Sheets, open Extensions > Apps
 * Script, paste this file, save, then run geocodePartners.  The function is
 * resumable: rows with any Status are skipped on later runs.
 */

const ASW_GEOCODE = {
  queryColumn: 'geocode_query',
  resultColumns: [
    'Latitude',
    'Longitude',
    'Status',
    'FormattedAddress',
    'LocationType',
    'PartialMatch',
    'PlaceId',
    'ResultType',
    'ProcessedAt',
  ],
  // Keep each execution comfortably below the Apps Script time limit.
  maxRowsPerRun: 20,
  maxRuntimeMs: 4 * 60 * 1000,
  pauseMs: 100,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ASW Geocoding')
    .addItem('ค้นหาพิกัดที่ยังไม่สำเร็จ', 'geocodePartners')
    .addItem('ล้างผลลัพธ์เพื่อค้นหาใหม่', 'resetGeocodeResults')
    .addToUi();
}

function geocodePartners() {
  const startedAt = Date.now();
  const sheet = getTargetSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0].map(String);
  const columns = getColumnMap_(headers);
  validateColumns_(columns, [ASW_GEOCODE.queryColumn, ...ASW_GEOCODE.resultColumns]);

  const geocoder = Maps.newGeocoder()
    .setLanguage('th')
    .setRegion('th')
    .setBounds(5.5, 97.0, 21.0, 106.0);

  const resultStartColumn = columns[ASW_GEOCODE.resultColumns[0]];
  const resultColumnsAreContiguous = ASW_GEOCODE.resultColumns.every(
    (header, offset) => columns[header] === resultStartColumn + offset
  );
  if (!resultColumnsAreContiguous) {
    throw new Error('คอลัมน์ผลลัพธ์ต้องเรียงติดกันตั้งแต่ Latitude ถึง ProcessedAt');
  }

  let processed = 0;
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const query = String(values[rowIndex][columns[ASW_GEOCODE.queryColumn]] || '').trim();
    const currentStatus = String(values[rowIndex][columns.Status] || '').trim();
    // A non-empty status means this row was already attempted in an earlier
    // execution. This lets the user safely press Run again after a timeout.
    if (!query || currentStatus) continue;
    if (processed >= ASW_GEOCODE.maxRowsPerRun) break;
    if (Date.now() - startedAt >= ASW_GEOCODE.maxRuntimeMs) break;

    const output = ['', '', '', '', '', '', '', '', new Date().toISOString()];
    try {
      const response = geocoder.geocode(query);
      const result = response.results && response.results[0];
      if (!result) {
        output[2] = response.status || 'ZERO_RESULTS';
      } else {
        const geometry = result.geometry || {};
        const location = geometry.location || {};
        output[0] = location.lat ?? '';
        output[1] = location.lng ?? '';
        output[2] = response.status || 'OK';
        output[3] = result.formatted_address || '';
        output[4] = geometry.location_type || '';
        output[5] = result.partial_match === true;
        output[6] = result.place_id || '';
        output[7] = Array.isArray(result.types) ? result.types.join('|') : '';
      }
    } catch (error) {
      output[2] = `ERROR: ${error && error.message ? error.message : error}`;
    }

    // Write all result fields in one operation instead of nine setValue calls.
    sheet
      .getRange(
        rowIndex + 1,
        resultStartColumn + 1,
        1,
        ASW_GEOCODE.resultColumns.length
      )
      .setValues([output]);
    Utilities.sleep(ASW_GEOCODE.pauseMs);
    processed += 1;
  }

  const message = processed === 0
    ? 'ประมวลผลครบทุกแถวแล้ว ดาวน์โหลดชีต GeocodeQueue เป็น CSV ได้เลย'
    : `ประมวลผลรอบนี้ ${processed} รายการ\nกด Run ซ้ำจนระบบแจ้งว่าประมวลผลครบทุกแถวแล้ว`;
  SpreadsheetApp.getUi().alert(message);
}

function resetGeocodeResults() {
  const sheet = getTargetSheet_();
  const values = sheet.getDataRange().getValues();
  if (!values.length) return;
  const columns = getColumnMap_(values[0].map(String));
  validateColumns_(columns, ASW_GEOCODE.resultColumns);
  ASW_GEOCODE.resultColumns.forEach((header) => {
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, columns[header] + 1, sheet.getLastRow() - 1, 1).clearContent();
    }
  });
}

function getTargetSheet_() {
  return SpreadsheetApp.getActive().getSheetByName('GeocodeQueue')
    || SpreadsheetApp.getActiveSheet();
}

function getColumnMap_(headers) {
  return headers.reduce((map, header, index) => {
    map[header] = index;
    return map;
  }, {});
}

function validateColumns_(columns, required) {
  const missing = required.filter((header) => columns[header] === undefined);
  if (missing.length) {
    throw new Error(`ไม่พบคอลัมน์: ${missing.join(', ')}`);
  }
}
