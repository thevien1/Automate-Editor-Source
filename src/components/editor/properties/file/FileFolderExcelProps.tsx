import React from 'react';
import { ActionPropsCommon } from '../types';
import { VariableInput } from '../../../common/VariableInput';
import { CommonActionFooter } from '../CommonActionFooter';

export const FileFolderExcelProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const type = actionNode.type;
  const name = actionNode.display_text?.toLowerCase() || '';

  const isFileExists = name === 'file exists' || type === 13;
  const isCopyFile = name === 'copy file' || type === 14;
  const isMoveRenameFile = name === 'move / rename file' || name === 'move/rename file' || type === 15;
  const isDeleteFile = name === 'delete file' || type === 16;
  const isFileReadAllText = name === 'file read all text' || type === 17;
  const isFileReadAllLines = name === 'file read all lines' || type === 18;
  const isFileReadRandomLine = name === 'file read random line' || type === 184;
  const isFileWriteAllText = name === 'file write all text' || type === 19;
  const isFileAppendLine = name === 'file append line' || type === 20;
  const isCreateEmptyExcel = name === 'create empty excel' || type === 74;
  const isReadExcelFile = name === 'read excel file' || type === 21;
  const isWriteExcelFile = name === 'write excel file' || type === 22;
  const isAppendExcelFile = name === 'append excel file' || type === 71;
  const isFolderExists = name === 'folder exists' || type === 23;
  const isCreateFolder = name === 'create folder' || type === 24;
  const isMoveRenameFolder = name === 'move / rename folder' || name === 'move/rename folder' || type === 26;
  const isDeleteFolder = name === 'delete folder' || type === 25;
  const isFolderGetFileList = name === 'folder get file list' || type === 72;
  const isGetClipboardText = name === 'get clipboard text' || type === 27;
  const isSetClipboardText = name === 'set clipboard text' || type === 28;

  // FILE EXISTS ACTION
  if (isFileExists) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // COPY FILE ACTION
  if (isCopyFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Source File
          </label>
          <VariableInput
            value={getRawVal('SOURCE_FILE', '')}
            onChange={(val) => handleRawInputByKey('SOURCE_FILE', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Destination File
          </label>
          <VariableInput
            value={getRawVal('DES_FILE', '')}
            onChange={(val) => handleRawInputByKey('DES_FILE', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // MOVE / RENAME FILE ACTION
  if (isMoveRenameFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Source File
          </label>
          <VariableInput
            value={getRawVal('SOURCE_FILE', '')}
            onChange={(val) => handleRawInputByKey('SOURCE_FILE', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Destination File
          </label>
          <VariableInput
            value={getRawVal('DES_FILE', '')}
            onChange={(val) => handleRawInputByKey('DES_FILE', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // DELETE FILE ACTION
  if (isDeleteFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FILE READ ALL TEXT ACTION
  if (isFileReadAllText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FILE READ ALL LINES ACTION
  if (isFileReadAllLines) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FILE READ RANDOM LINE ACTION
  if (isFileReadRandomLine) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FILE WRITE ALL TEXT ACTION
  if (isFileWriteAllText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Text
          </label>
          <VariableInput
            value={getRawVal('TEXT', '')}
            onChange={(val) => handleRawInputByKey('TEXT', val)}
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FILE APPEND LINE ACTION
  if (isFileAppendLine) {
    const option = getRawVal('OPTION', getRawVal('MODE', 'Append line'));
    const isUpdate = option.toLowerCase().includes('update');
    const updateMethod = getRawVal('UPDATE_METHOD', 'Replace line content');
    const isSuffix = updateMethod.toLowerCase().includes('suffix') || updateMethod.toLowerCase().includes('append');

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder="Select or enter file path"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Option
          </label>
          <select
            value={option}
            onChange={(e) => handleRawInputByKey('OPTION', e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer"
          >
            <option value="Append line">Append line</option>
            <option value="Update line">Update line</option>
          </select>
        </div>

        {isUpdate && (
          <>
            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Line Index
              </label>
              <VariableInput
                value={getRawVal('LINE_INDEX', '')}
                onChange={(val) => handleRawInputByKey('LINE_INDEX', val)}
                placeholder="e.g. 1, {{index}} (Leave blank for current line)"
              />
              <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                Line number (1-based index). Leave blank to update the current profile's mapped line.
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
                Update Method
              </label>
              <select
                value={updateMethod}
                onChange={(e) => handleRawInputByKey('UPDATE_METHOD', e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer"
              >
                <option value="Replace line content">Replace line content</option>
                <option value="Append suffix to line">Append suffix to line</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            {isUpdate && isSuffix ? 'Suffix Text' : 'Text'}
          </label>
          <VariableInput
            value={getRawVal('TEXT', '')}
            onChange={(val) => handleRawInputByKey('TEXT', val)}
            placeholder={isUpdate && isSuffix ? 'e.g.  | OK' : 'Enter text'}
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // CREATE EMPTY EXCEL ACTION
  if (isCreateEmptyExcel) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // READ EXCEL FILE ACTION
  if (isReadExcelFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Sheet index
          </label>
          <VariableInput
            value={getRawVal('SHEET_ID', '')}
            onChange={(val) => handleRawInputByKey('SHEET_ID', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Column Name or Index
          </label>
          <VariableInput
            value={getRawVal('COL_NAME_OR_INDEX', '')}
            onChange={(val) => handleRawInputByKey('COL_NAME_OR_INDEX', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Row Index
          </label>
          <VariableInput
            value={getRawVal('ROW_INDEX', '')}
            onChange={(val) => handleRawInputByKey('ROW_INDEX', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // WRITE EXCEL FILE ACTION
  if (isWriteExcelFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Sheet index
          </label>
          <VariableInput
            value={getRawVal('SHEET_ID', '')}
            onChange={(val) => handleRawInputByKey('SHEET_ID', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Column Name or Index
          </label>
          <VariableInput
            value={getRawVal('COL_NAME_OR_INDEX', '')}
            onChange={(val) => handleRawInputByKey('COL_NAME_OR_INDEX', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Row Index
          </label>
          <VariableInput
            value={getRawVal('ROW_INDEX', '')}
            onChange={(val) => handleRawInputByKey('ROW_INDEX', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Value
          </label>
          <VariableInput
            value={getRawVal('DATA', '')}
            onChange={(val) => handleRawInputByKey('DATA', val)}
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // APPEND EXCEL FILE ACTION
  if (isAppendExcelFile) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            File Path
          </label>
          <VariableInput
            value={getRawVal('FILE_PATH', '')}
            onChange={(val) => handleRawInputByKey('FILE_PATH', val)}
            browseType="file"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Sheet index
          </label>
          <VariableInput
            value={getRawVal('SHEET_ID', '')}
            onChange={(val) => handleRawInputByKey('SHEET_ID', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Column Name or Index
          </label>
          <VariableInput
            value={getRawVal('COL_NAME_OR_INDEX', '')}
            onChange={(val) => handleRawInputByKey('COL_NAME_OR_INDEX', val)}
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Value
          </label>
          <VariableInput
            value={getRawVal('DATA', '')}
            onChange={(val) => handleRawInputByKey('DATA', val)}
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FOLDER EXISTS ACTION
  if (isFolderExists) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Folder Path
          </label>
          <VariableInput
            value={getRawVal('FOLDER_PATH', '')}
            onChange={(val) => handleRawInputByKey('FOLDER_PATH', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // CREATE FOLDER ACTION
  if (isCreateFolder) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Folder Path
          </label>
          <VariableInput
            value={getRawVal('FOLDER_PATH', '')}
            onChange={(val) => handleRawInputByKey('FOLDER_PATH', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // MOVE / RENAME FOLDER ACTION
  if (isMoveRenameFolder) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Source Folder
          </label>
          <VariableInput
            value={getRawVal('SOURCE_FOLDER', '')}
            onChange={(val) => handleRawInputByKey('SOURCE_FOLDER', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Destination Folder
          </label>
          <VariableInput
            value={getRawVal('DES_FOLDER', '')}
            onChange={(val) => handleRawInputByKey('DES_FOLDER', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // DELETE FOLDER ACTION
  if (isDeleteFolder) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Folder Path
          </label>
          <VariableInput
            value={getRawVal('FOLDER_PATH', '')}
            onChange={(val) => handleRawInputByKey('FOLDER_PATH', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // FOLDER GET FILE LIST ACTION
  if (isFolderGetFileList) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Folder Path
          </label>
          <VariableInput
            value={getRawVal('FOLDER_PATH', '')}
            onChange={(val) => handleRawInputByKey('FOLDER_PATH', val)}
            browseType="folder"
            placeholder=""
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // GET CLIPBOARD TEXT ACTION
  if (isGetClipboardText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Output Variable Name
          </label>
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder=""
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  // SET CLIPBOARD TEXT ACTION
  if (isSetClipboardText) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
            Text
          </label>
          <VariableInput
            value={getRawVal('TEXT', '')}
            onChange={(val) => handleRawInputByKey('TEXT', val)}
            placeholder=""
          />
        </div>

        <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
      </div>
    );
  }

  return null;
};
