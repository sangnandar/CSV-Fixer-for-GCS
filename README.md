# CSV Fixer for GCS

## Overview
This project is a **Google Apps Script solution** designed to read, validate, and fix CSV files stored in **Google Cloud Storage (GCS)**.

This project extends the functionality of [Load CSVs from GCS to BigQuery](https://github.com/sangnandar/Load-CSVs-from-GCS-to-BQ). When errors are detected, CSV files cannot be loaded into BigQuery. This project addresses those errors, uploads the corrected files back to GCS, and prepares them for processing by "Load CSVs from GCS to BigQuery".

### Features
- **Error Detection:** Reads CSV files from GCS, identifies records with errors, and creates a new Google Sheet for each file, listing the issues found.
- **Error Correction:** Enables users to fix the errors in Google Sheets and automatically uploads the corrected CSV files back to GCS.

## How it works
1. CSV files with errors are stored in the GCS bucket under the `csv/fail/` folder.
2. The Apps Script:
   - Reads the files.
   - Extracts records with errors and writes them to a Google Sheet.
3. Users review and fix the errors in the sheet.
4. The fixed file is re-uploaded to the GCS `csv/` parent folder, making it ready for processing by "Load CSVs from GCS to BigQuery".

## Installation

### GCP Project configuration
Enable the following API in your GCP project:
- Cloud Storage API

### Apps Script configuration
- Set up Script Properties in **Apps Script -> Project Settings -> Script Properties**:
   ```
   {
     BUCKET_NAME: <GCS bucket name>
   }
   ```

- Configure the `appsscript.json` file:
   ```json
   {
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/script.external_request",
       "https://www.googleapis.com/auth/devstorage.read_only"
     ]
   }
   ```

### Sheets configuration
**DO NOT** change sheets name, delete columns, or re-arrange columns for the following ranges:
- Read
  ```
  'Files'!A2:B
  ```

Sheets layout [sreenshot]

## Usage
1. Attach the Apps Script to a Google Sheets document.
2. Use the custom menu in the toolbar:
   - **Custom Menu -> Check for errors:** reads the file and lists records with errors.
   - **Custom Menu -> Fix file:** uploads the corrected file back to GCS.

# Related project
- [Load CSVs from GCS to BigQuery](https://github.com/sangnandar/Load-CSVs-from-GCS-to-BQ) - Clean load CSV files from GCS to BigQuery.
